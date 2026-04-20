# Subscription Enforcement SOP

How Academyflo subscription states work and how to handle support scenarios.

## Subscription States

| Status          | Meaning                          | App Access | API Behavior                               |
| --------------- | -------------------------------- | ---------- | ------------------------------------------ |
| `TRIAL`         | 30-day free trial                | Allowed    | Full access                                |
| `ACTIVE_PAID`   | Paid subscription active         | Allowed    | Full access                                |
| `EXPIRED_GRACE` | Payment overdue, in grace period | Allowed    | Full access (grace)                        |
| `BLOCKED`       | Trial/grace expired, no payment  | Blocked    | `SubscriptionEnforcementGuard` returns 403 |
| `DISABLED`      | Manually disabled by super admin | Blocked    | `SubscriptionEnforcementGuard` returns 403 |

## State Transitions

```
Owner Signup → TRIAL (30 days)
                ↓
         [trial expires]
                ↓
        EXPIRED_GRACE (7 days)
                ↓
         [grace expires]
                ↓
            BLOCKED ←────── [payment lapses after ACTIVE_PAID]
                ↓
         [admin activates or owner pays]
                ↓
          ACTIVE_PAID

Super admin can set DISABLED at any time.
Super admin can set any status via manual subscription activation.
```

## How the Guard Works

The `SubscriptionEnforcementGuard` (registered as a global APP_GUARD) runs on every authenticated request:

1. If no user on request (unauthenticated) → passes through (auth guard handles separately)
2. If user role is `SUPER_ADMIN` → passes through (admin is never blocked)
3. Fetches the academy's subscription status
4. If `canAccessApp` is `false` → returns `403 Forbidden`
5. The `/subscription` endpoint is always accessible (so blocked users can check their status)

## Tier System

| Tier Key        | Student Range   | Price (INR) |
| --------------- | --------------- | ----------- |
| `TIER_0_50`     | 0-50 students   | 299/month   |
| `TIER_51_100`   | 51-100 students | 499/month   |
| `TIER_101_PLUS` | 101+ students   | 699/month   |

### Pending Tier Changes

When an academy's active student count crosses a tier boundary:

- The system records a `pendingTierChange` with `tierKey` and `effectiveAt`
- The change takes effect at the next billing cycle
- Until then, the academy continues on the current tier

## Super Admin: Manual Subscription Activation

When a user contacts support about a blocked subscription and payment is confirmed:

```bash
curl -X PUT https://academyflo.com/api/v1/admin/academies/{academyId}/subscription \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paidStartAt": "2026-03-01T00:00:00Z",
    "paidEndAt": "2026-04-01T00:00:00Z",
    "tierKey": "TIER_0_50",
    "paymentReference": "TXN-12345",
    "manualNotes": "Manually activated after payment confirmation via support ticket #789"
  }'
```

**Fields:**

| Field              | Required | Description                                    |
| ------------------ | -------- | ---------------------------------------------- |
| `paidStartAt`      | Yes      | Start of paid period (ISO 8601)                |
| `paidEndAt`        | Yes      | End of paid period (ISO 8601)                  |
| `tierKey`          | Yes      | `TIER_0_50`, `TIER_51_100`, or `TIER_101_PLUS` |
| `paymentReference` | No       | Transaction ID or reference number             |
| `manualNotes`      | No       | Reason for manual activation (recommended)     |

**Always include `manualNotes`** for audit trail purposes.

## Super Admin: Deactivate Subscription

To manually block an academy (e.g., abuse, refund):

```bash
curl -X POST https://academyflo.com/api/v1/admin/academies/{academyId}/deactivate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "manualNotes": "Deactivated due to refund request - support ticket #456"
  }'
```

## Handling Blocked Users Contacting Support

### Decision Tree

```
User reports "can't access app"
  │
  ├─ Check subscription status in admin panel
  │   │
  │   ├─ Status is BLOCKED
  │   │   ├─ Trial expired → Inform user about pricing, assist with payment
  │   │   ├─ Payment lapsed → Verify payment, manually activate if confirmed
  │   │   └─ Unknown → Check audit logs for reason
  │   │
  │   ├─ Status is DISABLED
  │   │   └─ Check audit logs for who disabled and why → Escalate to admin
  │   │
  │   └─ Status is TRIAL/ACTIVE_PAID (should have access)
  │       └─ Check if login is disabled → Re-enable if appropriate
  │           └─ If login not disabled → Check for JWT/session issues → Force logout and re-login
  │
  └─ User cannot login at all
      ├─ Check if academy login is disabled
      ├─ Check if password was recently reset
      └─ Reset password if needed (see Super Admin Actions SOP)
```

### Support Response Templates

**Trial Expired:**

> Your 30-day free trial has ended. To continue using Academyflo, please subscribe to a plan. Our plans start at INR 299/month for up to 50 students.

**Payment Confirmed, Activating:**

> Thank you for your payment. We've activated your subscription for [period]. You should now be able to access the app. Please log out and log back in if you still see the blocked screen.

**Investigating:**

> We're looking into your account status. Can you share the email address you use to log in? We'll get back to you shortly.

## Audit Trail

All subscription changes are recorded in the audit log:

```bash
# View subscription audit logs for an academy
curl https://academyflo.com/api/v1/admin/academies/{academyId}/audit-logs?entityType=subscription \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

This shows who changed the subscription, when, and what the previous/new values were.
