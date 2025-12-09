#!/bin/bash

set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore-mongodb.sh <backup-path>"
  echo "Example: ./restore-mongodb.sh /backups/wokibrain_20251208_120000"
  exit 1
fi

BACKUP_PATH="$1"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
DATABASE="${MONGODB_DATABASE:-wokibrain}"

if [ ! -d "$BACKUP_PATH" ]; then
  echo "❌ Backup path not found: ${BACKUP_PATH}"
  exit 1
fi

echo "⚠️  WARNING: This will restore database ${DATABASE}"
echo "  From: ${BACKUP_PATH}"
echo ""
read -p "Are you sure? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^yes$ ]]; then
  echo "Restore cancelled"
  exit 0
fi

echo "🔄 Starting MongoDB restore..."

mongorestore \
  --uri="${MONGODB_URI}" \
  --db="${DATABASE}" \
  --drop \
  --gzip \
  "${BACKUP_PATH}/${DATABASE}"

if [ $? -eq 0 ]; then
  echo "✅ Restore completed successfully"
else
  echo "❌ Restore failed"
  exit 1
fi



