#!/bin/bash
# Restore the production backup into the local dev database.
# Usage: ./scripts/restore-dev-db.sh [backup_file]
# Default: uses the latest prod backup from ~/.config/cmcrank/backups/production/

set -euo pipefail

BACKUP_DIR="$HOME/.config/cmcrank/backups/production"
CONTAINER="cmcrank-db"
DB_NAME="cmcrank_dev"
DB_USER="cmcrank"

# Use provided backup file or find the latest one
if [ -n "${1:-}" ]; then
  BACKUP_FILE="$1"
else
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.dump 2>/dev/null | head -1)
  if [ -z "$BACKUP_FILE" ]; then
    echo "Error: No .dump files found in $BACKUP_DIR"
    exit 1
  fi
fi

echo "Restoring from: $BACKUP_FILE"
echo "Into: $CONTAINER / $DB_NAME"

# Ensure the dev DB container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Starting dev DB container..."
  docker compose up -d db
  sleep 3
fi

# Copy backup into container
docker cp "$BACKUP_FILE" "$CONTAINER:/tmp/restore.dump"

# Terminate existing connections and restore
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true

docker exec "$CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-privileges --clean --if-exists /tmp/restore.dump 2>/dev/null || true

# Verify
TOKEN_COUNT=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Token\";")
SNAPSHOT_COUNT=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"DailySnapshot\";")
RESEARCH_COUNT=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Research\" WHERE status = 'COMPLETE';")

echo "Restore complete:"
echo "  Tokens:     $(echo $TOKEN_COUNT | xargs)"
echo "  Snapshots:  $(echo $SNAPSHOT_COUNT | xargs)"
echo "  Researches: $(echo $RESEARCH_COUNT | xargs)"
