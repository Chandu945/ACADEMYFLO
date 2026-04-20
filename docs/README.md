# Academyflo Operational Documentation

Enterprise operational docs for the Academyflo platform. All procedures align to the SRS and reference actual repo scripts, endpoints, and workflows.

## Index

### Release

- [Release Readiness Checklist](release/RELEASE_READINESS_CHECKLIST.md) — go/no-go gates, pre/post-release steps
- [RC Sign-off Checklist](release/RC_SIGNOFF_CHECKLIST.md) — artifact review, manual QA, approval for production deploy
- [Production Cutover Plan](release/PRODUCTION_CUTOVER_PLAN.md) — zero-downtime deployment (blue/green + rolling), validation, rollback
- [Go-Live Checklist](release/GO_LIVE_CHECKLIST.md) — one-page go/no-go decision checklist
- [Post-Go-Live Monitoring](release/POST_GO_LIVE_MONITORING.md) — first 2 hours, day 1, week 1 monitoring
- [Change Management Template](release/CHANGE_MANAGEMENT_TEMPLATE.md) — auditable change record for each deployment
- [Rollback Playbook](release/ROLLBACK_PLAYBOOK.md) — identify, revert, verify, communicate

### Security

- [Security Runbook](security/SECURITY_RUNBOOK.md) — login abuse, token revocation, secret leaks, safe logging
- [Vulnerability Response](security/VULNERABILITY_RESPONSE.md) — intake, triage, severity, patch, deploy, verify
- [Dependency Audit Policy](security/DEPENDENCY_AUDIT_POLICY.md) — severity policy, allowlist management, escalation SLA
- [Secrets Scan Policy](security/SECRETS_SCAN_POLICY.md) — patterns detected, false-positive management, incident response

### Performance

- [Performance Runbook](performance/PERFORMANCE_RUNBOOK.md) — slow queries, indexes, hotspots, mitigation

### Operations

- [Incident Response Playbook](ops/INCIDENT_RESPONSE_PLAYBOOK.md) — severity levels, triage, containment, communication
- [On-Call SOP](ops/ONCALL_SOP.md) — shift handoff, escalation, tooling
- [Backup & Restore Runbook](ops/BACKUP_RESTORE_RUNBOOK.md) — Atlas, mongodump, restore, retention
- [Secrets Rotation SOP](ops/SECRETS_ROTATION_SOP.md) — JWT, SMTP, metrics token rotation
- [Subscription Enforcement SOP](ops/SUBSCRIPTION_ENFORCEMENT_SOP.md) — trial/grace/blocked states, manual activation
- [Super Admin Actions SOP](ops/SUPER_ADMIN_ACTIONS_SOP.md) — disable login, force logout, reset password, manual subscription

### Handoff

- [Handoff Package README](handoff/README.md) — index of all enterprise handoff artifacts
- [SRS Traceability Matrix](handoff/SRS_TRACEABILITY_MATRIX.md) — every SRS requirement mapped to implementation + tests
- [Enterprise Acceptance Checklist](handoff/ENTERPRISE_ACCEPTANCE_CHECKLIST.md) — 44-item Go/No-Go verification
- [Architecture Compliance](handoff/ARCHITECTURE_COMPLIANCE.md) — Clean Architecture + DDD evidence
- [Security Compliance](handoff/SECURITY_COMPLIANCE.md) — RBAC, sanitization, webhook verification, scanning
- [Performance & Scalability](handoff/PERFORMANCE_SCALABILITY.md) — pagination, indexes, cron locks, timeouts
- [Observability](handoff/OBSERVABILITY.md) — request tracing, structured logging, metrics
- [Operational Handover](handoff/OPERATIONAL_HANDOVER.md) — deploy, rollback, backups, on-call references
- [Known Limitations](handoff/KNOWN_LIMITATIONS.md) — SRS-excluded features (intentionally not built)

### Guardrails

- [SRS Guardrails](guardrails/SRS_GUARDRAILS.md) — excluded MVP features, architectural rules, "do not implement" list

## Cross-References

| Resource             | Path                                                                        |
| -------------------- | --------------------------------------------------------------------------- |
| Health endpoints     | `GET /api/v1/health/liveness`, `GET /api/v1/health/readiness`               |
| Metrics endpoint     | `GET /api/v1/metrics` (guarded)                                             |
| Smoke-check script   | `scripts/smoke-check.mjs`                                                   |
| Backup scripts       | `scripts/backup/mongodump-backup.sh`, `scripts/backup/restore-mongodump.sh` |
| Deploy compose files | `deploy/docker-compose.staging.yml`, `deploy/docker-compose.prod.yml`       |
| CI workflows         | `.github/workflows/ci.yml`, `staging-deploy.yml`, `prod-deploy.yml`         |
| RC workflow          | `.github/workflows/release-candidate.yml`                                   |
| RC scripts           | `scripts/rc/` (build, deploy, smoke, signoff)                               |
| RC version manifests | `deploy/versions/rc-*.json`                                                 |
| Deploy README        | `deploy/README.md`                                                          |
| Backup README        | `scripts/backup/README.md`                                                  |
| Hardening scripts    | `scripts/hardening/` (audit, licenses, secrets, full-sweep)                 |
| Hardening allowlist  | `scripts/hardening/allowlist.json`                                          |
| Handoff scripts      | `scripts/handoff/` (generate-traceability, generate-handoff-summary)        |
| Handoff artifacts    | `artifacts/handoff/` (traceability.json, handoff-summary.json)              |
