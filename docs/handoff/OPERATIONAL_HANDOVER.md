# Operational Handover

Deployment procedures, secrets management, backup/restore, rollback, on-call references, and operational commands for the PlayConnect system.

---

## Deployment

### Docker Images

| Service | Dockerfile | Base |
|---------|-----------|------|
| API | `apps/api/Dockerfile` | `node:20-alpine` |
| Admin Web | `apps/admin-web/Dockerfile` | `node:20-alpine` |

Both use multi-stage builds with non-root user (`appuser`, uid 1001) and production-only dependencies.

### Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development (includes MongoDB) |
| `docker-compose.prod.yml` | Production with external images |
| `docker-compose.staging.yml` | Staging environment |
| `docker-compose.ci.yml` | CI pipeline |
| `deploy/docker-compose.prod.yml` | Production with nginx reverse proxy |

### Deploy Commands

```bash
# Build images
docker build -f apps/api/Dockerfile -t playconnect-api .
docker build -f apps/admin-web/Dockerfile -t playconnect-admin-web .

# Production deploy
docker compose -f docker-compose.prod.yml up -d

# Staging deploy (via RC workflow)
node scripts/rc/deploy-staging.mjs
```

### Health Verification

```bash
# Liveness
curl https://<host>/api/v1/health/liveness

# Readiness (includes DB check)
curl https://<host>/api/v1/health/readiness
```

---

## Secrets & Environment

### Required Secrets

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Database connection string |
| `JWT_SECRET` | Access token signing |
| `JWT_REFRESH_SECRET` | Refresh token signing |
| `CASHFREE_APP_ID` | Cashfree API credentials |
| `CASHFREE_SECRET_KEY` | Cashfree API credentials |
| `CASHFREE_WEBHOOK_SECRET` | Webhook signature verification |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Email delivery |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD_HASH` | Admin console access |

### Environment Files

| File | Purpose |
|------|---------|
| `.env.example` | Template with all variables |
| `.env.production.example` | Production-specific template |
| `.env.staging.example` | Staging-specific template |

### Secrets Rotation

See `docs/ops/SECRETS_ROTATION_SOP.md` for rotation procedures.

---

## Backups

### Scripts

```
scripts/backup/
  mongodump-backup.sh    # Create compressed backup
  restore-mongodump.sh   # Restore from archive
  README.md              # Full documentation
```

### Backup Configuration

| Setting | Env Var | Default |
|---------|---------|---------|
| MongoDB URI | `MONGODB_URI` | Required |
| Backup directory | `BACKUP_DIR` | `/backups` |
| Retention | `BACKUP_RETENTION_DAYS` | 7 |
| S3 upload | `S3_BUCKET` | Optional |

### Backup Commands

```bash
# Manual backup
MONGODB_URI=<uri> ./scripts/backup/mongodump-backup.sh

# Scheduled backup (cron)
0 2 * * * /opt/playconnect/scripts/backup/mongodump-backup.sh >> /var/log/playconnect-backup.log 2>&1

# Restore (requires --confirm flag)
MONGODB_URI=<uri> ./scripts/backup/restore-mongodump.sh /backups/2025-01-01_02-00.tar.gz --confirm
```

### Data Retention Rules

| Entity | Policy |
|--------|--------|
| Academy | Never deleted, disable only |
| User | Never deleted, deactivate via status |
| Student | Soft-delete (status='DELETED') |
| Fee Due | Never deleted, status changes only |
| Attendance | Never deleted, can overwrite same date |
| Audit Log | Immutable — never modified or deleted |
| Subscription | Never deleted, new records for changes |
| Holiday | Only entity that can be truly deleted |

---

## Rollback

### Quick Rollback

```bash
# Docker rollback (previous image tag)
docker compose -f docker-compose.prod.yml down
# Update image tags in .env or compose file to previous version
docker compose -f docker-compose.prod.yml up -d
```

### Full Rollback Procedure

See `docs/release/ROLLBACK_PLAYBOOK.md` for step-by-step rollback including:

- Application rollback (image tag revert)
- Database rollback (mongorestore)
- DNS/traffic switching
- Verification steps

### Rollback Triggers

| Trigger | Threshold |
|---------|-----------|
| Error rate spike | > 5% of requests returning 5xx |
| Health check failure | Readiness returning 503 |
| Payment processing failure | Any Cashfree webhook errors |
| Data corruption | Unexpected audit log entries |
| Performance degradation | P95 latency > 2s |
| Critical security issue | Any active exploit |

---

## On-Call & Incident Response

### Runbooks

| Document | Path |
|----------|------|
| Incident Response Playbook | `docs/ops/INCIDENT_RESPONSE_PLAYBOOK.md` |
| On-Call SOP | `docs/ops/ONCALL_SOP.md` |
| Backup & Restore Runbook | `docs/ops/BACKUP_RESTORE_RUNBOOK.md` |
| Secrets Rotation SOP | `docs/ops/SECRETS_ROTATION_SOP.md` |
| Subscription Enforcement SOP | `docs/ops/SUBSCRIPTION_ENFORCEMENT_SOP.md` |
| Super Admin Actions SOP | `docs/ops/SUPER_ADMIN_ACTIONS_SOP.md` |

### Severity Levels

| Level | Response Time | Examples |
|-------|--------------|---------|
| SEV0 | Immediate | Full outage, data loss |
| SEV1 | 15 minutes | Payment processing down, auth broken |
| SEV2 | 1 hour | Feature degraded, slow queries |
| SEV3 | Next business day | UI issue, non-critical bug |

### Triage Steps

1. Check health endpoints: `/api/v1/health/liveness`, `/api/v1/health/readiness`
2. Check recent deployments
3. Check MongoDB connectivity
4. Review structured logs (filter by `requestId`)
5. Check metrics endpoint for error rate spikes

---

## Smoke Tests

### Post-Deployment Verification

```bash
# Full smoke suite (against staging or production)
STAGING_URL=https://<host> node scripts/rc/smoke-suite.mjs
```

The smoke suite validates:
- API health and readiness
- Admin web login page loads
- Admin API flows (login, dashboard, academies)
- Owner API flows (login, subscription, dashboard, students)

### Manual Verification

```bash
# Health
curl -s https://<host>/api/v1/health/liveness | jq .
curl -s https://<host>/api/v1/health/readiness | jq .

# Swagger (should 404 in production)
curl -s -o /dev/null -w "%{http_code}" https://<host>/api/v1/docs

# Metrics (requires token)
curl -s -H "X-Metrics-Token: <token>" https://<host>/api/v1/metrics
```

---

## CI/CD Workflows

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | Push/PR to main | lint, boundaries, unit tests, E2E tests, hardening, report |
| `release-candidate.yml` | Manual dispatch | CI gates, build images, deploy staging, smoke suite, signoff |

### Hardening Gates (CI)

```bash
npm run hardening:audit      # Dependency vulnerabilities
npm run hardening:licenses   # License compliance
npm run hardening:secrets    # Secrets scan
npm run hardening:sweep      # All three combined
```

---

## Key Operational Commands

```bash
# Run all tests
npm run test:all              # Unit tests
npm run test:e2e:api          # E2E tests

# Architecture validation
npm run validate:boundaries   # Dependency boundary checks
npm run validate:architecture # Architecture rules

# Hardening
npm run hardening:sweep       # Full security sweep

# Handoff artifacts
npm run handoff:generate      # Generate traceability + summary JSON

# OpenAPI
npm run openapi:compare       # Check for breaking API changes
```
