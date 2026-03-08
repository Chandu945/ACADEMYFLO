#!/usr/bin/env bash
set -euo pipefail

# PlayConnect MongoDB Restore Script
#
# Usage:
#   MONGODB_URI="mongodb://..." BACKUP_FILE="/backups/2024-01-01_02-00.tar.gz" \
#     ./restore-mongodump.sh --confirm
#
# Environment variables:
#   MONGODB_URI   — (required) MongoDB connection string
#   BACKUP_FILE   — (required) path to .tar.gz backup archive

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: MONGODB_URI=\"mongodb://...\" BACKUP_FILE=\"/path/to/backup.tar.gz\" $0 --confirm"
  echo ""
  echo "Environment variables:"
  echo "  MONGODB_URI   (required) MongoDB connection string"
  echo "  BACKUP_FILE   (required) path to .tar.gz backup archive"
  echo ""
  echo "Flags:"
  echo "  --confirm     Required safety flag to proceed with restore"
  exit 0
fi

if [[ -z "${MONGODB_URI:-}" ]]; then
  log "ERROR: MONGODB_URI is required"
  exit 1
fi

if [[ -z "${BACKUP_FILE:-}" ]]; then
  log "ERROR: BACKUP_FILE is required"
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  log "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Safety guard
if [[ "${1:-}" != "--confirm" ]]; then
  log "ERROR: This will DROP existing data and restore from backup."
  log "Pass --confirm to proceed."
  exit 1
fi

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TEMP_DIR}"' EXIT

log "Extracting ${BACKUP_FILE} to ${TEMP_DIR}"
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the dump directory (first subdirectory in extracted archive)
DUMP_DIR="$(find "${TEMP_DIR}" -mindepth 1 -maxdepth 1 -type d | head -1)"

if [[ -z "${DUMP_DIR}" ]]; then
  log "ERROR: No dump directory found in archive"
  exit 1
fi

log "Restoring from ${DUMP_DIR}"

mongorestore --uri="${MONGODB_URI}" --drop "${DUMP_DIR}"

log "Restore complete"
