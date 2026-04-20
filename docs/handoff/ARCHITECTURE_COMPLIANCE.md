# Architecture Compliance

Evidence of Clean Architecture + DDD enforcement in the Academyflo codebase.

---

## Repository Structure

```
apps/
  api/                          # NestJS API server
    src/
      domain/                   # Entities, rules, ports (zero dependencies)
        academy/
        attendance/
        audit/
        batch/
        fee/
        identity/
        student/
        subscription/
        subscription-payments/
      application/              # Use-cases, DTOs, ports (depends on domain only)
        academy/
        admin/
        attendance/
        audit/
        batch/
        common/                 # Shared ports: clock, job-lock, external-call-policy
        dashboard/
        fee/
        identity/
        notifications/
        staff/
        staff-attendance/
        student/
        subscription/
        subscription-payments/
      infrastructure/           # Adapters, DB schemas, external clients
        cron/
        database/schemas/
        notifications/
        payments/cashfree/
        reliability/
        repositories/
        scheduling/
        subscription/
      presentation/             # HTTP controllers, modules, Swagger
        http/
        swagger/
      shared/                   # Cross-cutting: config, logging, errors, validation
    test/                       # E2E tests
  admin-web/                    # Next.js Super Admin console
    src/
      app/                      # Next.js App Router pages
      domain/                   # Client-side types
      infra/                    # API client, auth, env
      presentation/             # React components
  mobile/                       # React Native Owner/Staff app
    src/
      domain/                   # Types, schemas
      application/              # Use-cases, hooks
      infra/                    # API clients, storage
      presentation/             # Screens, components, context
packages/
  contracts/                    # Shared OpenAPI contracts
  eslint-config/                # Shared ESLint rules
```

## Module Boundary Rules

Enforced by `npm run validate:boundaries` (dependency-cruiser) and `npm run validate:architecture` (custom architecture tests).

### Dependency Rules

| Layer | May Import From | Must NOT Import From |
|-------|----------------|---------------------|
| **Domain** | Nothing (pure) | Application, Infrastructure, Presentation, Node libs |
| **Application** | Domain | Infrastructure, Presentation, Node libs (except crypto) |
| **Infrastructure** | Domain, Application | Presentation |
| **Presentation** | Domain, Application, Infrastructure | — |
| **Shared** | Nothing (cross-cutting) | Domain, Application, Infrastructure |

### Verification

```bash
# Dependency boundary validation (all workspaces)
npm run validate:boundaries

# Architecture rules (API workspace)
npm run validate:architecture
```

Architecture rules are tested in `apps/api/test/architecture/architecture-rules.spec.ts`.

## Clean Layering Examples

### Domain Entity

```
apps/api/src/domain/student/entities/student.entity.ts
```

- Private constructor, static `create()` and `reconstitute()` factories
- No imports from application, infrastructure, or Node modules
- Immutable state transitions via methods returning new instances

### Application Use-Case

```
apps/api/src/application/student/use-cases/create-student.usecase.ts
```

- Depends only on domain ports (repository interfaces) and domain entities
- Returns `Result<T, AppError>` — never throws
- No HTTP, database, or framework imports

### Infrastructure Repository

```
apps/api/src/infrastructure/repositories/mongo-student.repository.ts
```

- Implements domain port (`StudentRepository`)
- Maps between Mongoose documents and domain entities
- Contains all database-specific logic

### Presentation Controller

```
apps/api/src/presentation/http/students/students.controller.ts
```

- Delegates entirely to use-cases
- Handles HTTP concerns only (decorators, status codes, guards)
- No business logic

## DDD Patterns

| Pattern | Implementation | Example |
|---------|---------------|---------|
| Entity | `Entity<Props>` base class with `UniqueId` | `Student`, `FeeDue`, `SubscriptionPayment` |
| Value Object | Immutable types in domain | `TierKey`, `SubscriptionStatus` |
| Repository Port | Interface + Symbol token | `STUDENT_REPOSITORY`, `StudentRepository` |
| Domain Rules | Pure functions, no side effects | `fee.rules.ts`, `subscription.rules.ts` |
| Use-Case | Single `execute()` method, DI via constructor | All files in `application/*/use-cases/` |
| Audit Fields | `AuditFields` type with `createdAt`/`updatedAt` | All entities via `shared/kernel/audit.ts` |
| Result Monad | `ok(value)` / `err(error)` | All use-cases return `Result<T, AppError>` |

## Enforcement Evidence

```bash
# Run all architecture checks
npm run validate:boundaries && npm run validate:architecture

# Run architecture-specific tests
npx jest --workspace apps/api -- architecture-rules
```

All checks are run in CI (`.github/workflows/ci.yml` — `boundaries` job).
