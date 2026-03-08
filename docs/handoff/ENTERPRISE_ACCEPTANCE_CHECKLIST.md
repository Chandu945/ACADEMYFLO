# Enterprise Acceptance Checklist

Go/No-Go verification for enterprise production readiness. Each item includes a verification command and expected result.

---

## Architecture

| # | Check | Verification | Expected |
|---|-------|-------------|----------|
| 1 | Layer boundaries enforced | `npm run validate:boundaries` | Exit 0, no violations |
| 2 | Architecture rules pass | `npm run validate:architecture` | Exit 0, all rules pass |
| 3 | No controller business logic | Review: controllers delegate to use-cases only | Controllers contain no domain logic |
| 4 | Repository-only DB access | Architecture tests verify no Mongoose imports in domain/application | `architecture-rules.spec.ts` passes |
| 5 | Domain entities use factory pattern | All entities have `static create()` + `static reconstitute()` | No `new Entity()` in application layer |
| 6 | Result monad for error handling | Use-cases return `Result<T, AppError>`, no thrown exceptions | Verified by architecture tests |

## Security

| # | Check | Verification | Expected |
|---|-------|-------------|----------|
| 7 | RBAC matrix complete | `npm run test:e2e:api` (7 `rbac.*.e2e-spec.ts` files) | All RBAC tests pass |
| 8 | Input sanitization | `sanitization.e2e-spec.ts` passes | HTML/script tags stripped |
| 9 | Sensitive field leak prevention | `sensitive-fields.leak.e2e-spec.ts` passes | No passwords/tokens in responses |
| 10 | Secrets scan clean | `npm run hardening:secrets` | Exit 0, zero findings |
| 11 | Dependency audit clean | `npm run hardening:audit` | Exit 0, no critical/unallowlisted high |
| 12 | License compliance | `npm run hardening:licenses` | Exit 0, no disallowed licenses |
| 13 | Webhook signature verification | `subscription-payments.webhook.security.e2e-spec.ts` | Invalid signatures rejected (401) |
| 14 | Rate limiting active | `rate-limit.e2e-spec.ts` passes | 429 on excessive requests |
| 15 | No secrets in logs | Review structured log output | PII/tokens never logged |
| 16 | Swagger gated in production | `SWAGGER_ENABLED=false` in prod env | 404 on `/api/v1/docs` |

## Testing

| # | Check | Verification | Expected |
|---|-------|-------------|----------|
| 17 | Unit tests pass | `npm run test:all` | Exit 0 |
| 18 | E2E tests pass | `npm run test:e2e:api` | Exit 0 |
| 19 | Coverage >= 80% | `npm run test:all -- --coverage` | Statements, branches, functions, lines all >= 80% |
| 20 | Failure-path E2E tests | `test/e2e/*.failure-paths.e2e-spec.ts` (3 files) | All pass |
| 21 | Mobile tests pass | `npm run --workspace apps/mobile test` | Exit 0 |
| 22 | Admin-web tests pass | `npm run --workspace apps/admin-web test` | Exit 0 |

## Performance

| # | Check | Verification | Expected |
|---|-------|-------------|----------|
| 23 | All list endpoints paginated | Review controllers: all `GET` lists accept `page`/`pageSize` | No unbounded list queries |
| 24 | Indexes verified | `npm run --workspace apps/api validate:architecture` (index verifier) | All query patterns covered |
| 25 | Slow query logging | `SLOW_QUERY_THRESHOLD_MS` configured | Slow queries logged with timing |
| 26 | Rate limiting configured | `ThrottlerModule` in `AppModule` | Global + per-route limits active |
| 27 | Distributed cron locks | `cron.locking.e2e-spec.ts` | Single execution across replicas |
| 28 | External call timeouts | `external-call-policy.spec.ts` | 10s default timeout, bounded retries |

## Observability

| # | Check | Verification | Expected |
|---|-------|-------------|----------|
| 29 | Request ID propagation | `request-id.e2e-spec.ts` | `X-Request-Id` in all responses |
| 30 | Structured JSON logs | Review log output format | JSON with `message`, `context`, `level` |
| 31 | Metrics endpoint gated | `metrics.e2e-spec.ts` | 403 without valid token |
| 32 | Health endpoints active | `health.e2e-spec.ts` | `/liveness` + `/readiness` return 200 |

## Deployment

| # | Check | Verification | Expected |
|---|-------|-------------|----------|
| 33 | Docker images build | `docker build -f apps/api/Dockerfile .` | Exit 0 |
| 34 | Multi-stage minimal images | Review Dockerfile (non-root user, prod deps only) | < 200MB images |
| 35 | RC workflow exists | `.github/workflows/release-candidate.yml` | Workflow file present |
| 36 | CI workflow exists | `.github/workflows/ci.yml` | 9 jobs, all green on main |
| 37 | Smoke suite passes | `node scripts/rc/smoke-suite.mjs` (staging) | All checks pass |
| 38 | OpenAPI spec stable | `npm run openapi:compare` | No breaking changes |

## Operations

| # | Check | Verification | Expected |
|---|-------|-------------|----------|
| 39 | Backup scripts exist | `ls scripts/backup/` | `mongodump-backup.sh`, `restore-mongodump.sh` |
| 40 | Cutover plan documented | `docs/release/PRODUCTION_CUTOVER_PLAN.md` | Blue/green + rolling strategies |
| 41 | Rollback playbook documented | `docs/release/ROLLBACK_PLAYBOOK.md` | Step-by-step rollback |
| 42 | Post-go-live monitoring plan | `docs/release/POST_GO_LIVE_MONITORING.md` | 2h/day1/week1 checklists |
| 43 | On-call SOP documented | `docs/ops/ONCALL_SOP.md` | Shift handoff + escalation |
| 44 | Incident response documented | `docs/ops/INCIDENT_RESPONSE_PLAYBOOK.md` | Severity levels + triage |

---

## Verdict

| Category | Items | Status |
|----------|-------|--------|
| Architecture | 6 | ☐ |
| Security | 10 | ☐ |
| Testing | 6 | ☐ |
| Performance | 6 | ☐ |
| Observability | 4 | ☐ |
| Deployment | 6 | ☐ |
| Operations | 6 | ☐ |
| **Total** | **44** | |

**Decision:** ☐ ACCEPT / ☐ REJECT

**Accepted by:** ________________ **Date:** ________________
