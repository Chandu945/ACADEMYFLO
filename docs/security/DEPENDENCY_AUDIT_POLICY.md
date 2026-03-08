# Dependency Audit Policy

## Overview

All production dependencies are scanned for known vulnerabilities on every CI run using `npm audit --json --omit=dev`. Results are evaluated against the severity policy below.

## Severity Policy

| Severity | Action | Allowlistable? |
|----------|--------|----------------|
| Critical | Immediate failure — must be resolved before merge | **Never** |
| High | Failure unless allowlisted with valid entry | Yes (with expiry) |
| Moderate | Reported in audit artifact — does not block merge | N/A |
| Low | Reported in audit artifact — does not block merge | N/A |

## Allowlist Management

Allowlist entries live in `scripts/hardening/allowlist.json` under the `audit.entries` array.

### Entry Format

```json
{
  "id": "1234",
  "reason": "Mitigated by input validation in auth middleware — fix expected in next-auth@5.1",
  "expiry": "2026-06-01"
}
```

### Rules

1. **Only high-severity** advisories may be allowlisted. Critical is never allowlistable.
2. Every entry **must** include a `reason` explaining why it is safe to defer.
3. Every entry **must** include an `expiry` date (max 90 days from creation).
4. **Expired entries** re-trigger CI failure — the team must re-evaluate and either fix or renew.
5. Allowlist changes require code review from at least one security-aware team member.

## Escalation SLA

| Severity | Resolution Target |
|----------|-------------------|
| Critical | 24 hours |
| High | 7 days (or allowlist with expiry) |
| Moderate | Next sprint |
| Low | Best effort |

## Running Locally

```bash
npm run hardening:audit
```

Output: `artifacts/dependency-audit.json`

## CI Integration

The hardening job in `.github/workflows/ci.yml` runs the audit automatically. Failures block the merge via the `report` job's gate check.
