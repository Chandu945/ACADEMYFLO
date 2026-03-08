# Security Runbook

Procedures for handling security events in PlayConnect.

## 1. Handling Suspicious Login Activity

**Indicators:**

- Multiple failed login attempts from the same IP/email
- Login from unusual geography (if tracked)
- Burst of 401 responses in logs

**Response:**

1. Check rate limiting is active (ThrottlerModule configured in API):

   ```bash
   docker compose -f deploy/docker-compose.prod.yml logs api --since 1h | grep "429\|ThrottlerException"
   ```

2. Identify the target account using requestId from logs:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml logs api | grep "requestId.*401" | tail -20
   ```

3. If a specific academy is being targeted, disable their login via super admin:

   ```bash
   curl -X PUT https://playconnect.app/api/v1/admin/academies/{academyId}/login-disabled \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"disabled": true}'
   ```

4. Contact the academy owner through a separate channel to verify the activity

5. Re-enable login after investigation:

   ```bash
   curl -X PUT https://playconnect.app/api/v1/admin/academies/{academyId}/login-disabled \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"disabled": false}'
   ```

## 2. Token Revocation — Force Logout

When a user's session must be immediately invalidated (compromised credentials, fired staff, etc.):

**How it works:** PlayConnect uses a `tokenVersion` field on the User entity. When incremented, all existing JWTs for that user become invalid on next verification.

**Force logout all users of an academy:**

```bash
curl -X POST https://playconnect.app/api/v1/admin/academies/{academyId}/force-logout \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

This increments `tokenVersion` for all users in the academy, immediately invalidating all active access and refresh tokens.

**Verify:** affected users will receive 401 on their next API call and be redirected to login.

## 3. Reset Owner Password (Super Admin)

When an academy owner loses access or credentials are compromised:

```bash
curl -X POST https://playconnect.app/api/v1/admin/academies/{academyId}/reset-password \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

This generates a temporary password. The response contains the new password which must be communicated to the owner through a secure channel. The owner should change it on first login.

**Important:** After resetting, also force-logout the academy to invalidate any compromised sessions.

## 4. Disable Academy Login (Super Admin)

To prevent all logins for an academy (e.g., abuse, non-payment escalation):

```bash
# Disable
curl -X PUT https://playconnect.app/api/v1/admin/academies/{academyId}/login-disabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"disabled": true}'

# Re-enable
curl -X PUT https://playconnect.app/api/v1/admin/academies/{academyId}/login-disabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"disabled": false}'
```

**Note:** This blocks new logins. Existing sessions remain valid until they expire or are force-logged-out.

## 5. Handling Leaked Secret Keys

### JWT Secret Leak

If `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is compromised:

1. **Generate new secrets:**

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Update environment variables** (see [Secrets Rotation SOP](../ops/SECRETS_ROTATION_SOP.md))

3. **Restart the API service** — all existing tokens become invalid immediately

4. **All users will need to re-login** — this is expected and acceptable for a security event

### SMTP Credential Leak

1. Rotate credentials in the email provider dashboard
2. Update `SMTP_USER` and `SMTP_PASS` in `.env.prod`
3. Restart the API service
4. Verify email sending works: check logs for SMTP errors

### Metrics Token Leak

1. Generate a new token
2. Update `METRICS_TOKEN` in `.env.prod`
3. Restart the API service
4. Update any monitoring tools that scrape the metrics endpoint

## 6. Safe Logging Guidelines

**Never log:**

- Passwords or password hashes
- JWT tokens (access or refresh)
- Full email addresses in bulk (individual in error context is acceptable)
- Phone numbers
- API keys or secrets
- Database connection strings with credentials

**Always log:**

- `requestId` (for trace correlation)
- HTTP method and path
- Response status code
- User ID (not email) for authenticated requests
- Academy ID for context
- Error codes and messages (not stack traces in production)

**Implementation:** The API uses `RequestIdInterceptor` to attach a unique `requestId` to every request. Use this for cross-referencing logs during incident investigation.

**Verify no PII leaks:**

```bash
# Check logs for potential PII patterns
docker compose -f deploy/docker-compose.prod.yml logs api --since 1h | \
  grep -iE "password|secret|token.*=|bearer" | head -20
```

If PII is found in logs, rotate the affected credentials and purge the log entries.
