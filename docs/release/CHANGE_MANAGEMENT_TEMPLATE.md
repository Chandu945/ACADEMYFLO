# Change Management Record

Use this template for every production deployment to maintain an auditable change history.

---

## Change Identification

| Field | Value |
|-------|-------|
| Change ID | `CM-YYYY-NNN` |
| Date | `YYYY-MM-DD` |
| Requestor | |
| Approver | |
| RC Tag | `rc-XXXXXXX` |
| Commit SHA | |

---

## Change Summary

> _Brief description of what is being deployed and why._

### Impacted Components

- [ ] API (`apps/api`)
- [ ] Admin Web (`apps/admin-web`)
- [ ] Mobile (`apps/mobile`) — app store update required: ☐ Yes ☐ No
- [ ] Database schema (additive changes only)
- [ ] Infrastructure / configuration
- [ ] External integrations (Cashfree, SMTP)

### Changes Included

| # | Description | Type | Files Changed |
|---|-------------|------|---------------|
| 1 | | Feature / Fix / Config | |
| 2 | | | |
| 3 | | | |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Service disruption during deployment | Low | Medium | Blue/green deployment with instant rollback |
| Data inconsistency | Low | High | Backup verified, schema changes are additive only |
| External service integration failure | Low | Medium | Bounded retries + timeout policies in place |
| Performance regression | Low | Medium | Load tested in staging, monitoring in place |

**Overall Risk Level:** ☐ Low ☐ Medium ☐ High

---

## Pre-Deployment Checklist

- [ ] [Go-Live Checklist](GO_LIVE_CHECKLIST.md) completed
- [ ] RC sign-off bundle approved
- [ ] Backup snapshot verified (timestamp: `________`)
- [ ] Rollback plan reviewed
- [ ] On-call engineer assigned: `________________`
- [ ] Deployment window communicated to team

---

## Deployment Details

| Step | Time | Status | Notes |
|------|------|--------|-------|
| Deployment initiated | | ☐ | |
| Images pulled | | ☐ | |
| Services restarted | | ☐ | |
| Health checks passed | | ☐ | |
| Smoke suite passed | | ☐ | |
| Monitoring period started | | ☐ | |
| Deployment confirmed stable | | ☐ | |

**Deployment strategy used:** ☐ Blue/Green ☐ Rolling

---

## Rollback Procedure

If rollback is needed, follow [Rollback Playbook](ROLLBACK_PLAYBOOK.md).

**Previous known-good image tag:** `________________`

**Rollback trigger criteria:**
- 5xx error rate > 5% for 5 minutes
- `/ready` endpoint flapping (> 3 failures in 5 minutes)
- Critical feature broken (auth, subscription, payments)

---

## Validation Results

### Automated

| Check | Result | Notes |
|-------|--------|-------|
| CI gates | ☐ Pass ☐ Fail | |
| Security hardening | ☐ Pass ☐ Fail | |
| Staging smoke suite | ☐ Pass ☐ Fail | |
| Production smoke check | ☐ Pass ☐ Fail | |

### Manual

| Check | Result | Verified By |
|-------|--------|-------------|
| Admin web login | ☐ Pass ☐ Fail | |
| Owner app login | ☐ Pass ☐ Fail | |
| Student list loads | ☐ Pass ☐ Fail | |
| Subscription status correct | ☐ Pass ☐ Fail | |
| Payment flow reachable | ☐ Pass ☐ Fail | |

---

## Approvals

| Role | Name | Decision | Date |
|------|------|----------|------|
| Engineering Lead | | ☐ Approve ☐ Reject | |
| Product Owner | | ☐ Approve ☐ Reject | |

---

## Post-Deployment

- [ ] [Post-Go-Live Monitoring](POST_GO_LIVE_MONITORING.md) checklist started
- [ ] Team notified of successful deployment
- [ ] Change record filed and archived
- [ ] Lessons learned captured (if applicable)

---

## Incident Notes (if applicable)

> _Record any issues encountered during deployment, rollback actions taken, and resolution._

| Time | Event | Action | Outcome |
|------|-------|--------|---------|
| | | | |
