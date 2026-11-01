import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated, Any, AsyncIterator, Literal
from uuid import uuid4

import asyncpg
import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from pymongo import AsyncMongoClient
from pymongo.errors import PyMongoError

from vector_store import VECTOR_DIMENSIONS, embed_text, search_documents


logger = logging.getLogger("voltflow.fastapi")
bearer_scheme = HTTPBearer(auto_error=False)
JWT_ALGORITHMS = ["HS256"]
ROLE_VALUES = {"ADMIN", "OPERATOR", "DRIVER"}
MAX_DOCUMENTS_TO_SCAN = 5000


def mongo_uri() -> str:
    return os.getenv("MONGO_URI", "mongodb://localhost:27017")


def postgres_dsn() -> str | None:
    dsn = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")
    if dsn:
        return dsn

    jdbc_url = os.getenv("DB_URL")
    if jdbc_url and jdbc_url.startswith("jdbc:postgresql://"):
        dsn = jdbc_url.removeprefix("jdbc:")
    else:
        dsn = "postgresql://localhost:5432/voltflow"

    username = os.getenv("DB_USERNAME")
    password = os.getenv("DB_PASSWORD")
    if username:
        from urllib.parse import quote

        credentials = quote(username, safe="")
        if password:
            credentials += ":" + quote(password, safe="")
        dsn = dsn.replace("postgresql://", f"postgresql://{credentials}@", 1)
    return dsn


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    application.state.postgres_pool = None
    application.state.mongo_client = None
    application.state.mongo_error = None
    application.state.postgres_error = None

    try:
        application.state.postgres_pool = await asyncpg.create_pool(
            dsn=postgres_dsn(),
            min_size=1,
            max_size=5,
            command_timeout=10,
        )
    except Exception as exception:
        application.state.postgres_error = exception
        logger.warning("FastAPI PostgreSQL connection unavailable: %s", exception)

    try:
        client = AsyncMongoClient(
            mongo_uri(),
            serverSelectionTimeoutMS=3000,
            connectTimeoutMS=3000,
        )
        await client.admin.command("ping")
        collection = client["voltflow"]["knowledge_documents"]
        await collection.create_index("id", unique=True)
        await collection.create_index("station_id")
        application.state.mongo_client = client
    except Exception as exception:
        application.state.mongo_error = exception
        logger.warning("FastAPI MongoDB connection unavailable: %s", exception)

    try:
        yield
    finally:
        pool = application.state.postgres_pool
        if pool is not None:
            await pool.close()
        client = application.state.mongo_client
        if client is not None:
            await client.close()


app = FastAPI(
    title="VoltFlow Integration API",
    description=(
        "Async SQL and MongoDB APIs with Pydantic validation, shared Spring JWT "
        "authentication, and persisted vector similarity search."
    ),
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:8443,http://localhost:5173",
        ).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def unhandled_error(_request: Any, exception: Exception) -> JSONResponse:
    logger.exception("Unhandled FastAPI request error", exc_info=exception)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected API error occurred."},
    )


class StationSummary(BaseModel):
    id: int
    name: str
    address: str
    city: str
    price_per_kwh: float
    charger_count: int
    available_chargers: int


class KnowledgeDocument(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=2, max_length=200)
    content: str = Field(min_length=5, max_length=10_000)
    station_id: int | None = Field(default=None, gt=0)
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgeDocumentResponse(BaseModel):
    id: str
    title: str
    content: str
    station_id: int | None
    metadata: dict[str, str]
    vector_dimensions: int
    created_at: datetime


class SearchResult(BaseModel):
    id: str
    title: str
    content: str
    metadata: dict[str, str]
    score: float


class HealthComponent(BaseModel):
    status: Literal["UP", "DOWN"]
    detail: str | None = None


class HealthResponse(BaseModel):
    status: Literal["UP", "DEGRADED"]
    postgres: HealthComponent
    mongodb: HealthComponent
    timestamp: datetime


class CurrentUser(BaseModel):
    email: str
    role: Literal["ADMIN", "OPERATOR", "DRIVER"]


def jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if len(secret.encode("utf-8")) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FastAPI JWT authentication is not configured.",
        )
    return secret


async def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid Bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = jwt.decode(
            credentials.credentials,
            jwt_secret(),
            algorithms=JWT_ALGORITHMS,
            options={"require": ["sub", "exp", "iat", "role"]},
        )
    except HTTPException:
        raise
    except jwt.InvalidTokenError as exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Bearer token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exception

    email = claims.get("sub")
    role = claims.get("role")
    if not isinstance(email, str) or not email or not isinstance(role, str) or role not in ROLE_VALUES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Bearer token is missing a valid user role.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    pool = require_postgres(app)
    try:
        account = await pool.fetchrow(
            "SELECT role, enabled FROM users WHERE lower(email) = $1",
            email.casefold(),
        )
    except Exception as exception:
        logger.exception("FastAPI JWT account lookup failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account verification is temporarily unavailable.",
        ) from exception

    if account is None or not account["enabled"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The account is unavailable or the token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    database_role = account["role"]
    if database_role not in ROLE_VALUES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The account has an invalid access role.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return CurrentUser(email=email, role=database_role)


async def require_operator(
    user: Annotated[CurrentUser, Depends(current_user)],
) -> CurrentUser:
    if user.role not in {"ADMIN", "OPERATOR"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Operator access is required.",
        )
    return user


def require_postgres(application: FastAPI) -> asyncpg.Pool:
    pool = getattr(application.state, "postgres_pool", None)
    if pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The PostgreSQL service is unavailable.",
        )
    return pool


def require_mongo(application: FastAPI) -> Any:
    client = getattr(application.state, "mongo_client", None)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The MongoDB service is unavailable.",
        )
    return client["voltflow"]["knowledge_documents"]


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    postgres_status = HealthComponent(
        status="DOWN",
        detail=(
            "Connection unavailable"
            if getattr(app.state, "postgres_error", None) is not None
            else "Not connected"
        ),
    )
    mongodb_status = HealthComponent(
        status="DOWN",
        detail=(
            "Connection unavailable"
            if getattr(app.state, "mongo_error", None) is not None
            else "Not connected"
        ),
    )

    pool = getattr(app.state, "postgres_pool", None)
    if pool is not None:
        try:
            async with pool.acquire() as connection:
                await connection.fetchval("SELECT 1")
            postgres_status = HealthComponent(status="UP")
        except Exception as exception:
            logger.warning("FastAPI PostgreSQL health check failed: %s", exception)
            postgres_status = HealthComponent(status="DOWN", detail="Connection check failed")

    client = getattr(app.state, "mongo_client", None)
    if client is not None:
        try:
            await client.admin.command("ping")
            mongodb_status = HealthComponent(status="UP")
        except PyMongoError as exception:
            logger.warning("FastAPI MongoDB health check failed: %s", exception)
            mongodb_status = HealthComponent(status="DOWN", detail="Connection check failed")

    overall = (
        "UP"
        if postgres_status.status == "UP" and mongodb_status.status == "UP"
        else "DEGRADED"
    )
    return HealthResponse(
        status=overall,
        postgres=postgres_status,
        mongodb=mongodb_status,
        timestamp=datetime.now(timezone.utc),
    )


@app.get("/api/v1/stations", response_model=list[StationSummary], tags=["stations"])
async def list_stations(
    q: Annotated[str, Query(max_length=100)] = "",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[StationSummary]:
    pool = require_postgres(app)
    pattern = f"%{q.strip()}%"
    query = """
        SELECT s.id, s.name, s.address, s.city, s.price_per_kwh,
               COALESCE(c.charger_count, 0)::int AS charger_count,
               COALESCE(c.available_chargers, 0)::int AS available_chargers
        FROM charging_stations AS s
        LEFT JOIN (
            SELECT station_id, COUNT(*) AS charger_count,
                   COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS available_chargers
            FROM chargers
            GROUP BY station_id
        ) AS c ON c.station_id = s.id
        WHERE $1 = '' OR s.name ILIKE $2 OR s.city ILIKE $2 OR s.address ILIKE $2
        ORDER BY s.id
        LIMIT $3
    """
    try:
        async with pool.acquire() as connection:
            rows = await connection.fetch(query, q.strip(), pattern, limit)
    except Exception as exception:
        logger.exception("FastAPI station query failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Station data is temporarily unavailable.",
        ) from exception
    return [StationSummary(**dict(row)) for row in rows]


@app.post(
    "/api/v1/knowledge",
    response_model=KnowledgeDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["knowledge"],
)
async def create_knowledge_document(
    document: KnowledgeDocument,
    user: Annotated[CurrentUser, Depends(require_operator)],
) -> KnowledgeDocumentResponse:
    collection = require_mongo(app)
    if document.station_id is not None:
        pool = require_postgres(app)
        try:
            async with pool.acquire() as connection:
                exists = await connection.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM charging_stations WHERE id = $1)",
                    document.station_id,
                )
        except Exception as exception:
            logger.exception("FastAPI station validation query failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Station data is temporarily unavailable.",
            ) from exception
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The linked station does not exist.",
            )

    document_id = str(uuid4())
    created_at = datetime.now(timezone.utc)
    record = {
        "id": document_id,
        "title": document.title,
        "content": document.content,
        "station_id": document.station_id,
        "metadata": document.metadata,
        "embedding": embed_text(f"{document.title}\n{document.content}"),
        "embedding_dimensions": VECTOR_DIMENSIONS,
        "created_by": user.email,
        "created_at": created_at,
    }
    try:
        await collection.insert_one(record)
    except PyMongoError as exception:
        logger.exception("FastAPI MongoDB document insert failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge storage is temporarily unavailable.",
        ) from exception

    return KnowledgeDocumentResponse(
        id=document_id,
        title=document.title,
        content=document.content,
        station_id=document.station_id,
        metadata=document.metadata,
        vector_dimensions=VECTOR_DIMENSIONS,
        created_at=created_at,
    )


@app.get("/api/v1/knowledge/search", response_model=list[SearchResult], tags=["knowledge"])
async def search_knowledge(
    q: Annotated[str, Query(min_length=2, max_length=500)],
    user: Annotated[CurrentUser, Depends(current_user)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[SearchResult]:
    del user
    collection = require_mongo(app)
    try:
        vector_index = os.getenv("MONGO_VECTOR_INDEX")
        if vector_index:
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": vector_index,
                        "path": "embedding",
                        "queryVector": embed_text(q),
                        "numCandidates": max(limit * 10, 100),
                        "limit": limit,
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "id": 1,
                        "title": 1,
                        "content": 1,
                        "metadata": 1,
                        "score": {"$meta": "vectorSearchScore"},
                    }
                },
            ]
            documents = await collection.aggregate(pipeline).to_list(length=limit)
        else:
            cursor = collection.find(
                {},
                {"_id": 0, "id": 1, "title": 1, "content": 1, "metadata": 1, "embedding": 1},
            ).limit(MAX_DOCUMENTS_TO_SCAN)
            documents = [document async for document in cursor]
    except PyMongoError as exception:
        logger.exception("FastAPI MongoDB vector search read failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge search is temporarily unavailable.",
        ) from exception

    if os.getenv("MONGO_VECTOR_INDEX"):
        return [SearchResult(**result) for result in documents]
    return [SearchResult(**result) for result in search_documents(documents, q, limit)]
