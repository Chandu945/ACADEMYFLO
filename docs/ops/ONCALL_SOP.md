# On-Call SOP

Standard operating procedures for on-call engineers.

## On-Call Responsibilities

1. **Monitor** production health during your shift
2. **Respond** to alerts and incidents per the [Incident Response Playbook](INCIDENT_RESPONSE_PLAYBOOK.md)
3. **Escalate** if the issue is beyond your expertise or requires additional help
4. **Document** all incidents and actions taken
5. **Hand off** context to the next on-call engineer

## Shift Handoff

### At Start of Shift

1. Check production health:

   ```bash
   API_URL=https://playconnect.app ADMIN_URL=https://admin.playconnect.app \
     node scripts/smoke-check.mjs
   ```

2. Review recent logs for any ongoing issues:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml logs api --since 2h | grep -i error | tail -20
   ```

3. Check for any open incidents or ongoing investigations
4. Review the handoff notes from the previous on-call

### At End of Shift

Post a handoff note:

```
On-Call Handoff — {date}
Outgoing: {your name}
Incoming: {next on-call name}

Open issues: {list any ongoing investigations}
Recent incidents: {brief summary}
Deployments: {any deploys during shift}
Notes: {anything the next person should know}
```

## Daily Health Checks

Perform these checks once per shift:

| Check            | Command                                      | Expected            |
| ---------------- | -------------------------------------------- | ------------------- |
| API liveness     | `curl .../api/v1/health/liveness`            | 200                 |
| API readiness    | `curl .../api/v1/health/readiness`           | 200, mongodb: up    |
| Admin web        | `curl https://admin.playconnect.app/`        | 200 or 3xx          |
| Container status | `docker compose ps`                          | All containers "Up" |
| Disk space       | `df -h`                                      | < 80% usage         |
| Recent errors    | `logs api --since 8h \| grep error \| wc -l` | < 50                |

## Escalation Matrix

| Condition                   | Action                                                                           |
| --------------------------- | -------------------------------------------------------------------------------- |
| SEV0 — service down         | Page all engineers, notify stakeholders                                          |
| SEV1 — major feature broken | Page secondary on-call if primary can't resolve in 30 min                        |
| SEV2 — minor degradation    | Handle during shift, escalate if unresolved by end of shift                      |
| SEV3 — cosmetic issue       | Log a ticket, handle in next business day                                        |
| Security incident           | Follow [Security Runbook](../security/SECURITY_RUNBOOK.md), notify security lead |
| Data issue                  | Follow [Backup & Restore Runbook](BACKUP_RESTORE_RUNBOOK.md), notify data lead   |

## Tooling Access Required

| Tool                     | Purpose                             | Access                   |
| ------------------------ | ----------------------------------- | ------------------------ |
| Production server SSH    | Container management, logs          | SSH key                  |
| GitHub Actions           | Deploy monitoring, workflow re-runs | GitHub org member        |
| MongoDB Atlas (or shell) | Database queries, profiling         | Atlas user or SSH tunnel |
| Docker CLI               | Container inspection, restart       | Production server access |
| Issue tracker            | Incident logging                    | Team member              |

## Common On-Call Scenarios

### API Returns 503 on Readiness

1. Check MongoDB connectivity (Step 3 in [Incident Response](INCIDENT_RESPONSE_PLAYBOOK.md))
2. Check if Atlas is having an outage (status.mongodb.com)
3. Check container memory (`docker stats`)
4. If DB is truly unreachable, check network/firewall rules

### Spike in 401 Responses

1. Check if JWT secrets were rotated recently
2. Check if a deploy invalidated tokens
3. Check for brute-force login attempts (see [Security Runbook](../security/SECURITY_RUNBOOK.md))

### High Memory Usage

1. Check `docker stats` for container memory
2. Check MongoDB connection pool size
3. Look for memory leaks in recent deploys
4. Consider restarting the API container as immediate mitigation

### Subscription Complaints

Users reporting blocked access despite payment:

1. Check the academy's subscription status via admin panel
2. Follow [Subscription Enforcement SOP](SUBSCRIPTION_ENFORCEMENT_SOP.md) to manually activate
3. Verify the dues engine cron ran correctly
