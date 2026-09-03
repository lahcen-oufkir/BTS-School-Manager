#!/usr/bin/env bash
#
# BTS School Manager - backup script.
# Dumps the PostgreSQL database and the backend storage volume into ./backups.
#
# Usage:
#   ./scripts/backup.sh [output_dir]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${1:-${ROOT_DIR}/backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_DIR="${OUTPUT_DIR}/${STAMP}"

COMPOSE="docker compose -f ${ROOT_DIR}/docker-compose.yml"
DB_CONTAINER="${DB_CONTAINER:-bts_database}"
DB_USER="${DB_USERNAME:-bts}"
DB_NAME="${DB_DATABASE:-bts_school}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-bts_backend}"
STORAGE_PATH="${STORAGE_PATH:-/var/www/html/storage/app}"

mkdir -p "${OUTPUT_DIR}"

echo "==> Backing up database (${DB_NAME}) to ${OUTPUT_DIR}/db.sql.gz"
${COMPOSE} exec -T "${DB_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${OUTPUT_DIR}/db.sql.gz"

echo "==> Backing up backend storage to ${OUTPUT_DIR}/storage.tar.gz"
${COMPOSE} exec -T "${BACKEND_CONTAINER}" tar czf - -C "$(dirname "${STORAGE_PATH}")" "$(basename "${STORAGE_PATH}")" > "${OUTPUT_DIR}/storage.tar.gz"

echo "==> Backup complete: ${OUTPUT_DIR}"
du -sh "${OUTPUT_DIR}"