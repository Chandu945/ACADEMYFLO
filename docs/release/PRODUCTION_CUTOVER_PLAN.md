# Production Cutover Plan

Detailed, actionable plan for deploying Academyflo to production with zero-downtime strategies, validation steps, and rollback procedures.

---

## A) Pre-Go-Live Prerequisites

All items must be verified before initiating the cutover.

- [ ] **RC sign-off bundle reviewed** — `artifacts/signoff-bundle/` from [RC Sign-off Checklist](RC_SIGNOFF_CHECKLIST.md)
- [ ] **CI green** — all gates passed in `.github/workflows/ci.yml`
- [ ] **Coverage >= 80%** — statements, branches, functions, lines across api/admin-web/mobile
- [ ] **No critical vulnerabilities** — `artifacts/dependency-audit.json` clean
- [ ] **Secrets scan clean** — `artifacts/secrets-scan.json` zero findings
- [ ] **License compliance** — `artifacts/licenses.json` no disallowed licenses
- [ ] **OpenAPI compare passed** — no breaking changes (`npm run openapi:compare`)
- [ ] **Staging smoke suite passed** — `artifacts/smoke-results.json` all checks passed
- [ ] **Production secrets provisioned**:
  - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — unique, high-entropy
  - `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` — production mail service
  - `CASHFREE_CLIENT_ID` / `CASHFREE_CLIENT_SECRET` — production (not sandbox)
  - `CASHFREE_WEBHOOK_SECRET` — production webhook secret
  - `CASHFREE_BASE_URL` — `https://api.cashfree.com/pg` (production URL)
  - `METRICS_TOKEN` — if metrics endpoint enabled
  - `SWAGGER_ENABLED=false` — disabled in production
  - `EMAIL_DRY_RUN=false` — real emails in production
- [ ] **Backups verified**:
  - Atlas: daily snapshot present (record timestamp: `________`)
  - Self-hosted: `mongodump` archive exists at known path
  - Restore test completed in staging within last 7 days (date: `________`)
- [ ] **DNS configured** — `academyflo.com` and `admin.academyflo.com` point to production server
- [ ] **TLS certificates** — valid cert + key at configured paths for nginx
- [ ] **Stakeholder sign-off** — product owner + engineering lead approved

---

## B) Cutover Strategy Options

### Option 1 — Blue/Green (Recommended)

Two identical stacks behind nginx. Only one is active at any time.

**Infrastructure layout:**

```
                    ┌─────────────┐
   internet ───────►│   nginx     │
                    │ (upstream)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
     ┌────────────────┐       ┌────────────────┐
     │  BLUE stack    │       │  GREEN stack   │
     │  api + admin   │       │  api + admin   │
     │  (active)      │       │  (inactive)    │
     └────────────────┘       └────────────────┘
              │                         │
              └────────┬────────────────┘
                       ▼
                ┌─────────────┐
                │  MongoDB    │
                │  (shared)   │
                └─────────────┘
```

**Steps:**

1. **Identify active/inactive stacks**

   ```bash
   # On production server
   cat /opt/academyflo/active-stack  # outputs "blue" or "green"
   ```

2. **Deploy new version to INACTIVE stack**

   ```bash
   INACTIVE=green  # or blue, whichever is inactive
   cd /opt/academyflo

   # Set new image tag
   export IMAGE_TAG=rc-abc1234  # from RC sign-off bundle
   export DOCKER_REGISTRY=ghcr.io/academyflo

   docker compose -f deploy/docker-compose.${INACTIVE}.yml pull
   docker compose -f deploy/docker-compose.${INACTIVE}.yml up -d
   ```

3. **Wait for readiness**

   ```bash
   # Poll until ready (max 60s)
   for i in $(seq 1 12); do
     STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/api/v1/health/readiness)
     [ "$STATUS" = "200" ] && echo "Ready!" && break
     echo "Waiting... ($i/12)"
     sleep 5
   done
   ```

4. **Run smoke check against inactive stack**

   ```bash
   STAGING_API_URL=http://localhost:3011 node scripts/rc/smoke-suite.mjs
   ```

5. **Switch nginx upstream**

   ```bash
   # Update nginx config to point to inactive stack
   sed -i "s/upstream_active/${INACTIVE}/" /etc/nginx/conf.d/academyflo.conf
   nginx -t && nginx -s reload

   # Record new active stack
   echo "$INACTIVE" > /opt/academyflo/active-stack
   ```

6. **Monitor for 15–30 minutes**

   ```bash
   # Watch logs
   docker compose -f deploy/docker-compose.${INACTIVE}.yml logs -f api --since 1m

   # Check error rate
   curl -s https://academyflo.com/api/v1/health/readiness | jq .
   ```

7. **Keep old stack running** for quick rollback (minimum 2 hours, ideally 24 hours)

**Rollback (Blue/Green):**

```bash
# Switch back to previous active stack
PREVIOUS=blue  # whichever was active before
sed -i "s/upstream_active/${PREVIOUS}/" /etc/nginx/conf.d/academyflo.conf
nginx -t && nginx -s reload
echo "$PREVIOUS" > /opt/academyflo/active-stack
```

Time to rollback: **< 30 seconds** (nginx reload only).

---

### Option 2 — Rolling Upgrade (Single Stack)

Update images and restart services sequentially within the same compose stack.

**Steps:**

1. **Record current image tags** (for rollback)

   ```bash
   cd /opt/academyflo
   docker compose -f deploy/docker-compose.prod.yml config | grep image: > /tmp/previous-images.txt
   cat /tmp/previous-images.txt
   ```

2. **Pull new images**

   ```bash
   export IMAGE_TAG=rc-abc1234
   export DOCKER_REGISTRY=ghcr.io/academyflo
   docker compose -f deploy/docker-compose.prod.yml pull
   ```

3. **Restart admin-web first** (stateless, lower risk)

   ```bash
   docker compose -f deploy/docker-compose.prod.yml up -d --no-deps admin-web
   # Wait for health
   sleep 10
   curl -s http://localhost:3002/ | head -1
   ```

4. **Restart API**

   ```bash
   docker compose -f deploy/docker-compose.prod.yml up -d --no-deps api
   # Wait for readiness
   for i in $(seq 1 12); do
     STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health/readiness)
     [ "$STATUS" = "200" ] && echo "API ready!" && break
     sleep 5
   done
   ```

   > **Note:** With a single API replica, there is a brief downtime window (typically 5–15 seconds) during restart. The graceful shutdown handler (20s grace period) ensures in-flight requests complete before the old process exits.

5. **Run smoke check**

   ```bash
   API_URL=https://academyflo.com ADMIN_URL=https://admin.academyflo.com \
     node scripts/smoke-check.mjs
   ```

**Rollback (Rolling):**

```bash
# Restore previous image tag
export IMAGE_TAG=<previous-tag-from-step-1>
docker compose -f deploy/docker-compose.prod.yml pull
docker compose -f deploy/docker-compose.prod.yml up -d
```

Time to rollback: **1–3 minutes** (pull + restart).

---

## C) Validation Steps

After deployment (either strategy), run all validation steps sequentially:

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 1 | API liveness | `curl https://academyflo.com/api/v1/health/liveness` | 200 |
| 2 | API readiness | `curl https://academyflo.com/api/v1/health/readiness` | 200 |
| 3 | Admin web loads | `curl -s -o /dev/null -w "%{http_code}" https://admin.academyflo.com/login` | 200 |
| 4 | Admin login | Login via admin-web with super admin credentials | Dashboard loads |
| 5 | Owner login | `POST /api/v1/auth/login` with smoke owner credentials | 200 + token |
| 6 | Subscription status | `GET /api/v1/subscription/me` with owner token | 200 + valid status |
| 7 | Dashboard KPIs | `GET /api/v1/dashboard/owner?kpiPreset=THIS_MONTH` | 200 |
| 8 | Students list | `GET /api/v1/students?page=1&pageSize=20` | 200 + items array |
| 9 | Cashfree webhook reachable | `curl -s -o /dev/null -w "%{http_code}" -X POST https://academyflo.com/api/v1/subscription-payments/cashfree/webhook` | 400 (missing headers, not 404) |
| 10 | Full smoke suite | `node scripts/rc/smoke-suite.mjs` | All checks pass |

**Do NOT test with real Cashfree payments** unless a planned test transaction is coordinated.

---

## D) Rollback Plan

### Triggers — Initiate rollback if ANY of:

| Trigger | Threshold | Detection |
|---------|-----------|-----------|
| 5xx error rate | > 5% of requests in 5-minute window | API logs, metrics endpoint |
| `/ready` flapping | Returns non-200 more than 3 times in 5 minutes | Health check monitoring |
| Auth broken | Login fails for valid credentials | Manual test or smoke suite |
| Subscription broken | `/subscription/me` returns errors | Smoke suite |
| Cron jobs failing | Job lock errors or repeated failures in logs | Structured log monitoring |
| Data corruption | Unexpected data state in key collections | Manual investigation |

### Rollback procedure

1. **Blue/Green:** Switch nginx upstream back (< 30 seconds)
2. **Rolling:** Redeploy previous image tags (1–3 minutes)
3. **Verify:** Run `node scripts/smoke-check.mjs` against production
4. **Communicate:** Follow [Rollback Playbook](ROLLBACK_PLAYBOOK.md) step 5 (notify stakeholders)
5. **Investigate:** Create incident ticket, diagnose root cause

### Data rollback (last resort)

Only if a release introduced data corruption:

1. Stop API to prevent further writes
2. Restore from backup (see [Backup & Restore Runbook](../ops/BACKUP_RESTORE_RUNBOOK.md))
3. Roll back application images
4. Restart API
5. Verify data integrity

---

## E) Post-Go-Live Monitoring

See [Post-Go-Live Monitoring](POST_GO_LIVE_MONITORING.md) for detailed checklist.

Key metrics to watch immediately:

- **Error rate** — API 5xx responses (target: < 0.1%)
- **Response times** — p95 < 500ms for list/dashboard endpoints
- **Webhook failures** — Cashfree webhook signature errors
- **Email send failures** — SMTP errors in structured logs
- **Cron job execution** — `jobRunStart` / `jobRunEnd` events in logs
- **Memory/CPU** — container resource usage stable

Use `X-Request-Id` header to trace any reported issues through logs.

---

## Cross-References

- [Release Readiness Checklist](RELEASE_READINESS_CHECKLIST.md)
- [RC Sign-off Checklist](RC_SIGNOFF_CHECKLIST.md)
- [Rollback Playbook](ROLLBACK_PLAYBOOK.md)
- [Post-Go-Live Monitoring](POST_GO_LIVE_MONITORING.md)
- [Go-Live Checklist](GO_LIVE_CHECKLIST.md)
- [Incident Response Playbook](../ops/INCIDENT_RESPONSE_PLAYBOOK.md)
- [Backup & Restore Runbook](../ops/BACKUP_RESTORE_RUNBOOK.md)
