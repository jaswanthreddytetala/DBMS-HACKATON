# Setup Guide

## Prerequisites

- Node.js 22+, pnpm 10+
- Java 21 and Maven 3.9+
- PostgreSQL 14+
- MongoDB 6+ (optional, for the FastAPI integration service)
- Python 3.11+ (optional)

## Database

Create a database and application user in PostgreSQL (keep the password out of source control):

```sql
CREATE USER voltflow WITH PASSWORD 'your-password';
CREATE DATABASE voltflow OWNER voltflow;
```

Connect to `voltflow` as its owner and apply the schema and fixtures:

```bash
psql -U voltflow -d voltflow -f database/schema.sql
psql -U voltflow -d voltflow -f database/sample-data.sql
```

For an existing MySQL deployment, back up the source database and migrate its data separately with a MySQL-to-PostgreSQL migration tool before switching the backend. Do not run the fixture script against a database that already contains these stations; it inserts duplicate records.

## Backend

```powershell
cd backend
$env:DB_URL = 'jdbc:postgresql://localhost:5432/voltflow'
$env:DB_USERNAME = 'voltflow'
$env:DB_PASSWORD = 'your-password'
$env:JWT_SECRET = 'a-random-secret-of-at-least-32-bytes'
mvn spring-boot:run
```

The API starts on port 8080. `DDL_AUTO=validate` ensures that JPA and the SQL schema agree. Use the same randomly generated JWT secret for Spring and FastAPI; it must contain at least 32 UTF-8 bytes. Spring signs HS256 tokens with `sub`, `role`, `iat`, and `exp` claims. The browser decodes claims only for session display and expiry handling; the backend verifies the signature and checks the current account role and enabled state.

## Frontend

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

The embedded Figma Make preview is bridged to this source from the repository-level Vite entry. A standalone checkout uses the frontend package directly.

## Optional ML service

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The prediction API starts on port 5001.

## Optional FastAPI SQL/MongoDB integration

The FastAPI service is additive; it does not replace the Spring API or Flask predictor. It validates requests with Pydantic, reads stations from the existing PostgreSQL database, stores knowledge documents and their vectors in MongoDB, and accepts JWTs issued by Spring Security.

```powershell
cd ml-service
python -m pip install -r requirements-fastapi.txt
$env:DB_URL = 'jdbc:postgresql://localhost:5432/voltflow'
$env:DB_USERNAME = 'voltflow'
$env:DB_PASSWORD = 'your-password'
$env:JWT_SECRET = 'the-same-secret-used-by-the-Spring-backend'
$env:MONGO_URI = 'mongodb://localhost:27017'
python -m uvicorn fastapi_app:app --host 127.0.0.1 --port 5002
```

Open `http://localhost:5002/docs` for the generated OpenAPI documentation and `http://localhost:5002/health` to check PostgreSQL and MongoDB connectivity. The FastAPI process must use the same `JWT_SECRET` as Spring. Its protected endpoints accept HS256 tokens with `sub`, `role`, `iat`, and `exp` claims and retrieve the user's current enabled state and role from PostgreSQL.

`POST /api/v1/knowledge` stores a document and a deterministic 384-dimensional hashed text vector in MongoDB. `GET /api/v1/knowledge/search?q=...` ranks documents by cosine similarity. For local development, exact similarity is calculated over up to 5,000 stored documents. To use MongoDB Atlas Vector Search at larger scale, configure a vector index on `embedding` with 384 dimensions and cosine similarity, then set `MONGO_VECTOR_INDEX` to its index name. Atlas index definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    }
  ]
}
```

The hashed vectors are a lightweight baseline, not a pretrained language model. Replace `embed_text` with your approved embedding model when higher-quality semantic matching is needed. The service reports unavailable dependencies through `/health` and returns JSON `503` responses for their unavailable endpoints rather than failing during startup.
