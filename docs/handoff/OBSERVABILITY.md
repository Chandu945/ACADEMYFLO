# Observability

Summary of request tracing, structured logging, metrics, and health monitoring in the PlayConnect system.

---

## Request ID Propagation

Every API request is tagged with a unique trace ID for end-to-end correlation.

### Implementation

```
apps/api/src/shared/logging/request-id.interceptor.ts
```

| Aspect | Detail |
|--------|--------|
| Header | `X-Request-Id` |
| Generation | UUID v4 (if not provided by client) |
| Storage | `AsyncLocalStorage` via `requestContextStorage` |
| Response | Returned in response headers |
| Logging | Included in every structured log entry |

### Test Coverage

- `request-id.e2e-spec.ts` — verifies `X-Request-Id` in all responses

---

## Structured Logging

### Logger

```
apps/api/src/shared/logging/pino-logger.service.ts
```

| Setting | Env Var | Default |
|---------|---------|---------|
| Level | `LOG_LEVEL` | `info` |
| Format (dev) | — | `pino-pretty` (colorized) |
| Format (prod) | — | JSON |

- Implements `LoggerPort` abstraction (no direct Pino dependency in business logic)
- Log levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`

### HTTP Request Logging

```
apps/api/src/presentation/http/common/interceptors/http-logging.interceptor.ts
```

Every HTTP request/response is logged with:

| Field | Description |
|-------|-------------|
| `requestId` | UUID for tracing |
| `method` | HTTP method |
| `path` | Request path |
| `statusCode` | Response status |
| `durationMs` | Response time |
| `userId` | Authenticated user (if any) |
| `role` | User role (if any) |

### Log Level Rules

| Status Code | Log Level |
|-------------|-----------|
| 2xx | `info` |
| 4xx | `warn` |
| 5xx | `error` |

### Sensitive Data Exclusion

- JWT tokens never logged
- Password hashes never logged
- PII excluded from structured log context

---

## Metrics

### Endpoint

```
GET /api/v1/metrics
```

| Setting | Env Var | Default |
|---------|---------|---------|
| Enabled | `METRICS_ENABLED` | `false` |
| Auth token | `METRICS_TOKEN` | — (optional) |

- Prometheus-compatible text format
- Gated by optional `X-Metrics-Token` header
- Returns 403 if token is configured but not provided

### Collected Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | `method`, `status` (2xx/4xx/5xx) |
| `http_request_duration_ms` | Histogram | `method` |

### Implementation

```
apps/api/src/infrastructure/metrics/basic-metrics.adapter.ts
```

### Test Coverage

- `metrics.e2e-spec.ts` — verifies 403 without token, 200 with valid token

---

## Health Endpoints

### Liveness

```
GET /api/v1/health/liveness
```

- Always returns 200 if the process is running
- Response: `{ status: 'ok', service: 'playconnect-api', time, requestId }`
- No authentication required
- Used by Kubernetes/Docker liveness probes

### Readiness

```
GET /api/v1/health/readiness
```

- Checks MongoDB connectivity
- Response: `{ status: 'ok'|'unavailable', service, time, dependencies: { mongodb: 'up'|'down'|'not_configured' }, requestId }`
- Returns 503 if database is unreachable
- Used by load balancers to route traffic

### Implementation

```
apps/api/src/presentation/http/health/health.controller.ts
```

### Test Coverage

- `health.e2e-spec.ts` — verifies liveness and readiness responses

---

## Slow Query Profiling

```
apps/api/src/infrastructure/database/query-profiler.plugin.ts
```

| Setting | Env Var | Default |
|---------|---------|---------|
| Threshold | `SLOW_QUERY_THRESHOLD_MS` | 200 ms |

- Mongoose plugin with pre/post hooks
- Operations monitored: `find`, `findOne`, `countDocuments`, `aggregate`
- Logs at `warn` level with: operation, collection, duration, threshold, requestId, query filter

---

## Error Tracking

### Structured Error Responses

All API errors follow a consistent format:

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Descriptive error message",
  "requestId": "uuid"
}
```

### Error Classification

| Error Type | HTTP Status | Log Level |
|------------|-------------|-----------|
| Validation errors | 400 | warn |
| Authentication errors | 401 | warn |
| Authorization errors | 403 | warn |
| Not found | 404 | warn |
| Business rule violations | 409/422 | warn |
| Internal errors | 500 | error |

---

## Environment Configuration

All observability settings are configured via environment variables validated by Zod schema:

```
apps/api/src/shared/config/env.schema.ts
```

| Variable | Purpose | Default |
|----------|---------|---------|
| `LOG_LEVEL` | Pino log level | `info` |
| `METRICS_ENABLED` | Enable metrics endpoint | `false` |
| `METRICS_TOKEN` | Metrics auth token | — |
| `SLOW_QUERY_THRESHOLD_MS` | Slow query logging | 200 |
