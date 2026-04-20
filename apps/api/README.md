# @academyflo/api

NestJS backend following Clean Architecture + DDD principles.

## Architecture Layers

```
src/
  domain/          # Entities, Value Objects, Repository Interfaces (no NestJS imports)
  application/     # Use Cases, DTOs, Application Services (no DB/HTTP imports)
  infrastructure/  # Database, External Services, Repository Implementations
  presentation/    # Controllers, Guards, Pipes, Interceptors
  shared/          # Config, Logging, Errors, Validation (cross-cutting)
```

## Cross-Cutting Concerns

- **Config** — Zod-validated environment variables (`shared/config/`)
- **Logging** — Pino structured logger, no console.log (`shared/logging/`)
- **Request ID** — Auto-generated UUID per request, propagated via `X-Request-Id`
- **Error Handling** — Global exception filter with standardized JSON envelope
- **Validation** — Global validation pipe (whitelist, forbidNonWhitelisted, transform)
- **Security** — Helmet enabled, TZ=Asia/Kolkata enforced

## API

- Base path: `/api/v1`
- Swagger docs: `/api/docs`
- Health liveness: `GET /api/v1/health/liveness`
- Health readiness: `GET /api/v1/health/readiness`

## Setup

```bash
# From monorepo root
npm install
cp apps/api/.env.example apps/api/.env
# Edit .env with your local values

# Run in development
npm run start:dev --workspace=@academyflo/api
```

## Scripts

| Script                   | Description           |
| ------------------------ | --------------------- |
| `npm run lint`           | ESLint                |
| `npm run typecheck`      | TypeScript check      |
| `npm run test`           | Unit tests            |
| `npm run test:e2e`       | E2E tests             |
| `npm run contract:check` | Validate OpenAPI spec |
