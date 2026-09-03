# Phase 10 — Production

> **What this phase does:** prepares the application to be deployed **reliably in
> production**. It makes the Docker setup production-ready, adds health checks so the
> services start in the right order, adds an automated CI pipeline (tests + lint + build
> on every change), and provides backup scripts and environment templates.

---

## 1. Production architecture (Docker Compose)

`docker-compose.yml` at the root defines **four** services. Key production features:

| Service | Image | Notes |
|---------|-------|-------|
| `database` | `postgres:16-alpine` | Stores all data; has a **healthcheck** (`pg_isready`) |
| `redis` | `redis:7-alpine` | Cache queue; password-protected; healthchecked |
| `backend` | built from `./backend` | Laravel app; healthchecked via `/api/v1/health` |
| `frontend` | built from `./frontend` | Next.js app; healthchecked by fetching `/` |

### Secrets must be provided

The config uses `${VAR:?...}` so it **fails fast** if required secrets are missing. You
must put these in a `.env` file:

```
APP_KEY          # generate with: php artisan key:generate
DB_PASSWORD
REDIS_PASSWORD
```

For example:

```yaml
environment:
  APP_KEY: "${APP_KEY:?APP_KEY must be set in .env (run: php artisan key:generate)}"
  DB_PASSWORD: "${DB_PASSWORD:?DB_PASSWORD must be set in .env}"
  REDIS_PASSWORD: "${REDIS_PASSWORD:?REDIS_PASSWORD must be set in .env}"
```

### Health checks control startup order

Services only start the next one once the previous is **healthy**:

```yaml
backend:
  depends_on:
    database:
      condition: service_healthy
    redis:
      condition: service_healthy
...
frontend:
  depends_on:
    backend:
      condition: service_healthy
```

---

## 2. The backend entrypoint (startup script)

The backend container runs `backend/docker/entrypoint.sh` when it starts. It does
everything needed, in order:

```sh
# 1. Wait for the database to be reachable
while ! nc -z "${DB_HOST:-database}" "${DB_PORT:-5432}" 2>/dev/null; do
    sleep 2
done

# 2. Run migrations (safe/idempotent on every start)
php artisan migrate --force

# 3. Seed roles/permissions (+ demo admin only if the DB is empty and SEED_DEMO=true)
php artisan app:ensure-bootstrap --seed-demo --force   # or without --seed-demo

# 4. Storage link + cache config & routes for performance
php artisan storage:link || true
php artisan config:cache || true
php artisan route:cache || true

# 5. Start the web server via supervisor (nginx + php-fpm)
exec /usr/bin/supervisord -c /etc/supervisord.conf
```

This means the backend **always** prepares its database and caches before serving
traffic, and it's safe to restart repeatedly.

A custom artisan command (`app:ensure-bootstrap`) seeds the roles/permissions
**idempotently** and only creates a demo system admin if the users table is empty and
`--seed-demo` is requested. Crucially, it does **not** depend on `tinker`, so it works in
a production image.

---

## 3. Continuous Integration (CI)

`.github/workflows/ci.yml` runs automatically **on every push and pull request**. It has
two parallel jobs:

| Job | What it runs |
|-----|--------------|
| **Backend** | `composer install`, `php artisan key:generate`, `vendor/bin/pint --test` (formatting), `php artisan test` |
| **Frontend** | `npm ci`, `npm run lint`, `npx tsc --noEmit` (type check), `npm run build` |

The backend job uses a headless `.env.ci` (SQLite + array cache + fast bcrypt) so tests
run quickly without a real database.

The idea: if any check fails, developers find out immediately — before a bad change is
deployed.

---

## 4. Backups

`scripts/backup.sh` creates a timestamped folder in `./backups/` and saves:

- a **database dump** (`db.sql.gz`) — from PostgreSQL via `pg_dump | gzip`
- the **storage** volume (`storage.tar.gz`) — uploaded documents/photos from the backend
  container

Example usage (usually scheduled via `cron`):

```bash
./scripts/backup.sh
```

---

## 5. Environment templates

- **`.env.example`** (root) — the template for the production compose secrets.
- **`frontend/.env.production.example`** — template for `NEXT_PUBLIC_API_URL`.

`NEXT_PUBLIC_API_URL` tells the frontend where the backend API lives (e.g.
`http://localhost:8080/api/v1`).

---

## 6. Manual steps left for the real deployment

The automation covers a lot, but a few things must be done by hand at deploy time:

1. Fill in `.env` — especially `APP_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD`.
2. Put a **reverse proxy** (Nginx/Caddy) in front for **HTTPS/TLS**, and set the real
   `APP_URL` / `NEXT_PUBLIC_API_URL` and `CORS_ALLOWED_ORIGINS` to the actual domains.
3. Schedule **backups** (cron) using `scripts/backup.sh`.

---

## ✅ What this phase gives you

- Production-ready `docker-compose.yml` (secrets, healthchecks, ordered startup).
- A backend **entrypoint** that waits for the DB, migrates, seeds, caches and serves.
- **CI** that runs backend tests/lint and frontend lint/typecheck/build automatically.
- **Backup** script for database + storage.
- Environment templates for the remaining secret configuration.

---

# 🎉 You've reached the end

You have now walked through every phase (0–10) of **BTS School Manager**:

- **Phase 1** — the technical foundation
- **Phase 2** — administration (schools, users, years, programs, classes, subjects)
- **Phase 3** — students
- **Phase 4** — teachers
- **Phase 5** — grades
- **Phase 6** — attendance
- **Phase 7** — timetables & rooms
- **Phase 8** — announcements, notifications & documents
- **Phase 9** — reports & analytics
- **Phase 10** — production

Return to the [guide home](README.md) any time, or jump back to
[Phase 1](01-phase1-foundation.md) to start over.
