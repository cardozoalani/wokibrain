#!/bin/bash

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
DATABASE="${MONGODB_DATABASE:-wokibrain}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${DATABASE}_${TIMESTAMP}"

echo "🔄 Starting MongoDB backup..."
echo "  Database: ${DATABASE}"
echo "  Destination: ${BACKUP_PATH}"

mongodump \
  --uri="${MONGODB_URI}" \
  --db="${DATABASE}" \
  --out="${BACKUP_PATH}" \
  --gzip

if [ $? -eq 0 ]; then
  echo "✅ Backup completed successfully"
  echo "  Size: $(du -sh ${BACKUP_PATH} | cut -f1)"
else
  echo "❌ Backup failed"
  exit 1
fi

echo "🗑️  Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "${DATABASE}_*" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} +

echo "✅ Backup process complete"



