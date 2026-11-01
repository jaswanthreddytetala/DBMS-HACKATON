# VoltFlow REST API

Base URL: `http://localhost:8080/api`

Spring signs HS256 JWTs with `sub`, `role`, `iat`, and `exp` claims. Send protected requests with the token in the `Authorization` header using the Bearer scheme. Spring verifies the signature and checks the account's current enabled state and role; FastAPI uses the same secret and claim format. The frontend only decodes claims to display the session and reject expired tokens locally; authorization is enforced by the APIs.

Protected requests must include the JWT returned by login or registration in the `Authorization` header using the Bearer scheme.

The optional FastAPI companion runs at `http://localhost:5002` and documents its integration routes at `/docs`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Check the API and PostgreSQL connection |
| POST | `/auth/register` | Public | Register as a Driver and receive a JWT |
| POST | `/auth/login` | Public | Authenticate and receive a JWT |
| GET | `/auth/me` | Any authenticated user | Read current account and current server-side role |
| GET | `/stations?q=` | Public | Search stations |
| GET | `/stations/{id}` | Public | Read station details |
| POST | `/stations` | Admin, Operator | Create a station |
| PUT | `/stations/{id}` | Admin, Operator | Update a station |
| DELETE | `/stations/{id}` | Admin | Delete a station |
| GET | `/chargers?stationId=` | Public | List chargers |
| POST | `/chargers?stationId=` | Admin, Operator | Add a charger |
| PUT | `/chargers/{id}` | Admin, Operator | Update charger details and status |
| POST | `/bookings` | Driver | Book a charger |
| GET | `/bookings` | Driver | List the driver's bookings |
| PUT | `/bookings/{id}/cancel` | Driver | Cancel the driver's booking |
| POST | `/sessions/start` | Driver | Start simulated charging |
| POST | `/sessions/{id}/stop` | Driver | Stop charging and calculate cost |
| GET | `/sessions` | Driver | Read the driver's session history |
| GET | `/analytics/overview` | Admin, Operator | Read network KPIs |
| GET | `/analytics/sessions` | Admin, Operator | Read network session history |
| GET | `/users` | Admin | List user accounts |
| PUT | `/users/{id}` | Admin | Update role and account status |
| DELETE | `/users/{id}` | Admin | Delete another user account |
| GET | `http://localhost:5002/health` | Public | Check FastAPI, PostgreSQL, and MongoDB availability |
| GET | `http://localhost:5002/api/v1/stations?q=&limit=` | Public | Search live PostgreSQL station and charger data |
| POST | `http://localhost:5002/api/v1/knowledge` | Admin, Operator | Validate and store a knowledge document plus its vector in MongoDB |
| GET | `http://localhost:5002/api/v1/knowledge/search?q=&limit=` | Any authenticated user | Search stored vectors by cosine similarity |

## Examples

```json
POST /api/auth/login
{"email":"admin@voltflow.com","password":"VoltFlow@2026"}
```

```http
GET /api/auth/me
Authorization: Bearer <JWT>
```

```json
POST /api/bookings
{"chargerId":1,"scheduledAt":"2026-03-10T09:30:00Z"}
```

```json
POST /api/sessions/1/stop
{"energyKwh":42.8}
```

Errors use a stable JSON shape containing `timestamp`, `status`, `error`, `message`, and `fieldErrors`. The API returns appropriate status codes: `400` for invalid input, `401` for missing or invalid authentication, `403` for insufficient access, `404` for missing records, `409` for database constraint conflicts, and `500` for unexpected server errors. Unexpected errors are logged without exposing internal details in the response.
