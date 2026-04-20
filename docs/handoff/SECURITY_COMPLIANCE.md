# Security Compliance Summary

Summary of security controls implemented across the Academyflo system.

---

## RBAC (Role-Based Access Control)

### Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| **OWNER** | Academy | Full CRUD, manage staff, approve payments, mark fees paid, manage settings |
| **STAFF** | Academy | Read students/fees, mark attendance, create payment requests (own only) |
| **SUPER_ADMIN** | System | View all academies, manage subscriptions, disable login, force logout, reset passwords |

### Enforcement

- **`RoleGuard`** — decorates controller methods with `@Roles('OWNER')` or `@Roles('STAFF')`
- **`AcademyScopeGuard`** — ensures users can only access their own academy's data
- **`InactiveStaffGuard`** — blocks requests from deactivated staff members
- **`SubscriptionEnforcementGuard`** — blocks access when subscription is BLOCKED/DISABLED (except `/subscription/*` paths)

### Test Coverage

- 7 RBAC E2E test suites: `rbac.e2e-spec.ts`, `rbac.fees.e2e-spec.ts`, `rbac.students.e2e-spec.ts`, `rbac.batches.e2e-spec.ts`, `rbac.attendance.e2e-spec.ts`, `rbac.staff-attendance.e2e-spec.ts`, `rbac.audit-logs.e2e-spec.ts`, `rbac.payment-requests.e2e-spec.ts`
- Inactive staff tests: `auth.inactive-staff-login.e2e-spec.ts`, `auth.inactive-staff-request-block.e2e-spec.ts`

## Input Validation & Sanitization

- **Global validation pipe** — `class-validator` + `class-transformer` on all DTOs
- **`SanitizePipe`** — strips HTML tags and script injections from string inputs
- **Notes sanitizer** — dedicated sanitizer for multi-line text fields
- **String sanitizer** — trims whitespace, normalizes unicode

### Test Coverage

- `sanitization.e2e-spec.ts` — verifies XSS payloads are stripped
- `sanitize.pipe.spec.ts`, `string-sanitizer.spec.ts`, `notes-sanitizer.spec.ts`

## Sensitive Data Protection

- **No passwords in API responses** — `passwordHash` excluded from all serializers
- **No tokens in logs** — structured logging never includes JWT tokens or secrets
- **OpenAPI spec verification** — `openapi.sensitive-fields.e2e-spec.ts` ensures no sensitive fields in Swagger schemas
- **Sensitive fields leak test** — `sensitive-fields.leak.e2e-spec.ts`

## Webhook Verification

- **Cashfree webhook** — HMAC-SHA256 signature verification using `crypto.timingSafeEqual`
- Missing headers → 400 Bad Request
- Invalid signature → 401 Unauthorized
- Idempotent processing — SUCCESS is terminal, FAILED doesn't overwrite SUCCESS

### Test Coverage

- `subscription-payments.webhook.security.e2e-spec.ts` — real signature verifier tests

## Password Security

- **bcrypt** hashing with configurable cost factor (default: 12)
- **OTP password reset** — time-limited (10 min), max attempts (5), cooldown (60s)
- **No plaintext storage** — passwords never stored or logged in plaintext

## Rate Limiting

- **Global rate limiting** via `@nestjs/throttler`
- **Per-route limits** on sensitive endpoints (login, password reset)
- **`SkipThrottle`** on webhook endpoint (to avoid blocking Cashfree callbacks)

### Test Coverage

- `rate-limit.e2e-spec.ts`

## Dependency & Secrets Scanning

- **Dependency audit** — `npm run hardening:audit` (critical vulns never allowlistable)
- **License compliance** — `npm run hardening:licenses` (GPL-3.0, AGPL-3.0, SSPL disallowed)
- **Secrets scan** — `npm run hardening:secrets` (10 regex patterns for AWS keys, private keys, JWTs, etc.)
- **Allowlist with expiry** — `scripts/hardening/allowlist.json` (expired entries re-trigger CI failure)

## Swagger/Docs Gating

- `SWAGGER_ENABLED` env var — disabled in production
- Optional `SWAGGER_TOKEN` header for access control
- `swagger.gating.e2e-spec.ts` verifies behavior
