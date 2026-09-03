# Rapport d'avancement — BTS School Manager

> Fichier de reprise : ce document résume l'état du projet pour pouvoir reprendre
> le développement plus tard sans perdre le contexte (Phases 5 à 10 terminées en code,
> fix CSRF appliqué).

---

## État global des phases

| Phase | Module | État |
|-------|--------|------|
| 0 | Fondation produit | Done |
| 1 | Fondation technique (Docker, Laravel, Next.js, DB, auth, design, i18n) | Done |
| 2 | Administration (users, rôles, écoles, années, filières, classes, matières) | Done |
| 3 | Étudiants (profils, tuteurs, inscription/classe, statuts) | Done |
| 4 | Enseignants | Backend + **frontend done** | **Done (code)** |
| 5 | Notes (évaluations + saisie/paiement notes, publication/verrouillage) | **Done (code)** |
| 6 | Assiduité | Backend + **frontend done** | **Done (code)** |
| 7 | Emploi du temps + Salles | Backend + **frontend done** | **Done (code)** |
| 8 | Documents & communication | Backend + **frontend done** | **Done (code)** |
| 9 | Rapports & analytics | Backend + **frontend done** | **Done (code)** |
| 10 | Production | Docker + healthchecks + CI + **done** | **Done (code)** |

---

## Phase 5 — Notes : ce qui a été fait

### Backend (`backend/`)
- `AssessmentResource`, `GradeResource` (avec `class`/`subject`/`teacher` imbriqués,
  `grades_count`, `students_count`, `average`).
- FormRequests : `StoreAssessmentRequest`, `UpdateAssessmentRequest`, `UpdateGradesRequest`.
- `AssessmentController` (CRUD + filtres index + publish/lock + scoping école + auto-assign teacher).
- `GradeController` (liste, `grade-stream`, mise à jour groupée).
- Routes `grades.*` (protégées par permissions) dans `routes/api.php`.
- `User::isTeacher()` ajouté.
- Seeder `DemoDataSeeder` étendu : Teacher démo lié à `teacher@example.com`,
  affectations matières, un assessment d'exemple « Contrôle continu 1 » avec
  notes pour 5 étudiants démo.
- Tests : `GradeModuleTest` (8 tests).

### Frontend (`frontend/`)
- `lib/grades-api.ts` : `fetchAssessments`, `createAssessment`, `updateAssessment`,
  `deleteAssessment`, `publishAssessment`, `lockAssessment`, `fetchGrades`,
  `fetchGradeStream`, `saveGrades`.
- Types ajoutés : `Assessment`, `Grade`, `GradeStreamRow`, `AssessmentType`.
- Page `/dashboard/grades` : liste des évaluations (filtres classe/matière/recherche),
  modal CRUD (classe + matière + année scolaire + titre + type + date + max_score + weight),
  vue de saisie des notes (charge le `grade-stream`, édition score/commentaire),
  boutons Enregistrer / Publier / Verrouiller.
- Clés i18n ajoutées : `fr.json`, `en.json`, `ar.json`.

### Vérifications
- `php artisan test` : **46 tests / 107 assertions PASS**.
- `vendor/bin/pint --test` : PASS.
- Frontend : `npm run lint` PASS, `npx tsc --noEmit` PASS, `npm run build` PASS.

---

## Phase 4 — Enseignants : ce qui a été fait

### Backend (`backend/`)
- `TeacherController` (CRUD complet + filtres index + scoping école + recherche +
  gestion des affectations matières via `teacher_subject_assignments`).
- FormRequests : `StoreTeacherRequest`, `UpdateTeacherRequest`.
- `TeacherResource` (avec `school`, `subjects`, `assignments_count` imbriqués).
- Routes `teachers.*` (protégées par permissions) dans `routes/api.php`
  (remplace la route placeholder de la Phase 4).
- Tests : `TeacherModuleTest` (8 tests).

### Frontend (`frontend/`)
- Types ajoutés : `Teacher`, `TeacherSubjectAssignment`.
- `lib/admin-api.ts` : `fetchTeachers`, `createTeacher`, `updateTeacher`, `deleteTeacher`,
  `TeacherPayload`, `TeacherFilters`.
- Page `/dashboard/teachers` : CRUD complet (recherche, tableau, modal avec
  établissement / affectation des matières / statut actif, confirmation de suppression).
- Clés i18n ajoutées : `fr.json`, `en.json`, `ar.json`.

### Vérifications
- `php artisan test` : **54 tests / 135 assertions PASS**.
- `vendor/bin/pint --test` : PASS.
- Frontend : `npm run lint` PASS, `npx tsc --noEmit` PASS, `npm run build` PASS.

---

## Phase 6 — Assiduité : ce qui a été fait

### Backend (`backend/`)
- `AttendanceController` : CRUD des séances d'assiduité + `stream` (étudiants inscrits avec
  statut) + `updateRecords` (enregistrement groupé des présences). Scoping école, auto-assign
  enseignant quand le compte est un enseignant.
- FormRequests : `StoreAttendanceSessionRequest`, `UpdateAttendanceSessionRequest`,
  `StoreAttendanceRecordsRequest`.
- Resources : `AttendanceSessionResource` (class/subject/teacher + compteurs present/absent/late/justified),
  `AttendanceRecordResource`.
- Relations de comptage ajoutées sur `App\Models\AttendanceSession` (`presentRecords`, `absentRecords`, etc.).
- Routes `attendance.*` protégées par permissions dans `routes/api.php`.
- Tests : `AttendanceModuleTest` (8 tests).

### Frontend (`frontend/`)
- Types ajoutés : `AttendanceSession`, `AttendanceRecord`, `AttendanceStatus`, `AttendanceStreamRow`.
- `lib/attendance-api.ts` : `fetchAttendance`, `createAttendanceSession`, `updateAttendanceSession`,
  `deleteAttendanceSession`, `fetchAttendanceStream`, `saveAttendance`.
- Page `/dashboard/attendance` : liste des séances (filtres classe/matière/date) + vue de saisie
  des présences (statut par étudiant + justification pour les absences justifiées).
- Clés i18n ajoutées : `fr.json`, `en.json`, `ar.json`.

### Vérifications
- `php artisan test` : **62 tests / 160 assertions PASS**.
- `vendor/bin/pint --test` : PASS.
- Frontend : `npm run lint` PASS, `npx tsc --noEmit` PASS, `npm run build` PASS.

---

## Phase 7 — Emploi du temps : ce qui a été fait

### Backend (`backend/`)
- `RoomController` : CRUD des salles (scoping école, `school_id` forcé pour l'admin
  établissement, compteur `schedules_count`).
- `ScheduleController` : CRUD des créneaux (scoping école via `class->program->school`,
  enseignant : ne voit que ses créneaux ou non affectés).
- FormRequests : `StoreRoomRequest`, `UpdateRoomRequest`, `StoreScheduleRequest`,
  `UpdateScheduleRequest` (validation `day_of_week`, `start/end_time H:i`).
- Resources : `RoomResource`, `ScheduleResource` (class/subject/teacher/room/academic_year imbriqués).
- Permissions ajoutées : `rooms.*`, `schedule.*` (`admin_system`/`admin_establishment` full CRUD,
  `teacher`/`student` view) + routes `/rooms` et `/schedules` dans `routes/api.php`.
- Tests : `ScheduleModuleTest` (8 tests).

### Frontend (`frontend/`)
- Types ajoutés : `Room`, `Schedule`, `DayOfWeek`.
- `lib/schedule-api.ts` : `fetchRooms`, `createRoom`, `updateRoom`, `deleteRoom`,
  `fetchSchedules`, `createSchedule`, `updateSchedule`, `deleteSchedule`.
- Page `/dashboard/schedule` : vue **grille hebdomadaire** (Lun–Dim) par classe + année
  scolaire, ajout/suppression de créneaux, et onglet **Salles** (CRUD salle).
- Sidebar : l'élément `/dashboard/schedule` utilise désormais la permission `schedule.view`.
- Clés i18n ajoutées : `fr.json`, `en.json`, `ar.json`.

### Vérifications
- `php artisan test` : **70 tests / 193 assertions PASS**.
- `vendor/bin/pint --test` : PASS.
- Frontend : `npm run lint` PASS, `npx tsc --noEmit` PASS, `npm run build` PASS.

---

## Phase 8 — Documents & communication : ce qui a été fait

### Backend (`backend/`)
- `AnnouncementController` : CRUD des annonces (scoping école pour l'admin établissement,
  visibles selon l'audience ; génération d'une notification par utilisateur ciblé lors de la
  publication ; `is_published` calculé via `published_at` + `expires_at`).
- `UserNotificationController` : liste des notifications de l'utilisateur connecté,
  compteur non-lues, marquer comme lue / tout marquer comme lue.
- `DocumentController` : upload (`Storage::disk('local')`, dossier `documents/`), liste,
  téléchargement (réponse streamée), mise à jour métadonnées/remplacement de fichier,
  suppression ; scoping école + visibilité `is_private` (privé : propriétaire / admins école).
- FormRequests : `StoreAnnouncementRequest`, `UpdateAnnouncementRequest`,
  `StoreDocumentRequest`, `UpdateDocumentRequest` (validation `mimes:pdf,doc,...`,
  taille max 20480 Ko).
- Resources : `AnnouncementResource`, `UserNotificationResource`, `DocumentResource`
  (auteur / classe / filière imbriqués ; `size_human` ; `download_url`).
- Permissions ajoutées : `announcements.*`, `notifications.*`, `documents.*`
  (`admin_system`/`admin_establishment` full CRUD, `teacher` announcements.view +
  documents.view/create, `student` view) + routes `/announcements`, `/notifications`,
  `/documents` dans `routes/api.php`.
- Modèles : `Announcement` (+ accesseur `is_published`), `User` (+ helper `isStudent()`).
- Tests : `CommunicationModuleTest` (10 tests).

### Frontend (`frontend/`)
- Types ajoutés : `Announcement`, `AnnouncementAudience`, `UserNotification`, `Document`.
- `lib/communication-api.ts` : `fetchAnnouncements`, `createAnnouncement`,
  `updateAnnouncement`, `deleteAnnouncement`, `fetchNotifications`, `fetchUnreadCount`,
  `markNotificationRead`, `markAllNotificationsRead`, `fetchDocuments`, `createDocument`
  (multipart), `updateDocument`, `deleteDocument`, `downloadDocument` (téléchargement blob
  via le Bearer token).
- Page `/dashboard/announcements` : liste triée (publiée/brouillon, audience),
  création/édition via `Modal`, suppression via `ConfirmDialog` (permissions gérées).
- Page `/dashboard/documents` : upload multipart, filtre par catégorie, badge visibilité,
  téléchargement, suppression.
- Page `/dashboard/notifications` : remplace le placeholder — liste des notifications de
  l'utilisateur, marquer comme lue (clic) / tout marquer comme lue.
- Sidebar : éléments `/dashboard/announcements` et `/dashboard/documents` (permission-gated),
  `/dashboard/notifications` gated par `notifications.view`.
- Clés i18n ajoutées : `announcements`, `documents`, `notifications` complété — `fr.json`,
  `en.json`, `ar.json`.

### Vérifications
- `php artisan test` : **80 tests / 233 assertions PASS**.
- `vendor/bin/pint --test` : PASS.
- Frontend : `npm run lint` PASS, `npx tsc --noEmit` PASS, `npm run build` PASS.

---

## Phase 9 — Rapports & analytics : ce qui a été fait

### Backend (`backend/`)
- `ReportController` : 4 endpoints de statistiques agrégées, scopés par école
  (`admin_establishment` forcé sur son école, `admin_system` passe `school_id`) et filtrables
  par `academic_year_id` (défaut : année courante de l'école).
  - `GET /reports/summary` : compteurs (étudiants, actifs, enseignants, classes, filières,
    évaluations) + moyenne des notes + taux de présence globaux.
  - `GET /reports/students` : répartition par statut, genre, classe et filière.
  - `GET /reports/grades` : moyenne globale, taux de réussite (notes ≥ 10), moyenne par classe
    et par matière (filtre année).
  - `GET /reports/attendance` : total/points de présence, taux global, par statut et par classe.
- Scoping : `Grade`/`Assessment`/`AttendanceRecord` traversent `classes → program → school`
  (table `classes` via `SchoolClass`, table des programmes avec `school_id`).
- Permissions : `reports.view`, `reports.generate` (déjà présentes dans le seeder,
  re-seedées DB) ; routes `/reports/*` avec `permission:reports.view` dans `routes/api.php`.
- Tests : `ReportModuleTest` (7 tests).

### Frontend (`frontend/`)
- Types ajoutés : `ReportSummary`, `StudentDistribution`, `GradeAnalytics`,
  `AttendanceAnalytics`, `CountSlice`, `ClassCountSlice`, etc.
- `lib/report-api.ts` : `fetchReportSummary`, `fetchStudentDistribution`, `fetchGradeAnalytics`,
  `fetchAttendanceAnalytics`.
- Page `/dashboard/reports` : cartes KPI + filtres par année scolaire + barres CSS pour
  répartition des étudiants (classe/filière/statut/genre), moyennes par classe et présences.
  Accès protégé par `reports.view`.
- Sidebar : élément `/dashboard/reports` (permission `reports.view`).
- Clés i18n ajoutées : `reports` — `fr.json`, `en.json`, `ar.json`.

### Vérifications
- `php artisan test` : **87 tests / 258 assertions PASS**.
- `vendor/bin/pint --test` : PASS.
- Frontend : `npm run lint` PASS, `npx tsc --noEmit` PASS, `npm run build` PASS.

---

## Phase 10 — Production : ce qui a été fait

### Déploiement Docker (`docker-compose.yml`)
- `docker-compose.yml` orienté production : secrets obligatoires via `.env`
  (`APP_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD`), variables à base de
  `${VAR:?...}` pour échouer tôt si mal configuré.
- Healthchecks actifs : `database` (pg_isready), `redis` (redis-cli ping),
  `backend` (`GET /api/v1/health`), `frontend` (fetch `/`).
- `depends_on` avec conditions `service_healthy` pour l'ordre de démarrage fiable.
- `backend` : `FILESYSTEM_DISK=local`, `REDIS_PASSWORD`, `SEED_DEMO` (défaut `false`),
  volume persistant `backend_storage`, ports backend/frontend/DB configurables.

### Backend (`backend/`)
- `docker/entrypoint.sh` : attend la base (netcat), `migrate --force`, seed idempotent,
  `storage:link`, `config:cache` + `route:cache`, puis démarre supervisor (nginx + php-fpm).
- Dockerfile : ajoute `netcat-openbsd`, `chmod +x` l'entrée, passe `ENTRYPOINT` au script.
- Nouvelle commande `php artisan app:ensure-bootstrap` : seed `RolesAndPermissionsSeeder`
  (idempotent) + création d'un admin système de démo **uniquement** si la table `users` est
  vide et `--seed-demo` (ou env local/testing) — pas de tinker requis en production.
- `.env.ci` : configuration headless (sqlite, cache array, `BCRYPT_ROUNDS=4`) pour la CI.

### CI / ENV
- `.github/workflows/ci.yml` : jobs **backend** (composer, key:generate, pint --test,
  `php artisan test`) et **frontend** (npm ci, lint, tsc --noEmit, build) à chaque push/PR.
- `.env.example` (racine) : modèle pour docker-compose (secrets + mapping de ports).
- `frontend/.env.production.example` : modèle `NEXT_PUBLIC_API_URL` de production.
- `.gitignore` : `.env`, `.env.docker.local`, `backups/`.

### Backups
- `scripts/backup.sh` : dump Postgres (`pg_dump ... | gzip`) + archive `storage` du conteneur
  backend dans `./backups/<timestamp>/`.

### Vérifications
- `php artisan test` : **87 tests / 258 assertions PASS**.
- `vendor/bin/pint --test` : PASS.
- Frontend : `npx tsc --noEmit` PASS.
- YAML validés (docker-compose.yml, ci.yml) via PyYAML ; commande `app:ensure-bootstrap`
  testée sur DB vierge (crée l'admin démo) et idempotente sur DB existante.

### À faire manuellement au moment du déploiement réel
- Renseigner `.env` (surtout `APP_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD`).
- Devant un reverse proxy HTTPS (Nginx/Caddy) : terminer TLS, définir `APP_URL` et
  `NEXT_PUBLIC_API_URL` sur les domaines réels, ajuster `CORS_ALLOWED_ORIGINS` et les en-têtes.
- Programmer les sauvegardes (cron) via `scripts/backup.sh`.

---

## Problème rencontré et corrigé : « CSRF token mismatch »

### Cause
Laravel Sanctum était en mode **`statefulApi()`** (`backend/bootstrap/app.php`).
Ce mode traite les requêtes venant de `localhost:3000` comme « stateful » (session/cookie)
et exige l'en-tête `X-XSRF-TOKEN` sur chaque POST/PUT/DELETE. Après un `migrate:fresh`,
le cookie `XSRF-TOKEN` du navigateur ne correspondait plus à la session serveur
fraîche → erreur 419 « CSRF token mismatch ».

Or l'application est **purement token-bearer** (JETON stocké dans `localStorage`,
aucun cookie). Le mode stateful n'était donc pas nécessaire.

### Correctif
Retiré `$middleware->statefulApi();` dans `backend/bootstrap/app.php`.
L'API est désormais entièrement stateless, l'authentification reste portée par
l'en-tête `Authorization: Bearer <token>`, conforme à l'architecture du frontend.

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->alias([
        'permission' => CheckPermission::class,
    ]);
})
```

### Pour reprendre / utiliser
- Serveurs : backend `php artisan serve` sur `http://127.0.0.1:8000`,
  frontend `npm run dev` sur `http://localhost:3000`.
- Base re-seedée (démo) : `php artisan migrate:fresh --seed --force`.
- Navigation : ouvrir `http://localhost:3000` en **navigation privée / incognito**
  (pour ne pas garder les vieux cookies) puis se connecter.

---

## Comptes de démo (mot de passe : `password`)

| Rôle | Email |
|------|-------|
| Admin système | `admin@example.com` |
| Admin établissement | `admin.establishment@example.com` |
| Enseignant | `teacher@example.com` |
| Étudiant | `student@example.com` |

---

## Étapes restantes / suite recommandée

1. **Vérifier sur le site** : `/dashboard/attendance` (créer une séance, saisir les présences)
   et `/dashboard/schedule` (voir la grille, ajouter un créneau, gérer les salles).
2. Sur l'admin système, si les permissions `rooms.*` / `schedule.*` n'apparaissent pas,
   re-seeder : `php artisan db:seed --class=RolesAndPermissionsSeeder --force`.
3. Re-exécuter `php artisan test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`
   après toute modification.

---

## Commandes utiles

```bash
# Backend
cd backend
php artisan serve                       # serveur API (port 8000)
php artisan test                        # tests feature/unit
vendor/bin/pint                         # formatage style
php artisan migrate:fresh --seed --force # reset + démo

# Frontend
cd frontend
npm run dev                             # serveur dev (port 3000)
npm run lint
npx tsc --noEmit
npm run build
```
