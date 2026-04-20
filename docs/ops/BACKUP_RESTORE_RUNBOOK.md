# Backup & Restore Runbook

Procedures for backing up and restoring Academyflo data.

**Critical rule:** Never delete academy data. Deactivate only (per SRS).

## Atlas (Managed MongoDB)

### Daily Snapshots

Atlas provides automated daily snapshots. Recommended configuration:

| Setting                | Value                |
| ---------------------- | -------------------- |
| Snapshot frequency     | Daily                |
| Daily retention        | 7 days               |
| Weekly retention       | 4 weeks              |
| Monthly retention      | 12 months            |
| Point-in-time recovery | Enabled (continuous) |

### Taking a Manual Snapshot

1. Navigate to Atlas > Clusters > your cluster > Backup
2. Click "Take Snapshot Now"
3. Add a description (e.g., "Pre-release v1.x.x")

### Restoring from Atlas Snapshot

1. Atlas > Clusters > Backup > Snapshots
2. Select the snapshot to restore
3. Choose restore target:
   - **Same cluster** (replaces current data — use with extreme caution)
   - **Different cluster** (recommended for verification)
4. Wait for restore to complete

**Verify in staging first:** Always restore to a staging/test cluster before restoring to production.

## Self-Hosted (mongodump/mongorestore)

### Automated Backup

The backup script at `scripts/backup/mongodump-backup.sh` handles:

- Creating timestamped backup directories
- Running `mongodump`
- Compressing to `.tar.gz`
- Optional upload to S3
- Cleaning backups older than retention period

**Run manually:**

```bash
MONGODB_URI="mongodb://user:pass@host:27017/academyflo" \
BACKUP_DIR="/backups" \
BACKUP_RETENTION_DAYS=7 \
  bash scripts/backup/mongodump-backup.sh
```

**Run via cron (recommended):**

```cron
# Daily at 2 AM IST
0 2 * * * /opt/academyflo/scripts/backup/mongodump-backup.sh >> /var/log/academyflo-backup.log 2>&1
```

**With S3 upload:**

```bash
MONGODB_URI="mongodb://..." \
BACKUP_DIR="/backups" \
BACKUP_RETENTION_DAYS=7 \
S3_BUCKET="s3://academyflo-backups" \
  bash scripts/backup/mongodump-backup.sh
```

### Manual Backup

```bash
mongodump --uri="mongodb://user:pass@host:27017/academyflo" \
  --out="/backups/$(date +%Y-%m-%d_%H-%M)"
```

### Restoring from Backup

**Safety:** The restore script requires `--confirm` to prevent accidental data loss.

```bash
MONGODB_URI="mongodb://user:pass@host:27017/academyflo" \
BACKUP_FILE="/backups/2024-03-10_02-00.tar.gz" \
  bash scripts/backup/restore-mongodump.sh --confirm
```

**What this does:**

1. Extracts the `.tar.gz` to a temp directory
2. Runs `mongorestore --drop` (replaces existing data)
3. Cleans up the temp directory

**Always restore to staging first for verification.**

### Restore Verification Checklist

After restoring to staging:

- [ ] API starts and connects to the restored database
- [ ] Health readiness returns 200
- [ ] Admin can log in
- [ ] Academy data is present (spot-check a few academies)
- [ ] Student counts match expectations
- [ ] Fee records are intact
- [ ] Attendance records are present
- [ ] Subscription statuses are correct

## Retention Policy

| Environment | Backup Type       | Retention |
| ----------- | ----------------- | --------- |
| Production  | Daily snapshots   | 7 days    |
| Production  | Weekly snapshots  | 4 weeks   |
| Production  | Monthly snapshots | 12 months |
| Staging     | On-demand only    | 3 days    |

## Data Protection Rules (from SRS)

1. **Never delete academy data** — use deactivation/soft-delete only
2. **Never drop collections** in production
3. **Audit log entries are immutable** — never modify or delete
4. **Student records use soft-delete** — `status: 'DELETED'`, never removed from DB
5. **Fee due records are permanent** — status changes only (PENDING → PAID/WAIVED)
6. **Subscription history is preserved** — new records created, old ones retained

## Emergency Backup Before Risky Operations

Before any of the following, take a manual backup:

- Database migration
- Bulk data update
- Production deploy with schema changes
- Manual admin operations on multiple academies

```bash
# Quick backup before risky operation
MONGODB_URI="$PROD_MONGODB_URI" \
BACKUP_DIR="/backups" \
  bash scripts/backup/mongodump-backup.sh
```
