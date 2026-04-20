# Incident Response Playbook

Structured process for handling production incidents in Academyflo.

## Severity Levels

| Level    | Definition                                    | Example                                               | Response Time         |
| -------- | --------------------------------------------- | ----------------------------------------------------- | --------------------- |
| **SEV0** | Complete service outage, data loss risk       | API down, DB unreachable, data corruption             | Immediate (all hands) |
| **SEV1** | Major feature broken, significant user impact | Login broken, payments failing, attendance not saving | Within 30 minutes     |
| **SEV2** | Minor feature degraded, workaround available  | Reports slow, admin panel partially broken            | Within 2 hours        |
| **SEV3** | Cosmetic or minor issue, no user impact       | Log formatting issue, non-critical metric missing     | Next business day     |

## Triage Steps

### Step 1: Check Health Endpoints

```bash
# Liveness — is the service running?
curl -s https://academyflo.com/api/v1/health/liveness | jq .

# Readiness — is the service healthy (including DB)?
curl -s https://academyflo.com/api/v1/health/readiness | jq .
```

| Result                      | Interpretation                                      |
| --------------------------- | --------------------------------------------------- |
| Liveness 200, Readiness 200 | Service and DB healthy — issue is application-level |
| Liveness 200, Readiness 503 | Service running but DB is down                      |
| Liveness timeout            | Service is completely down                          |
| Connection refused          | Container not running or nginx down                 |

### Step 2: Check Recent Deploy

```bash
# Was there a recent deployment?
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml logs api --since 30m | head -20

# Check deploy workflow in GitHub Actions
gh run list --workflow=prod-deploy.yml --limit=5
```

If the issue started after a deploy → proceed to [Rollback Playbook](../release/ROLLBACK_PLAYBOOK.md).

### Step 3: Check DB Connectivity

```bash
# Check if MongoDB is reachable
docker compose -f deploy/docker-compose.prod.yml exec api \
  node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(()=>console.log('OK')).catch(e=>console.error(e))"

# Check MongoDB connection pool
docker compose -f deploy/docker-compose.prod.yml logs api | grep -i "mongo\|connection" | tail -20
```

### Step 4: Check Logs with requestId

```bash
# Recent errors
docker compose -f deploy/docker-compose.prod.yml logs api --since 15m | grep -i "error\|exception" | tail -30

# Trace a specific request
docker compose -f deploy/docker-compose.prod.yml logs api | grep "requestId.*{id}"

# Count error rates
docker compose -f deploy/docker-compose.prod.yml logs api --since 1h | \
  grep -oP '"statusCode":\d+' | sort | uniq -c | sort -rn
```

### Step 5: Check Metrics (if enabled)

```bash
curl -H "X-Metrics-Token: $METRICS_TOKEN" \
  https://academyflo.com/api/v1/metrics
```

Look for:

- Elevated HTTP 5xx counts
- High response time percentiles
- Connection pool exhaustion
- Memory pressure

## Containment

### Disable Admin Actions

If admin actions are causing the issue:

```bash
# The admin panel can be taken offline by stopping admin-web
docker compose -f deploy/docker-compose.prod.yml stop admin-web
```

### Block Abusive Traffic

If a specific source is causing excessive load:

1. Rate limiting is handled by NestJS ThrottlerModule (configured globally)
2. For IP-level blocking, update nginx config:

   ```nginx
   # In deploy/nginx/sites-enabled/academyflo.conf
   deny 1.2.3.4;
   ```

   Then reload:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml exec nginx nginx -s reload
   ```

### Emergency API Restart

```bash
docker compose -f deploy/docker-compose.prod.yml restart api
```

### Emergency Full Stack Restart

```bash
docker compose -f deploy/docker-compose.prod.yml down
docker compose -f deploy/docker-compose.prod.yml up -d
```

## Communication

### Internal Updates

Post to the incident channel at each stage:

```
[SEV{level}] {brief description}
Status: {investigating / identified / mitigating / resolved}
Impact: {what users are experiencing}
ETA: {when we expect resolution}
```

### Status Updates Cadence

| Severity | Update Frequency |
| -------- | ---------------- |
| SEV0     | Every 15 minutes |
| SEV1     | Every 30 minutes |
| SEV2     | Every 2 hours    |
| SEV3     | On resolution    |

### Resolution Template

```
[RESOLVED] {incident title} — {date}

Duration: {start} to {end} ({total time})
Impact: {description of user impact}
Root cause: {what went wrong}
Fix: {what was done}
Prevention: {what will prevent recurrence}
```

## Post-Incident

1. **Create a post-mortem** within 48 hours for SEV0/SEV1
2. **Document:**
   - Timeline of events
   - Root cause analysis
   - What went well
   - What could be improved
   - Action items with owners and deadlines
3. **Update runbooks** if the incident revealed a gap in documentation
4. **Update monitoring** if the incident could have been detected earlier
