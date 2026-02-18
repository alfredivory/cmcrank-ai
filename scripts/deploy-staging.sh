#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# CMCRank.ai — Staging Deployment Script
# Deploys to staging.cmcrank.ai (:3001)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_SOURCE="$HOME/.config/cmcrank/.env.staging"
ENV_TARGET="$PROJECT_DIR/.env.staging"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.staging.yml"
DB_PORT=5434
DB_NAME="cmcrank_staging"
DB_USER="cmcrank"
APP_PORT=3001
APP_CONTAINER="cmcrank-app-staging"
DB_CONTAINER="cmcrank-db-staging"
BACKUP_DIR="$HOME/.config/cmcrank/backups/staging"

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [STAGING] $*"
}

cleanup() {
  log "Cleaning up env file from working directory..."
  rm -f "$ENV_TARGET"
}
trap cleanup EXIT

# --- 1. Copy env file ---
log "Copying environment file..."
if [[ ! -f "$ENV_SOURCE" ]]; then
  echo "ERROR: Environment file not found at $ENV_SOURCE"
  exit 1
fi
cp "$ENV_SOURCE" "$ENV_TARGET"

# --- 2. Export DB_PASSWORD for docker-compose interpolation ---
set -a
source "$ENV_TARGET"
set +a
export DB_PASSWORD

# --- 3. Pre-migration DB backup (if DB is running) ---
mkdir -p "$BACKUP_DIR"
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  BACKUP_FILE="$BACKUP_DIR/pre-deploy-$(date -u '+%Y%m%d-%H%M%S').sql.gz"
  log "Creating pre-migration backup at $BACKUP_FILE..."
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE" || {
    log "WARNING: Backup failed, but continuing deployment..."
  }
  # Keep only last 10 backups
  ls -t "$BACKUP_DIR"/pre-deploy-*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
else
  log "DB container not running, skipping backup."
fi

# --- 4. Build Docker images ---
log "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build --no-cache app

# --- 5. Start DB, wait for health check ---
log "Starting database..."
docker compose -f "$COMPOSE_FILE" up -d db

log "Waiting for database to be healthy..."
RETRIES=30
until docker compose -f "$COMPOSE_FILE" ps db --format '{{.Health}}' 2>/dev/null | grep -q "healthy"; do
  RETRIES=$((RETRIES - 1))
  if [[ $RETRIES -le 0 ]]; then
    echo "ERROR: Database failed to become healthy"
    exit 1
  fi
  sleep 2
done
log "Database is healthy."

# --- 6. Run Prisma migrations ---
log "Running Prisma migrations..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}" \
  npx prisma migrate deploy

# --- 7. Restart app container ---
log "Starting app container..."
docker compose -f "$COMPOSE_FILE" up -d app

# --- 8. Health check the app ---
log "Waiting for app to be ready..."
RETRIES=30
until curl -sf "http://localhost:${APP_PORT}" > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [[ $RETRIES -le 0 ]]; then
    echo "ERROR: App failed health check on port $APP_PORT"
    docker compose -f "$COMPOSE_FILE" logs --tail=50 app
    exit 1
  fi
  sleep 2
done
log "App is healthy on port $APP_PORT."

# --- 9. Prune old Docker images ---
log "Pruning dangling Docker images..."
docker image prune -f > /dev/null 2>&1 || true

log "Staging deployment complete!"
