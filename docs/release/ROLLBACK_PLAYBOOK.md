# Rollback Playbook

Steps to revert a production deployment to the previous known-good state.

## Prerequisites

- SSH access to the production server
- Previous image tags recorded (from pre-release checklist)
- Access to `deploy/docker-compose.prod.yml`

## Step 1: Identify Last Known Good Tags

Check the deploy history for the previous image tags:

```bash
# On the production server
cd /opt/academyflo

# Check current running images
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml config | grep image:

# Check available image tags
docker image ls | grep academyflo
```

If tags aren't recorded locally, check GitHub Container Registry:

```bash
gh api /orgs/academyflo/packages?package_type=container | jq '.[].name'
```

## Step 2: Roll Back via Docker Compose

Update the `.env.prod` file with the previous image tag:

```bash
# Edit the image tag
sed -i 's/IMAGE_TAG=.*/IMAGE_TAG=v1.x.x-previous/' /opt/academyflo/.env.prod

# Pull and restart with previous images
cd /opt/academyflo
docker compose -f deploy/docker-compose.prod.yml pull
docker compose -f deploy/docker-compose.prod.yml up -d
```

Wait for containers to stabilize (30 seconds):

```bash
docker compose -f deploy/docker-compose.prod.yml ps
```

## Step 3: Verify Smoke Checks

Run the smoke-check script against production:

```bash
API_URL=https://academyflo.com ADMIN_URL=https://admin.academyflo.com \
  node scripts/smoke-check.mjs
```

Manually verify:

```bash
curl -s https://academyflo.com/api/v1/health/liveness | jq .
curl -s https://academyflo.com/api/v1/health/readiness | jq .
```

Expected: both return `200` with `status: "ok"`.

## Step 4: Monitor for Stabilization

Watch logs for errors in the first 10 minutes:

```bash
docker compose -f deploy/docker-compose.prod.yml logs -f api --since 1m
```

Check for:

- No repeated 5xx errors
- No DB connection failures
- No JWT verification errors
- Health readiness returning 200

If metrics are enabled:

```bash
curl -H "X-Metrics-Token: $METRICS_TOKEN" \
  https://academyflo.com/api/v1/metrics
```

## Step 5: Communicate

Post an incident note with:

1. **What happened** — brief description of the issue that triggered rollback
2. **When** — timestamp of rollback
3. **Current state** — rolled back to version `v1.x.x-previous`
4. **Impact** — what users experienced
5. **Next steps** — investigation plan, ETA for fix

Template:

```
[ROLLBACK] Academyflo Production — {date}

Issue: {brief description}
Rolled back to: v{previous version}
Duration of impact: {time}
User impact: {description}
Next steps: {plan}
```

## Step 6: Post-Rollback

1. **Create an incident ticket** with root cause analysis
2. **Fix the issue** on a branch
3. **Run through the full release readiness checklist** before re-deploying
4. **Verify the fix in staging** before promoting to production

## Emergency: Database Rollback

If the broken release included a data migration that corrupted data:

1. **Stop the API** to prevent further writes:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml stop api
   ```

2. **Restore from backup** (see [Backup & Restore Runbook](../ops/BACKUP_RESTORE_RUNBOOK.md)):

   ```bash
   MONGODB_URI="$PROD_MONGODB_URI" \
   BACKUP_FILE="/backups/latest.tar.gz" \
     bash scripts/backup/restore-mongodump.sh --confirm
   ```

3. **Roll back the application** (Step 2 above)
4. **Restart the API**:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml up -d api
   ```

5. **Verify data integrity** by spot-checking key collections
