# Release Candidate Sign-off Checklist

Use this checklist to approve or reject a Release Candidate build before production deployment.

## RC Identification

| Field          | Value          |
| -------------- | -------------- |
| RC Tag         | `rc-XXXXXXX`   |
| Commit SHA     | `(full SHA)`   |
| Build Date     | `YYYY-MM-DD`   |
| Sign-off By    | `(name/team)`  |

---

## Automated Gates

All automated gates must show `success` in the sign-off bundle (`rc-<tag>.json`).

- [ ] **CI Quality Gates** — lint, typecheck, format, boundaries, unit tests, E2E tests, contracts
- [ ] **Security Hardening** — dependency audit, license compliance, secrets scan
- [ ] **Smoke Suite** — API health, admin web flows, owner API flows

## Artifact Review

Verify the sign-off bundle contains all required artifacts:

- [ ] `openapi.v1.json` — OpenAPI spec matches expected endpoints
- [ ] `test-report.json` — all gates passed, coverage meets 80% threshold
- [ ] `coverage-summary.json` — per-workspace coverage metrics reviewed
- [ ] `docker-digests.json` — image digests match deployed containers
- [ ] `dependency-audit.json` — no critical/high unallowlisted vulnerabilities
- [ ] `licenses.json` — no disallowed licenses (GPL-3.0, AGPL-3.0, SSPL)
- [ ] `secrets-scan.json` — zero findings
- [ ] `smoke-results.json` — all checks passed

## Manual QA

- [ ] Admin web: login, view dashboard, view academy list, view academy detail
- [ ] Owner app: login, view subscription status, view students list
- [ ] Payments: verify Cashfree sandbox checkout flow (if applicable)
- [ ] Email: verify fee reminder email renders correctly (staging mailbox)
- [ ] Responsive: admin web renders on mobile viewport

## Security Review

- [ ] No secrets/PII in CI logs
- [ ] Cashfree retries only with idempotency key
- [ ] No duplicate email sends
- [ ] Webhook endpoints require signature verification

## Performance Check

- [ ] API response times < 500ms for dashboard and list endpoints
- [ ] No N+1 query patterns in slow query logs
- [ ] Memory usage stable under load (no leaks)

---

## Decision

| Decision  | Date | Approver |
| --------- | ---- | -------- |
| ☐ Approve | —    | —        |
| ☐ Reject  | —    | —        |

**Rejection reason (if applicable):**

> _Describe issues that block release._

---

## Post-Approval

After sign-off:

1. Tag the commit: `git tag v1.0.0-rc.N <sha>`
2. Trigger production deployment workflow
3. Follow [Release Readiness Checklist](RELEASE_READINESS_CHECKLIST.md) for go-live
