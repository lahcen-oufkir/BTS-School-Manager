#!/bin/sh
set -e

echo "[entrypoint] Starting BTS School Manager backend..."

# Permissions for runtime dirs
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Wait for the database to become available
echo "[entrypoint] Waiting for database at ${DB_HOST}:${DB_PORT}..."
attempt=0
while ! nc -z "${DB_HOST:-database}" "${DB_PORT:-5432}" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ "$attempt" -gt 120 ]; then
        echo "[entrypoint] Database not reachable after 120 attempts, giving up."
        exit 1
    fi
    echo "[entrypoint] Database not ready (attempt $attempt), retrying..."
    sleep 2
done
echo "[entrypoint] Database is reachable."

# Run migrations (idempotent, safe to run on every start)
echo "[entrypoint] Running migrations..."
php artisan migrate --force

# Idempotently seed roles/permissions + demo admin when the DB is empty
echo "[entrypoint] Ensuring roles/permissions are seeded..."
if [ "${SEED_DEMO:-false}" = "true" ]; then
    php artisan app:ensure-bootstrap --seed-demo --force
else
    php artisan app:ensure-bootstrap --force
fi

# Storage links + cached config/routes for production performance
echo "[entrypoint] Linking storage and caching config/routes..."
php artisan storage:link || true
php artisan config:cache || true
php artisan route:cache || true

# Run database + cache (Redis) from the health endpoint before serving traffic
echo "[entrypoint] Backend services are healthy. Starting supervisor..."
exec /usr/bin/supervisord -c /etc/supervisord.conf