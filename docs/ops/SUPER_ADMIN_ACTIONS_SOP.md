# Super Admin Actions SOP

Procedures for super admin operations in Academyflo. All actions require `SUPER_ADMIN` role authentication.

## Authentication

Super admins authenticate via the admin-web panel (`/admin/auth`) or directly via API:

```bash
# Login as super admin
ADMIN_TOKEN=$(curl -s -X POST https://academyflo.com/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@academyflo.com", "password": "..."}' | jq -r '.accessToken')
```

All subsequent commands use this token in the `Authorization: Bearer` header.

## 1. Disable Academy Login

**When to use:** Suspected compromise, abuse, policy violation, or owner request.

**Effect:** Blocks new logins for all users (OWNER + STAFF) of the academy. Existing active sessions continue until they expire or are force-logged-out.

```bash
# Disable login
curl -X PUT https://academyflo.com/api/v1/admin/academies/{academyId}/login-disabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"disabled": true}'

# Re-enable login
curl -X PUT https://academyflo.com/api/v1/admin/academies/{academyId}/login-disabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"disabled": false}'
```

**Best practice:** Combine with force-logout to immediately revoke all access:

```bash
# Disable login + force logout
curl -X PUT .../login-disabled -d '{"disabled": true}' ...
curl -X POST .../force-logout ...
```

## 2. Force Logout Academy Users

**When to use:** Credential compromise, post-password-reset, security incident.

**Effect:** Increments `tokenVersion` for all users in the academy. All existing JWTs (access + refresh) become invalid immediately. Users must re-login.

```bash
curl -X POST https://academyflo.com/api/v1/admin/academies/{academyId}/force-logout \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Verification:** After force-logout, any API call from affected users returns 401.

## 3. Reset Owner Password

**When to use:** Owner forgot password, compromised credentials, owner locked out.

**Effect:** Generates a new temporary password for the academy owner. The old password is immediately invalidated.

```bash
curl -X POST https://academyflo.com/api/v1/admin/academies/{academyId}/reset-password \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response contains the temporary password.** Communicate it to the owner through a secure channel (not email if email is compromised).

**Post-reset steps:**

1. Force-logout the academy to invalidate any compromised sessions
2. Communicate the temporary password to the owner
3. Advise the owner to change the password immediately after login

## 4. Manual Subscription Activation

**When to use:** Payment confirmed outside the system, support override, trial extension.

```bash
curl -X PUT https://academyflo.com/api/v1/admin/academies/{academyId}/subscription \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paidStartAt": "2026-03-01T00:00:00Z",
    "paidEndAt": "2026-04-01T00:00:00Z",
    "tierKey": "TIER_0_50",
    "paymentReference": "UPI-TXN-ABC123",
    "manualNotes": "Activated per support ticket #789 - UPI payment confirmed"
  }'
```

**Always include:**

- `paymentReference` — the transaction ID for tracking
- `manualNotes` — the reason and support ticket number

See [Subscription Enforcement SOP](SUBSCRIPTION_ENFORCEMENT_SOP.md) for detailed state management.

## 5. Deactivate Subscription

**When to use:** Refund processing, policy violation, owner request.

```bash
curl -X POST https://academyflo.com/api/v1/admin/academies/{academyId}/deactivate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "manualNotes": "Deactivated - refund processed per ticket #456"
  }'
```

## 6. View Academy Details

Before taking any action, review the academy's current state:

```bash
# Academy details (subscription, metrics, owner info)
curl https://academyflo.com/api/v1/admin/academies/{academyId} \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Audit logs for the academy
curl "https://academyflo.com/api/v1/admin/academies/{academyId}/audit-logs?page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

## 7. List/Search Academies

```bash
# List all academies (paginated)
curl "https://academyflo.com/api/v1/admin/academies?page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Search by name
curl "https://academyflo.com/api/v1/admin/academies?search=academy+name&page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Filter by status
curl "https://academyflo.com/api/v1/admin/academies?status=BLOCKED&page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

## Action Audit Trail

All super admin actions are recorded in the audit log with:

- **Actor:** The super admin user ID
- **Action:** The operation performed
- **Entity:** The affected academy/user
- **Timestamp:** When the action occurred
- **Details:** Previous and new values

Review audit logs regularly to ensure accountability:

```bash
curl "https://academyflo.com/api/v1/admin/academies/{academyId}/audit-logs?action=FORCE_LOGOUT&page=1&pageSize=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

## Safety Checklist

Before any destructive admin action:

- [ ] Verified the correct academy ID (check academy name and owner)
- [ ] Documented the reason (support ticket number)
- [ ] Notified the team if the action affects multiple academies
- [ ] Taken a backup if the action is irreversible (see [Backup Runbook](BACKUP_RESTORE_RUNBOOK.md))
- [ ] Included `manualNotes` in the API call for audit trail
