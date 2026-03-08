# PlayConnect — Backup & Restore

## MongoDB Atlas (Managed)

Atlas provides automated backups. Recommended configuration:

- **Daily snapshots** — enabled by default on M10+ clusters
- **Retention**: 7 daily, 4 weekly, 12 monthly snapshots
- **Point-in-time recovery** — enable for production clusters (M10+)

### Restore from Atlas

1. Go to Atlas Console → Cluster → **Backup** → **Restore**
2. Select snapshot or point-in-time
3. Choose "Restore to this cluster" or download the backup
4. For downloaded backups, use `mongorestore`:
   ```bash
   mongorestore --uri="mongodb+srv://..." --drop ./dump/
   ```

---

## Self-Hosted MongoDB

### Backup Script

The `mongodump-backup.sh` script creates compressed backups with optional S3 upload.

```bash
# Basic usage
MONGODB_URI="mongodb://localhost:27017/playconnect" ./mongodump-backup.sh

# With S3 upload and custom retention
MONGODB_URI="mongodb://localhost:27017/playconnect" \
  BACKUP_DIR="/opt/backups" \
  BACKUP_RETENTION_DAYS=14 \
  S3_BUCKET="playconnect-backups" \
  ./mongodump-backup.sh
```

#### Environment Variables

| Variable                | Required | Default    | Description                           |
| ----------------------- | -------- | ---------- | ------------------------------------- |
| `MONGODB_URI`           | Yes      | —          | MongoDB connection string             |
| `BACKUP_DIR`            | No       | `/backups` | Local backup directory                |
| `BACKUP_RETENTION_DAYS` | No       | `7`        | Auto-delete backups older than N days |
| `S3_BUCKET`             | No       | —          | Upload backups to this S3 bucket      |

#### S3 Configuration

Requires AWS CLI configured with appropriate credentials:

```bash
aws configure
# Or use IAM role on EC2/ECS
```

### Automated Backups (Cron)

Add to crontab (`crontab -e`):

```cron
# Daily backup at 2:00 AM
0 2 * * * /opt/playconnect/scripts/backup/mongodump-backup.sh >> /var/log/playconnect-backup.log 2>&1
```

### Restore Script

The `restore-mongodump.sh` script restores from a `.tar.gz` backup archive.

**WARNING**: This will DROP existing data in the target database.

```bash
MONGODB_URI="mongodb://localhost:27017/playconnect" \
  BACKUP_FILE="/backups/2024-01-15_02-00.tar.gz" \
  ./restore-mongodump.sh --confirm
```

The `--confirm` flag is required as a safety guard to prevent accidental restores.

---

## Restore Procedures

### Emergency Restore Checklist

1. **Stop the application** — prevent writes during restore
   ```bash
   docker compose -f deploy/docker-compose.prod.yml stop api admin-web
   ```
2. **Verify backup integrity** — list archive contents
   ```bash
   tar -tzf /backups/2024-01-15_02-00.tar.gz
   ```
3. **Run restore**
   ```bash
   MONGODB_URI="..." BACKUP_FILE="..." ./restore-mongodump.sh --confirm
   ```
4. **Restart services**
   ```bash
   docker compose -f deploy/docker-compose.prod.yml up -d api admin-web
   ```
5. **Run smoke check**
   ```bash
   node scripts/smoke-check.mjs
   ```
