# Secrets Rotation SOP

Procedures for rotating sensitive credentials in Academyflo.

## General Process

1. Generate the new secret
2. Update the environment variable on the server
3. Restart the affected service
4. Verify the service is healthy
5. Update any external systems that use the old secret
6. Document the rotation

## JWT Secret Rotation

**Variables:** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

**Impact:** All existing tokens become invalid. All users must re-login.

**When to rotate:**

- Suspected compromise
- Scheduled rotation (quarterly recommended)
- Personnel change (engineer with secret access leaves)

**Steps:**

1. Generate new secrets:

   ```bash
   echo "JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
   echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
   ```

2. Update on the production server:

   ```bash
   # Edit .env.prod with new values
   vi /opt/academyflo/.env.prod
   ```

3. Restart the API:

   ```bash
   cd /opt/academyflo
   docker compose -f deploy/docker-compose.prod.yml restart api
   ```

4. Verify health:

   ```bash
   curl -s https://academyflo.com/api/v1/health/readiness | jq .
   ```

5. **Expected behavior:** All active sessions are invalidated. Users will see 401 on their next request and will need to re-login. This is the intended security behavior.

## SMTP Credential Rotation

**Variables:** `SMTP_USER`, `SMTP_PASS`

**Impact:** Email sending pauses during rotation. No user-facing impact if done quickly.

**When to rotate:**

- Suspected compromise
- Provider requires rotation
- Changing email provider

**Steps:**

1. Generate new credentials in the email provider dashboard (e.g., SendGrid, SES, Zoho)

2. Update on the production server:

   ```bash
   vi /opt/academyflo/.env.prod
   # Update SMTP_USER and SMTP_PASS
   ```

3. Restart the API:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml restart api
   ```

4. Verify email sending:

   ```bash
   # Trigger a test action that sends email (e.g., password reset)
   # Check logs for SMTP errors
   docker compose -f deploy/docker-compose.prod.yml logs api --since 5m | grep -i smtp
   ```

5. If `EMAIL_DRY_RUN=true` is set, no actual emails are sent — disable it after verification.

## Metrics Token Rotation

**Variable:** `METRICS_TOKEN`

**Impact:** Monitoring tools lose access until updated with the new token.

**When to rotate:**

- Suspected compromise
- Personnel change
- Scheduled rotation

**Steps:**

1. Generate a new token:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Update on the production server:

   ```bash
   vi /opt/academyflo/.env.prod
   # Update METRICS_TOKEN
   ```

3. Restart the API:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml restart api
   ```

4. Update monitoring tools (Prometheus, Grafana, etc.) with the new token in the `X-Metrics-Token` header.

5. Verify:

   ```bash
   curl -H "X-Metrics-Token: $NEW_TOKEN" \
     https://academyflo.com/api/v1/metrics
   ```

## MongoDB Credential Rotation

**Variable:** `MONGODB_URI`

**Impact:** API loses database connectivity during rotation. Plan for brief downtime.

**When to rotate:**

- Suspected compromise
- Atlas requires rotation
- Personnel change

**Steps:**

1. **Take a backup first:**

   ```bash
   MONGODB_URI="$OLD_URI" bash scripts/backup/mongodump-backup.sh
   ```

2. Create new credentials in Atlas (or MongoDB admin):
   - Atlas: Security > Database Access > Edit user > Update password
   - Self-hosted: `db.changeUserPassword("user", "newPassword")`

3. Update the connection URI:

   ```bash
   vi /opt/academyflo/.env.prod
   # Update MONGODB_URI with new credentials
   ```

4. Restart the API:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml restart api
   ```

5. Verify:

   ```bash
   curl -s https://academyflo.com/api/v1/health/readiness | jq .
   # Should show mongodb: "up"
   ```

## BCRYPT_COST Changes

**Variable:** `BCRYPT_COST`

**Impact:** None for existing users. Only affects new password hashes.

**Note:** Changing this does NOT require re-hashing existing passwords. Existing hashes remain valid regardless of the cost factor change.

## Rotation Schedule

| Secret              | Rotation Frequency         | Notes                    |
| ------------------- | -------------------------- | ------------------------ |
| JWT secrets         | Quarterly or on compromise | All sessions invalidated |
| SMTP credentials    | Annually or on compromise  | Brief email pause        |
| Metrics token       | Annually or on compromise  | Update monitoring tools  |
| MongoDB credentials | Annually or on compromise  | Brief downtime required  |

## Post-Rotation Verification Checklist

- [ ] Service starts without errors
- [ ] Health readiness returns 200
- [ ] Smoke check passes (`node scripts/smoke-check.mjs`)
- [ ] Feature spot-check (login, list students, mark attendance)
- [ ] Old secret/credential no longer works
- [ ] Rotation documented in ops log
