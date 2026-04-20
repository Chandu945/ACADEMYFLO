# Academyflo — Academy Management Application

Enterprise monorepo for Academyflo MVP.

## Architecture

| App              | Technology                        | Target Users  |
| ---------------- | --------------------------------- | ------------- |
| `apps/api`       | NestJS (Clean Architecture + DDD) | Backend API   |
| `apps/admin-web` | Next.js (App Router)              | Super Admin   |
| `apps/mobile`    | React Native                      | Owner + Staff |

### Shared Packages

| Package                    | Purpose                       |
| -------------------------- | ----------------------------- |
| `packages/tsconfig`        | Base TypeScript configuration |
| `packages/eslint-config`   | Shared ESLint rules           |
| `packages/prettier-config` | Shared Prettier formatting    |

## Getting Started

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- npm 11+

### Setup

```bash
# Install all dependencies
npm install

# Run all quality gates
npm run ci:verify
```

### Available Scripts

| Script                        | Description                               |
| ----------------------------- | ----------------------------------------- |
| `npm run lint`                | Run ESLint across all workspaces          |
| `npm run typecheck`           | Run TypeScript type checking              |
| `npm run test`                | Run tests across all workspaces           |
| `npm run validate:boundaries` | Check workspace + architecture boundaries |
| `npm run format`              | Check Prettier formatting                 |
| `npm run format:fix`          | Fix Prettier formatting                   |
| `npm run ci:verify`           | Run all gates and generate JSON report    |
| `npm run audit:check`         | Run npm security audit                    |

## Workspace Boundaries

Enforced via `dependency-cruiser`:

- **Apps cannot import from other apps.** Cross-app coupling is forbidden.
- **Apps may import from `packages/*` only.**
- **Circular dependencies are forbidden.**
- **Clean Architecture layers** (domain/application/infrastructure/presentation) enforce directional dependency rules.

## Environment Management

### Strategy

| Environment   | Secret Source                                       |
| ------------- | --------------------------------------------------- |
| `development` | Local `.env` files (not committed)                  |
| `staging`     | CI/CD secrets or secret manager (`SECRET_PROVIDER`) |
| `production`  | CI/CD secrets or secret manager (`SECRET_PROVIDER`) |

### Policy

- `.env.example` templates are committed with **only non-secret placeholders**
- `.env` files are gitignored and must never be committed
- `TZ=Asia/Kolkata` is a policy requirement for date logic consistency
- Private keys (`*.pem`, `*.key`, `*.p12`) are gitignored
- Pre-commit hooks block committing secret-like files

## Commit Conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add student registration API
fix: correct timezone handling in attendance
docs: update API documentation
```

Enforced via `commitlint` + Husky `commit-msg` hook.

## Run with Docker Compose

```bash
# Build and start API + MongoDB
docker compose up -d --build

# Verify
curl http://localhost:3001/api/v1/health/liveness
curl http://localhost:3001/api/v1/health/readiness

# Stop
docker compose down
```

The compose stack includes:

- **mongo** — MongoDB 7 with persistent volume and healthcheck
- **api** — Multi-stage production build (non-root, no dev deps)

### Docker Build (standalone)

```bash
docker build -t academyflo-api:local -f apps/api/Dockerfile .
```

## Quality Gates

All gates must pass before merge (enforced in CI):

1. **Lint** — ESLint with shared config
2. **Typecheck** — TypeScript strict mode
3. **Test** — Unit tests
4. **E2E** — API integration tests
5. **Contract** — OpenAPI spec validation
6. **Boundaries** — No circular deps, no cross-app imports
7. **Format** — Prettier consistency

### JSON Report

`npm run ci:verify` produces `./artifacts/test-report.json` with structured gate results.

## CI Pipeline

GitHub Actions runs on every PR and push to `main`:

- Installs deps via `npm ci`
- Executes `npm run ci:verify` (all 7 gates)
- Uploads `artifacts/test-report.json` as a CI artifact
- Fails the build on any gate violation

## Logging Policy

- No `console.log` in production code (ESLint warning, will be strict-error later)
- Structured logging via Pino (JSON in production, pretty in development)

## Security

- No secrets committed — `.env`, `*.pem`, `*.key` are gitignored
- Pre-commit hooks block committing secret-like files
- Docker production image runs as non-root user
- No secrets baked into Docker images
- `npm audit` is available via `npm run audit:check`
- CI workflow uses no plaintext secrets (GitHub Secrets for future env vars)
