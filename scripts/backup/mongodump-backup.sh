#!/usr/bin/env bash
set -euo pipefail

# PlayConnect MongoDB Backup Script
#
# Usage:
#   MONGODB_URI="mongodb://..." ./mongodump-backup.sh
#
# Environment variables:
#   MONGODB_URI            — (required) MongoDB connection string
#   BACKUP_DIR             — backup output directory (default: /backups)
#   BACKUP_RETENTION_DAYS  — delete backups older than N days (default: 7)
#   S3_BUCKET              — (optional) upload to S3 bucket after backup

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: MONGODB_URI=\"mongodb://...\" $0"
  echo ""
  echo "Environment variables:"
  echo "  MONGODB_URI            (required) MongoDB connection string"
  echo "  BACKUP_DIR             Backup output directory (default: /backups)"
  echo "  BACKUP_RETENTION_DAYS  Delete backups older than N days (default: 7)"
  echo "  S3_BUCKET              Upload to S3 bucket after backup (optional)"
  exit 0
fi

if [[ -z "${MONGODB_URI:-}" ]]; then
  log "ERROR: MONGODB_URI is required"
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date '+%Y-%m-%d_%H-%M')"
DUMP_DIR="${BACKUP_DIR}/${TIMESTAMP}"
ARCHIVE="${BACKUP_DIR}/${TIMESTAMP}.tar.gz"

log "Starting backup to ${DUMP_DIR}"

mkdir -p "${DUMP_DIR}"

mongodump --uri="${MONGODB_URI}" --out="${DUMP_DIR}"

log "Compressing backup to ${ARCHIVE}"

tar -czf "${ARCHIVE}" -C "${BACKUP_DIR}" "${TIMESTAMP}"
rm -rf "${DUMP_DIR}"

log "Backup created: ${ARCHIVE} ($(du -h "${ARCHIVE}" | cut -f1))"

# Upload to S3 if configured
if [[ -n "${S3_BUCKET:-}" ]]; then
  log "Uploading to s3://${S3_BUCKET}/backups/${TIMESTAMP}.tar.gz"
  aws s3 cp "${ARCHIVE}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}.tar.gz"
  log "Upload complete"
fi

# Clean old backups
if [[ "${BACKUP_RETENTION_DAYS}" -gt 0 ]]; then
  log "Cleaning backups older than ${BACKUP_RETENTION_DAYS} days"
  find "${BACKUP_DIR}" -name "*.tar.gz" -type f -mtime "+${BACKUP_RETENTION_DAYS}" -delete
fi

log "Backup complete"
