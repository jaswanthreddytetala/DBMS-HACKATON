# VoltFlow Architecture

VoltFlow is split into three independently deployable services.

```text
React + TypeScript SPA
        |
        | HTTPS / JWT
        v
Spring Boot REST API ----> PostgreSQL 14+
        |
        | optional HTTP
        v
Python prediction service
        |
        +-- Flask demand prediction (port 5001)
        +-- FastAPI integration API (port 5002)
              | shared Spring JWT
              +--> PostgreSQL station data
              +--> MongoDB knowledge documents and vectors
```

## Frontend

The React application uses React Router Data mode. Reusable UI lives in `components`, route-level views in `pages`, the authenticated shell in `layouts`, and Axios adapters in `services`. Recharts powers analytics. The station view is prepared for Leaflet/OpenStreetMap; the current investor demo uses a lightweight map treatment so it remains reliable in the embedded preview.

## Backend

The API follows Controller → Service → Repository → PostgreSQL. JPA entities model users, stations, chargers, bookings, sessions, payments, maintenance requests and notifications. User registration, station creation, bookings, session transitions and session payments are persisted. Dashboard totals and analytics are derived from persisted records; the public landing page's visual session preview is illustrative. Spring Security is stateless: the auth service hashes passwords with BCrypt and issues signed JWTs. Endpoint and method-level authorization enforce ADMIN, DRIVER and OPERATOR boundaries.

Charging remains a software simulation. `SessionService` controls state transitions and computes `energyKwh × station.pricePerKwh`. The charger boundary can later be replaced by an OCPP adapter without changing booking and billing domains.

## ML service

The Flask service is optional and does not block core charging workflows. A Random Forest is trained at startup on explicitly synthetic hourly data and exposes demand and peak-hour predictions.

The optional FastAPI companion does not replace Spring Boot or Flask. It uses Pydantic request validation, async PostgreSQL queries for station data, MongoDB document storage, and the same JWT secret as Spring. Knowledge documents store deterministic 384-dimensional hashed text vectors in MongoDB. Search uses exact cosine ranking for local installations; an optional MongoDB Atlas Vector Search index can accelerate it. These baseline vectors are lexical and are not a substitute for a pretrained embedding model.
