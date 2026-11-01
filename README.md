# VoltFlow

**Powering the Future of Electric Mobility.**

VoltFlow is a premium EV charging management platform for network administrators, station operators and drivers. It combines station discovery, reservations, simulated charging sessions, role-aware operations, analytics and optional demand forecasting.

## Project structure

```text
ev management/
├── frontend/                 React, TypeScript, Tailwind, Router, Recharts
│   └── src/
│       ├── app/              Data Router configuration
│       ├── components/       Reusable UI primitives
│       ├── data/             Preview sample data
│       ├── layouts/          Authenticated SaaS shell
│       ├── pages/            Landing, auth, dashboard and workflows
│       └── services/         Axios REST client
├── backend/                  Java 21 / Spring Boot REST API
│   └── src/main/java/com/voltflow/
│       ├── config/           Security, CORS and demo bootstrap
│       ├── controller/       REST endpoints
│       ├── dto/              Validated request records
│       ├── entity/           Normalized JPA domain
│       ├── exception/        API error handling
│       ├── repository/       Spring Data repositories
│       ├── security/         JWT filter and token service
│       └── service/          Transactional business rules
├── database/                 PostgreSQL schema and station fixtures
├── ml-service/               Optional Flask predictor and FastAPI SQL/Mongo API
└── docs/                     Architecture, API and setup guides
```

## Technology

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, React Router, Recharts, Lucide, Axios, Leaflet/OpenStreetMap
- **Backend:** Java 21, Spring Boot, Spring MVC, Spring Security, Spring Data JPA, Hibernate, Maven
- **Database:** PostgreSQL 14+
- **ML:** Python, Flask, Pandas, NumPy, Scikit-learn
- **Integration API:** FastAPI, Pydantic, asyncpg, MongoDB, PyJWT

## Quick start

See [`docs/setup-guide.md`](docs/setup-guide.md) for complete commands.

1. Create a PostgreSQL database named `voltflow`, then apply `database/schema.sql` and `database/sample-data.sql`.
2. Export `DB_PASSWORD` and a 32+ byte `JWT_SECRET`.
3. Run `mvn spring-boot:run` from `backend`.
4. Set `VITE_DEMO_MODE=false` and run `pnpm dev` from `frontend`.
5. Optionally run `python app.py` from `ml-service`.

## Demo accounts

All demo accounts use `VoltFlow@2026`; BCrypt hashes are generated at backend startup.

| Role | Email |
|---|---|
| ADMIN | `admin@voltflow.com` |
| DRIVER | `driver@voltflow.com` |
| OPERATOR | `operator@voltflow.com` |

## Core behavior

- Stateless HS256 JWT authentication with BCrypt password hashing; Spring and FastAPI share the secret and validate the user's current enabled state and role
- PostgreSQL-backed user registration, station creation, charger reservations and charging sessions
- Completed sessions persist delivered energy and calculated cost, with a matching payment record
- Dashboard and analytics metrics are calculated from persisted station, charger, user and session records
- Role-protected station and charger management
- Booking → charging → completed/cancelled workflow
- Final cost calculated server-side as `energy consumed × station price`
- Responsive dashboards, filtering, booking dialog, simulation and CSV export
- Optional Random Forest service trained on labelled synthetic data
- Optional FastAPI service reuses Spring JWTs, reads normalized PostgreSQL station data, stores knowledge documents in MongoDB, and provides vector similarity search

## Role access

- **Admin:** network overview and analytics, station operations, and account management. Admins can assign Admin, Operator, or Driver access and enable or disable other accounts.
- **Operator:** network overview and analytics, plus station operations. User administration and driver booking workflows are not available.
- **Driver:** public station discovery, charger reservations, and the driver's own charging sessions and booking history.

New registrations always receive Driver access. An Admin must promote a user to Operator or Admin. These restrictions are enforced by the API as well as the frontend; hiding a page is not the security boundary. JWTs are sent as Bearer tokens and are cleared when the API reports an expired session.

## Known limitations

- Charger actions are a software simulation; no OCPP or physical charger communication is claimed.
- The public landing-page artwork contains illustrative preview values; authenticated dashboards, stations, bookings, sessions and analytics use the Spring API and PostgreSQL.
- Payments are modeled, but no external payment processor is connected.
- ML is demonstration-grade and must be retrained on production history.
- Production should replace demo accounts and add refresh-token rotation, audit logging, rate limiting and managed secrets.

API details are in [`docs/api-documentation.md`](docs/api-documentation.md).
