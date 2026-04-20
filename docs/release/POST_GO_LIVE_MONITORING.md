# Post-Go-Live Monitoring

Structured monitoring checklist for the first hours and days after production deployment.

---

## First 2 Hours

Continuous monitoring by the on-call engineer immediately after cutover.

### Health Checks (every 5 minutes)

- [ ] `GET /api/v1/health/liveness` returns 200
- [ ] `GET /api/v1/health/readiness` returns 200
- [ ] Admin web login page loads (`https://admin.academyflo.com/login`)

### Error Monitoring

```bash
# Watch API logs for errors (real-time)
docker compose -f deploy/docker-compose.prod.yml logs -f api --since 1m | grep -i error

# Check for 5xx responses
docker compose -f deploy/docker-compose.prod.yml logs api --since 2h | grep -c '"statusCode":5'
```

- [ ] Zero 5xx errors (or < 0.1% of total requests)
- [ ] No repeated authentication failures
- [ ] No database connection errors
- [ ] No unhandled promise rejections

### Functional Verification

- [ ] Admin login works (super admin)
- [ ] Owner login works (smoke owner account)
- [ ] `GET /api/v1/subscription/me` returns valid status
- [ ] `GET /api/v1/students?page=1&pageSize=20` returns data
- [ ] `GET /api/v1/dashboard/owner?kpiPreset=THIS_MONTH` returns KPIs

### Resource Monitoring

```bash
# Container resource usage
docker stats --no-stream

# Disk usage
df -h /
```

- [ ] API container memory < 512MB (within resource limits)
- [ ] Admin-web container memory < 512MB
- [ ] Disk usage < 80%

### Cron Jobs (if deployment window includes scheduled run)

- [ ] Check for `jobRunStart` / `jobRunEnd` events in logs
- [ ] No `jobSkippedLockNotAcquired` errors (expected on single instance)
- [ ] No `externalCallFailed` events

---

## Day 1 Checklist (End of Business)

Review at the end of the first business day.

### Error Summary

```bash
# Count errors in the last 24 hours
docker compose -f deploy/docker-compose.prod.yml logs api --since 24h | grep -c '"level":"error"'
```

- [ ] Error rate acceptable (< 0.1% of requests)
- [ ] No recurring error patterns (check for repeated messages)
- [ ] No data integrity issues reported

### Feature Verification

- [ ] Fee dues are visible for active students
- [ ] Attendance marking works end-to-end (owner app)
- [ ] Subscription status displays correctly for all states
- [ ] Payment flow reachable (Cashfree checkout button visible for eligible owners)

### External Integrations

- [ ] SMTP emails sending successfully (check provider dashboard or logs)
- [ ] Cashfree webhook endpoint responding (check for `externalCallStart` events)
- [ ] No `externalCallTimeout` events in logs

### Cron Job Execution (if applicable)

- [ ] Monthly dues cron ran successfully (check `Monthly dues cron completed` in logs)
- [ ] Fee reminders cron ran (if `FEE_REMINDER_ENABLED=true`)
- [ ] Tier recomputation cron ran (if `SUBSCRIPTION_TIER_CRON_ENABLED=true`)
- [ ] Job locks functioning — only one instance per job executed

### Backup Verification

- [ ] Daily backup ran successfully (Atlas snapshot or mongodump)
- [ ] Backup file size is reasonable (not zero, not unexpectedly small)

---

## Week 1 Checklist

Review at the end of the first week in production.

### Stability

- [ ] No unplanned restarts or crashes
- [ ] Memory usage trend stable (no slow leaks)
- [ ] Response times stable — p95 < 500ms for primary endpoints
- [ ] No disk space growth concerns

### Business Metrics

- [ ] Active academies count matches expectations
- [ ] Student enrollment flow working (new students can be added)
- [ ] Fee collection visible in owner dashboards
- [ ] No user-reported issues in support channels

### Security

- [ ] No unauthorized access attempts in logs
- [ ] No failed webhook signature verifications (legitimate)
- [ ] OTP/password reset flow working
- [ ] Rate limiting functioning (no abuse detected)

### Cron Jobs (Full Cycle)

- [ ] All 3 cron jobs have executed at least once successfully:
  - Monthly dues engine (daily at 00:10 IST)
  - Fee reminders (daily at 09:00 IST, if enabled)
  - Tier recomputation (daily at 00:10 IST, if enabled)
- [ ] No duplicate executions across instances (verify via job lock logs)

### Backup Cycle

- [ ] 7 daily backups exist
- [ ] Spot-check backup integrity (restore a recent backup to staging)

---

## Thresholds and Escalation

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| 5xx error rate | > 1% for 5 min | > 5% for 5 min | Page on-call, consider rollback |
| `/ready` failures | 1 failure | 3 failures in 5 min | Investigate, rollback if persistent |
| API response time (p95) | > 1s | > 3s | Investigate slow queries |
| Container restarts | 1 restart | 3 restarts in 1 hour | Investigate OOM or crash loop |
| Disk usage | > 80% | > 90% | Clean logs, expand storage |
| Webhook failures | > 5 in 1 hour | > 20 in 1 hour | Check Cashfree status, verify secret |
| Email send failures | > 10% | > 50% | Check SMTP provider, verify creds |
| Backup missing | 1 missed day | 2 consecutive days | Fix backup schedule immediately |

### Escalation Path

1. **On-call engineer** — first responder, monitors and triages
2. **Engineering lead** — escalate if rollback needed or data issue found
3. **Product owner** — notify if user-facing impact exceeds 15 minutes
4. **Incident process** — follow [Incident Response Playbook](../ops/INCIDENT_RESPONSE_PLAYBOOK.md)

---

## Cross-References

- [Production Cutover Plan](PRODUCTION_CUTOVER_PLAN.md) — deployment steps and rollback
- [Rollback Playbook](ROLLBACK_PLAYBOOK.md) — step-by-step rollback procedure
- [Incident Response Playbook](../ops/INCIDENT_RESPONSE_PLAYBOOK.md) — severity levels and triage
- [On-Call SOP](../ops/ONCALL_SOP.md) — shift handoff and tooling
