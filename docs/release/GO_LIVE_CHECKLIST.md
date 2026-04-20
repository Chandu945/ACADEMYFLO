# Go-Live Checklist

One-page go/no-go checklist for production deployment. Every item must be checked before initiating the cutover.

---

## Infrastructure

- [ ] Production server provisioned and accessible via SSH
- [ ] Docker + Docker Compose installed and operational
- [ ] nginx reverse proxy configured with TLS certificates
- [ ] DNS records point to production server (`academyflo.com`, `admin.academyflo.com`)
- [ ] MongoDB Atlas cluster provisioned (or self-hosted replica set running)
- [ ] Container registry accessible (GHCR or DockerHub)
- [ ] Firewall rules allow inbound 80/443 and outbound SMTP + Cashfree API

## Secrets

- [ ] `JWT_ACCESS_SECRET` — unique, high-entropy, not reused from staging
- [ ] `JWT_REFRESH_SECRET` — unique, high-entropy, not reused from staging
- [ ] `BCRYPT_COST` — set to 12 (production default)
- [ ] `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` — production mail service configured
- [ ] `SMTP_FROM` — production sender address (`noreply@academyflo.com`)
- [ ] `EMAIL_DRY_RUN=false` — real emails enabled
- [ ] `CASHFREE_CLIENT_ID` / `CASHFREE_CLIENT_SECRET` — production keys (not sandbox)
- [ ] `CASHFREE_WEBHOOK_SECRET` — production webhook secret
- [ ] `CASHFREE_BASE_URL=https://api.cashfree.com/pg` — production URL
- [ ] `SWAGGER_ENABLED=false` — docs disabled in production
- [ ] `METRICS_TOKEN` — set if metrics endpoint is enabled
- [ ] `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — strong production credentials
- [ ] All secrets stored in `deploy/.env.prod` (never committed to git)

## Backup

- [ ] MongoDB backup strategy active:
  - Atlas: daily snapshots enabled (verify in Atlas console)
  - Self-hosted: `scripts/backup/mongodump-backup.sh` scheduled via cron
- [ ] Latest backup snapshot exists — timestamp: `________________`
- [ ] Restore test completed in staging — date: `________________`
- [ ] Backup retention policy configured (minimum 7 days)

## Release Candidate

- [ ] RC workflow completed successfully (`.github/workflows/release-candidate.yml`)
- [ ] RC sign-off bundle reviewed and approved ([RC Sign-off Checklist](RC_SIGNOFF_CHECKLIST.md))
- [ ] Docker image digests recorded — tag: `________________`
- [ ] No breaking API changes (OpenAPI compare passed)

## Monitoring

- [ ] Structured logging active (JSON format with `requestId`)
- [ ] Health endpoints accessible:
  - `GET /api/v1/health/liveness`
  - `GET /api/v1/health/readiness`
- [ ] Log aggregation configured (or `docker compose logs` access verified)
- [ ] Error alerting configured (or manual monitoring plan in place)
- [ ] [Post-Go-Live Monitoring](POST_GO_LIVE_MONITORING.md) plan reviewed

## Smoke Tests

- [ ] Staging smoke suite passed — `node scripts/rc/smoke-suite.mjs`
- [ ] Smoke-check script ready for production — `scripts/smoke-check.mjs`
- [ ] Test accounts available:
  - Super admin credentials for admin-web
  - Smoke owner credentials for owner API flows

## Stakeholder Sign-off

- [ ] Product owner approved release
- [ ] Engineering lead approved release
- [ ] Deployment strategy chosen: ☐ Blue/Green ☐ Rolling
- [ ] Rollback plan reviewed ([Rollback Playbook](ROLLBACK_PLAYBOOK.md))
- [ ] On-call engineer identified for post-deploy monitoring
- [ ] Team notified of deployment window

---

## Decision

| Gate | Status |
|------|--------|
| Infrastructure ready | ☐ |
| Secrets provisioned | ☐ |
| Backup verified | ☐ |
| RC approved | ☐ |
| Monitoring ready | ☐ |
| Smoke tests pass | ☐ |
| Stakeholders signed off | ☐ |

**Verdict:** ☐ GO / ☐ NO-GO

**Deployment initiated by:** ________________ **Date:** ________________

---

Proceed to [Production Cutover Plan](PRODUCTION_CUTOVER_PLAN.md) for deployment steps.
