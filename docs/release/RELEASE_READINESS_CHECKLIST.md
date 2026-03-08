# Release Readiness Checklist

Go/no-go gates for every PlayConnect release. All items must be checked before deploying to production.

## Go/No-Go Gates

- [ ] **CI green** — all gates pass in `.github/workflows/ci.yml`:
  - Lint (`npm run lint:all`)
  - Typecheck (`npm run typecheck:all`)
  - Unit tests (`npm run test:all`)
  - E2E tests (`npm run test:e2e:api`)
  - Contract checks (`npm run contract:check`)
  - Boundary validation (`npm run validate:boundaries`)
  - Architecture validation (`npm run validate:architecture`)
  - Formatting (`npm run format`)
- [ ] **Coverage >= 80%** — statements, branches, functions, lines across api/admin-web/mobile
- [ ] **Security checks passed**:
  - RBAC matrix verified (no unguarded admin routes)
  - No PII/tokens in log output
  - No sensitive fields leaked in API responses
- [ ] **Performance checks**:
  - Mongo indexes verified in staging (`db.collection.getIndexes()`)
  - No new unindexed query patterns introduced
  - Slow query log baseline reviewed
- [ ] **Smoke checks pass** — `node scripts/smoke-check.mjs` against staging
- [ ] **Backup verified**:
  - Latest Atlas snapshot or mongodump archive exists
  - Restore test scheduled or recently completed
- [ ] **Rollback plan prepared**:
  - Previous image tags recorded (see [Rollback Playbook](ROLLBACK_PLAYBOOK.md))
  - Rollback compose override file ready
- [ ] **DB migration safety**:
  - All MongoDB schema changes are backward compatible (additive only)
  - No field renames or deletions without migration period
  - Collections never dropped (deactivate only, per SRS)

## Pre-Release Steps

1. **Tag the release**

   ```bash
   git tag v1.x.x
   git push origin v1.x.x
   ```

2. **Verify staging deployment** — the `staging-deploy.yml` workflow runs on push to `main`:
   - Check GitHub Actions for green status
   - Review smoke test output in the workflow logs

3. **Record current image tags** (for rollback):

   ```bash
   docker compose -f deploy/docker-compose.prod.yml config | grep image:
   ```

4. **Notify the team** — post in the release channel with:
   - Release version
   - Summary of changes
   - Rollback plan reference

5. **Verify backup** — confirm latest backup exists:

   ```bash
   # Atlas: check Backup > Snapshots in Atlas console
   # Self-hosted:
   ls -lt /backups/ | head -5
   ```

## Release Steps

1. **Push the version tag** — triggers `prod-deploy.yml`:

   ```bash
   git tag v1.x.x
   git push origin v1.x.x
   ```

2. **Monitor the deploy workflow** in GitHub Actions:
   - Build & push images
   - Deploy to production server
   - Post-deploy smoke test

3. **Verify health endpoints**:

   ```bash
   curl https://playconnect.app/api/v1/health/liveness
   curl https://playconnect.app/api/v1/health/readiness
   ```

4. **Run smoke check**:

   ```bash
   API_URL=https://playconnect.app ADMIN_URL=https://admin.playconnect.app \
     node scripts/smoke-check.mjs
   ```

## Post-Release Validation

1. **Functional verification** (within 15 minutes):
   - Admin login works on admin-web
   - Mobile app login works
   - Student list loads
   - Attendance marking works
   - Fee dues page loads

2. **Monitor metrics** (if enabled):

   ```bash
   curl -H "X-Metrics-Token: $METRICS_TOKEN" \
     https://playconnect.app/api/v1/metrics
   ```

3. **Check logs for errors**:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml logs api --since 15m | grep -i error
   ```

4. **Verify no regression** — review requestId traces for any 5xx responses

## Go/No-Go Decision Rubric

| Condition                                       | Decision                         |
| ----------------------------------------------- | -------------------------------- |
| All gates green, smoke passes, backup verified  | **GO**                           |
| One non-critical test flaky, all else green     | **GO** with monitoring           |
| Coverage below 80%                              | **NO-GO** — fix coverage first   |
| E2E tests failing                               | **NO-GO** — critical regression  |
| No recent backup                                | **NO-GO** — create backup first  |
| DB migration not backward compatible            | **NO-GO** — add migration period |
| Security check failed (leaked PII, broken RBAC) | **NO-GO** — patch immediately    |
