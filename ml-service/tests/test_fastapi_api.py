import asyncio
import time
from contextlib import asynccontextmanager

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError
from starlette.testclient import TestClient

from fastapi_app import CurrentUser, KnowledgeDocument, app, current_user
from vector_store import VECTOR_DIMENSIONS, cosine_similarity, embed_text, search_documents


class FakePostgresPool:
    def __init__(self, account):
        self.account = account

    async def fetchrow(self, _query, _email):
        return self.account


class FakeConnection:
    async def fetchval(self, query, *_args):
        if query == "SELECT 1":
            return 1
        return True

    async def fetch(self, _query, *_args):
        return [
            {
                "id": 1,
                "name": "VoltFlow Central",
                "address": "1 Main Street",
                "city": "Austin",
                "price_per_kwh": 0.3,
                "charger_count": 4,
                "available_chargers": 2,
            }
        ]


class FakeAcquire:
    async def __aenter__(self):
        return FakeConnection()

    async def __aexit__(self, *_args):
        return None


class FakeApiPostgresPool(FakePostgresPool):
    def acquire(self):
        return FakeAcquire()


class FakeMongoCursor:
    def __init__(self, documents):
        self.documents = documents

    def limit(self, _limit):
        return self

    def __aiter__(self):
        self.iterator = iter(self.documents)
        return self

    async def __anext__(self):
        try:
            return next(self.iterator)
        except StopIteration:
            raise StopAsyncIteration


class FakeMongoCollection:
    def __init__(self):
        self.documents = []

    async def insert_one(self, document):
        self.documents.append(document)

    def find(self, _query, _projection):
        return FakeMongoCursor(self.documents)


class FakeMongoDatabase:
    def __init__(self, collection):
        self.collection = collection

    def __getitem__(self, _name):
        return self.collection


class FakeMongoClient:
    def __init__(self):
        self.collection = FakeMongoCollection()
        self.admin = self

    def __getitem__(self, _name):
        return FakeMongoDatabase(self.collection)

    async def command(self, _name):
        return {"ok": 1}


def test_text_embeddings_are_normalized_and_repeatable():
    first = embed_text("Fast charging station availability")
    second = embed_text("Fast charging station availability")

    assert len(first) == VECTOR_DIMENSIONS
    assert first == second
    assert cosine_similarity(first, first) == pytest.approx(1.0)


def test_vector_search_ranks_matching_documents():
    documents = [
        {
            "id": "charger",
            "title": "Fast charger availability",
            "content": "Charging stations have several available connectors.",
            "metadata": {},
            "embedding": embed_text("Fast charger availability Charging stations have several available connectors."),
        },
        {
            "id": "weather",
            "title": "Weather forecast",
            "content": "Rain and temperature forecast for tomorrow.",
            "metadata": {},
            "embedding": embed_text("Weather forecast Rain and temperature forecast for tomorrow."),
        },
    ]

    results = search_documents(documents, "available charging stations", 5)

    assert results
    assert results[0]["id"] == "charger"
    assert results[0]["score"] > 0


def test_knowledge_document_validates_input():
    with pytest.raises(ValidationError):
        KnowledgeDocument(title="x", content="bad")


def test_jwt_authentication_uses_current_database_role(monkeypatch):
    secret = "voltflow-test-jwt-secret-at-least-32-bytes-long"
    monkeypatch.setenv("JWT_SECRET", secret)
    app.state.postgres_pool = FakePostgresPool({"role": "OPERATOR", "enabled": True})
    token = jwt.encode(
        {
            "sub": "operator@example.com",
            "role": "DRIVER",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        },
        secret,
        algorithm="HS256",
    )

    user = asyncio.run(
        current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    )

    assert user == CurrentUser(email="operator@example.com", role="OPERATOR")


def test_invalid_jwt_is_rejected(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "voltflow-test-jwt-secret-at-least-32-bytes-long")

    with pytest.raises(HTTPException) as exception:
        asyncio.run(
            current_user(
                HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.jwt.token")
            )
        )

    assert exception.value.status_code == 401


def test_jwt_without_issued_at_claim_is_rejected(monkeypatch):
    secret = "voltflow-test-jwt-secret-at-least-32-bytes-long"
    monkeypatch.setenv("JWT_SECRET", secret)
    token = jwt.encode(
        {
            "sub": "driver@example.com",
            "role": "DRIVER",
            "exp": int(time.time()) + 60,
        },
        secret,
        algorithm="HS256",
    )

    with pytest.raises(HTTPException) as exception:
        asyncio.run(
            current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
        )

    assert exception.value.status_code == 401


def test_disabled_accounts_cannot_use_jwt(monkeypatch):
    secret = "voltflow-test-jwt-secret-at-least-32-bytes-long"
    monkeypatch.setenv("JWT_SECRET", secret)
    app.state.postgres_pool = FakePostgresPool({"role": "DRIVER", "enabled": False})
    token = jwt.encode(
        {
            "sub": "driver@example.com",
            "role": "DRIVER",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        },
        secret,
        algorithm="HS256",
    )

    with pytest.raises(HTTPException) as exception:
        asyncio.run(
            current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
        )

    assert exception.value.status_code == 401


def test_fastapi_routes_document_storage_and_vector_search(monkeypatch):
    secret = "voltflow-test-jwt-secret-at-least-32-bytes-long"
    monkeypatch.setenv("JWT_SECRET", secret)
    monkeypatch.delenv("MONGO_VECTOR_INDEX", raising=False)
    pool = FakeApiPostgresPool({"role": "ADMIN", "enabled": True})
    mongo_client = FakeMongoClient()

    @asynccontextmanager
    async def test_lifespan(application):
        application.state.postgres_pool = pool
        application.state.mongo_client = mongo_client
        yield

    monkeypatch.setattr(app.router, "lifespan_context", test_lifespan)
    token = jwt.encode(
        {
            "sub": "admin@example.com",
            "role": "ADMIN",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        },
        secret,
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {token}"}

    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "UP"
        assert client.get("/openapi.json").status_code == 200
        assert client.get("/api/v1/knowledge/search?q=charging").status_code == 401

        stations = client.get("/api/v1/stations")
        assert stations.status_code == 200
        assert stations.json()[0]["name"] == "VoltFlow Central"

        created = client.post(
            "/api/v1/knowledge",
            headers=headers,
            json={
                "title": "Fast charging guide",
                "content": "Use available charging stations near the city center.",
            },
        )
        assert created.status_code == 201
        assert created.json()["vector_dimensions"] == VECTOR_DIMENSIONS

        results = client.get(
            "/api/v1/knowledge/search?q=available+charging",
            headers=headers,
        )
        assert results.status_code == 200
        assert results.json()[0]["id"] == created.json()["id"]
