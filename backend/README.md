# backend

BTS School Manager backend (Laravel + Sanctum + PostgreSQL + Redis).

## Setup (local development)

```bash
cp .env.example .env
composer install
php artisan key:generate

# Option A: SQLite (quick start)
touch database/database.sqlite

# Option B: PostgreSQL
# Set DB_CONNECTION=pgsql and related env vars in .env

php artisan migrate --seed
php artisan serve
```

## API

- Health: `GET /api/v1/health`
- Authenticated routes under `/api/v1` use `auth:sanctum`.
- Seed default admin: `admin@example.com` / `password`.

## Docker

```bash
docker compose up -d
```

See the root `docker-compose.yml` for the full stack (PostgreSQL, Redis, backend, frontend).