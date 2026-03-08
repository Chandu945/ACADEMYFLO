# Performance & Scalability

Summary of performance controls and scalability patterns in the PlayConnect system.

---

## Pagination

All list endpoints enforce server-side pagination to prevent unbounded queries.

### Base DTO

```
apps/api/src/presentation/http/common/dto/pagination.query.ts
```

| Parameter | Type | Default | Min | Max |
|-----------|------|---------|-----|-----|
| `page` | number | 1 | 1 | — |
| `pageSize` | number | 20 | 1 | 100 |

### Paginated Endpoints

| Endpoint | Extended Query |
|----------|---------------|
| `GET /students` | `status`, `search`, `feeFilter`, `month` |
| `GET /batches` | Pagination only |
| `GET /fees/dues` | `month`, `batchId` |
| `GET /fees/paid` | `month` |
| `GET /audit-logs` | `from`, `to`, `action`, `entityType` |
| `GET /fees/payment-requests` | `status` |
| `GET /staff` | Pagination + filters |
| `GET /admin/academies` | Pagination + search |

All controllers return `{ data: T[], total: number, page: number, pageSize: number }`.

---

## Database Indexes

All academy-scoped queries use compound indexes starting with `academyId` for tenant isolation.

### Index Map

| Collection | Index | Purpose |
|------------|-------|---------|
| **users** | `{role: 1, status: 1}` | Admin role/status queries |
| | `{academyId: 1, role: 1}` | Academy staff lookups |
| **students** | `{academyId: 1, status: 1, createdAt: -1}` | List by status, newest first |
| | `{academyId: 1, status: 1, joiningDate: 1}` | Sort by joining date |
| | `{academyId: 1, fullNameNormalized: 1}` | Prefix search |
| **transactionLogs** | `{academyId: 1, createdAt: -1}` | Recent transactions |
| | `{paymentRequestId: 1}` (unique, sparse) | Payment request correlation |
| | `{academyId: 1, receiptNumber: 1}` (unique) | Receipt lookup |
| | `{academyId: 1, source: 1, createdAt: -1}` | Source-based reporting |
| | `{academyId: 1, monthKey: 1}` | Monthly summaries |
| **auditLogs** | `{academyId: 1, createdAt: -1}` | Audit listing |
| | `{academyId: 1, action: 1, createdAt: -1}` | Filtered audit queries |
| **batches** | `{academyId: 1, batchNameNormalized: 1}` (unique) | Unique batch names per academy |
| | `{academyId: 1, createdAt: -1}` | Paginated listing |
| **subscriptions** | `{paidEndAt: 1}` | Tier recomputation queries |
| **paymentRequests** | `{academyId: 1, status: 1}` | Status-based queries |
| | `{feeDueId: 1, status: 1}` | Fee due correlation |
| | `{staffUserId: 1, academyId: 1}` | Staff-specific queries |

### Verification

Index coverage is verified by `npm run validate:architecture` (architecture rules test suite).

---

## Slow Query Logging

| Setting | Env Var | Default |
|---------|---------|---------|
| Threshold | `SLOW_QUERY_THRESHOLD_MS` | 200 ms |

### Implementation

```
apps/api/src/infrastructure/database/query-profiler.plugin.ts
```

- Mongoose plugin with pre/post hooks on `find`, `findOne`, `countDocuments`, `aggregate`
- Logs at `warn` level when query duration exceeds threshold
- Log payload: operation type, collection name, duration, threshold, request ID, query filter

---

## Rate Limiting

| Scope | Implementation | Limit |
|-------|---------------|-------|
| Global | `@nestjs/throttler` in `AppModule` | Configurable via env |
| Login | Per-route decorator | Stricter limit |
| Password reset | Per-route decorator | Stricter limit |
| Webhook | `@SkipThrottle()` | Unlimited (Cashfree callbacks) |

### Test Coverage

- `rate-limit.e2e-spec.ts` — verifies 429 responses on excessive requests

---

## Distributed Cron Locks

Prevents duplicate job execution across replicas.

| Job | Lock Key | TTL |
|-----|----------|-----|
| Monthly dues generation | `monthly-dues` | 2 hours |
| Fee reminders | `fee-reminders` | 15 minutes |
| Subscription tier recompute | `subscription-tier-recompute` | 30 minutes |

### Implementation

```
apps/api/src/infrastructure/reliability/job-lock/
```

- Atomic `findOneAndUpdate` with upsert on `jobLocks` collection
- Handles MongoDB 11000 duplicate key race condition
- Auto-release in `finally` block
- Structured logging: `jobRunStart`, `jobRunEnd`, `jobRunSkipped`

### Test Coverage

- `job-lock.service.spec.ts` — 4 unit tests
- `cron.locking.e2e-spec.ts` — 4 E2E tests (concurrent single-winner, TTL expiry, reacquire)

---

## External Call Timeouts & Retries

All external HTTP calls (Cashfree, SMTP) go through a bounded policy.

| Setting | Env Var | Default |
|---------|---------|---------|
| Timeout | `EXTERNAL_CALL_TIMEOUT_MS` | 10,000 ms |
| Max retries | `EXTERNAL_CALL_RETRIES` | 1 |
| SMTP timeout | `SMTP_TIMEOUT_MS` | 10,000 ms |

### Retry Rules

| Adapter | Retries | Condition |
|---------|---------|-----------|
| Cashfree POST | Yes (with idempotency key) | Network error or 5xx |
| Cashfree GET | Yes (1 retry) | Network error or 5xx |
| SMTP (nodemailer) | No | Timeout only, no retry |

### Implementation

```
apps/api/src/infrastructure/reliability/external-call/
```

- `withTimeout()` — AbortController-based timeout
- `withRetry()` — exponential backoff with jitter, idempotent-only
- `ExternalCallPolicy` — orchestrates timeout + retry, structured logging

### Test Coverage

- `external-call-policy.spec.ts` — 6 unit tests

---

## Graceful Shutdown

```
apps/api/src/main.ts
```

| Setting | Env Var | Default |
|---------|---------|---------|
| Grace period | `SHUTDOWN_GRACE_MS` | 20,000 ms |

- `app.enableShutdownHooks()` for NestJS lifecycle
- SIGTERM/SIGINT handlers with hard exit after grace period
- `setTimeout(...).unref()` to prevent blocking event loop

---

## Client-Side Request Policies

### Admin Web (`apps/admin-web/src/infra/http/fetch-policy.ts`)

- `safeFetchGet` — retry once on network error
- `safeFetchMutate` — no retry (POST/PUT/DELETE)

### Mobile (`apps/mobile/src/infra/http/request-policy.ts`)

- GET: retry once on network error
- POST/PATCH/DELETE: no retry
- AbortController-based timeout
