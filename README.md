# BTS School Manager

Système de gestion scolaire pour les établissements BTS au Maroc.

Plateforme centralisée (administratif + académique) destinée à gérer étudiants, enseignants, classes,
programmes, notes, assiduité, emplois du temps, documents PDF, annonces et notifications.

Ce dépôt suit le cahier de planification complet `Plan_Complet_Systeme_Gestion_BTS_Maroc.pdf`.

## Stack

| Couche       | Technologie                    |
| ------------ | ------------------------------ |
| Frontend     | Next.js 16 + TypeScript        |
| Frontend UI  | Tailwind CSS 4                 |
| Backend      | Laravel 13 + PHP 8.3           |
| API / Auth   | REST + Sanctum (Jetons)        |
| Base de données | PostgreSQL 16                |
| Cache / Queue| Redis 7                        |
| Conteneurisation | Docker + docker-compose    |

## Architecture

```
Navigateur
   │ HTTPS
   ▼
Next.js / TypeScript (frontend)
   │ API REST (/api/v1)
   ▼
Laravel (backend)
   ├── PostgreSQL
   ├── Redis
   └── Stockage fichiers
```

Le frontend n'accède jamais directement à PostgreSQL. Toute opération passe par le backend, qui
applique validation, authentification, autorisation et logique métier.

## Démarrage rapide

### A) Développement local (sans Docker)

Prérequis : PHP >= 8.3, Composer, Node >= 20.

**Backend** (terminal 1)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
# API sur http://localhost:8000/api/v1
```

> Par défaut le backend utilise SQLite pour simplifier le développement. Pour utiliser
> PostgreSQL, configurez les variables DB_* dans `backend/.env`.

**Frontend** (terminal 2)

```bash
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
# UI sur http://localhost:3000
```

### B) Docker (proche de la production)

```bash
docker compose up -d --build
```

- Frontend : http://localhost:3000
- Backend  : http://localhost:8080/api/v1
- PostgreSQL : localhost:5432
- Redis      : localhost:6379

Compte de démonstration (seeder) :

| Rôle              | Email            | Mot de passe |
| ----------------- | ---------------- | ------------ |
| Administrateur système | admin@example.com | password |

> Pour un démarrage fiable, activez `SEED_DEMO=true` au premier lancement afin que le
> conteneur backend crée l'administrateur système automatiquement (voir ci-dessous).

### C) Déploiement production (Docker)

```bash
cp .env.example .env            # puis remplir APP_KEY, DB_PASSWORD, REDIS_PASSWORD
SEED_DEMO=true docker compose up -d --build   # premier lancement : seed + admin démo
```

Au démarrage, le conteneur `backend` attend PostgreSQL, exécute les migrations, seed de façon
idempotente (`php artisan app:ensure-bootstrap`), crée le lien de stockage et cache la config/les
routes avant de servir nginx + php-fpm. Des healthchecks pilotent l'ordre de démarrage.

- URL API  : `http://localhost:8080/api/v1/health` (health check public).
- Sauvegarde : `./scripts/backup.sh` (dump Postgres + volume `storage`).

Recommandations de mise en production :
- HTTPS : placez un reverse proxy (Nginx/Caddy) devant les services et renseignez `APP_URL` et
  `NEXT_PUBLIC_API_URL` avec vos domaines réels ; ajustez `CORS_ALLOWED_ORIGINS`.
- Secrets : générez `APP_KEY` (`php artisan key:generate`), changez `DB_PASSWORD`/`REDIS_PASSWORD`.
- Sauvegardes : programmez `scripts/backup.sh` en cron.

## Rôles

- `admin_system` : gestion plateforme, établissements, utilisateurs, permissions.
- `admin_establishment` : gestion académique complète de l'établissement.
- `teacher` : saisie notes, prise de présences, consultation emploi du temps.
- `student` : consultation profil, notes, assiduité, emploi du temps, annonces.

Les permissions sont déclaratives (`module.action`) et vérifiées côté backend via le middleware
`permission:*` (voir `app/Http/Middleware/CheckPermission.php`).

## Modules (phases)

La roadmap est décrite dans le document de planification. L'état d'avancement :

- [x] Phase 0 - Fondation produit (spécifications, architecture)
- [x] Phase 1 - Fondation technique (Docker, Laravel, Next.js, DB, auth, design system, i18n)
- [x] Phase 2 - Administration (users, roles, écoles, années scolaires, filières, classes, matières)
- [x] Phase 3 - Étudiants (profils, tuteurs, inscription/classe, statuts)
- [x] Phase 4 - Enseignants (profils, affectations matières)
- [x] Phase 5 - Notes (évaluations + saisie/paiement des notes, publication/verrouillage)
- [x] Phase 6 - Assiduité (séances, présences/absences/retards/justifiés)
- [x] Phase 7 - Emploi du temps + salles (créneaux hebdomadaires par classe, gestion des salles)
- [x] Phase 8 - Documents & communication (annonces, centre de notifications, documents avec upload/téléchargement)
- [x] Phase 9 - Rapports & analytics (KPI, répartitions, moyennes par classe, taux de présence)
- [x] Phase 10 - Production (Docker healthchecks, entrypoint migrations/seed, CI, sauvegardes)

## Scripts utiles

```bash
cd backend && php artisan migrate:fresh --seed   # reset + seed base
cd backend && vendor/bin/pint                    # formatage backend
cd frontend && npm run lint                      # lint frontend
cd frontend && npm run build                     # build frontend
```

## Sécurité

- Hachage des mots de passe (bcrypt par défaut).
- Jetons Sanctum pour l'authentification API.
- Validation des entrées côté serveur.
- Rate limiting sur les routes sensibles (login, réinitialisation).
- Middleware de permission sur les routes protégées.
- Aucun secret dans Git (voir `.gitignore`).

## Licence

Projet interne. Document de référence : `Plan_Complet_Systeme_Gestion_BTS_Maroc.pdf`.