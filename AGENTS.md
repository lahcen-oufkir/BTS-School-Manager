# AGENTS.md — BTS School Manager

Rules and conventions for AI agents (and humans) working on this repository.

## Project

Système de gestion scolaire pour établissements BTS au Maroc.
Reference document: `Plan_Complet_Systeme_Gestion_BTS_Maroc.pdf`.

- Frontend: Next.js 16 + TypeScript + Tailwind CSS 4 (`frontend/`)
- Backend: Laravel 13 + PHP 8.3 + Sanctum (`backend/`)
- Database: PostgreSQL (SQLite for local dev)
- Cache/Queue: Redis
- Containers: Docker + docker-compose at repo root

## Commands

### Backend (`backend/`)

```bash
php artisan migrate --seed        # migrate + seed roles/permissions + demo users
php artisan migrate:fresh --seed  # reset everything
php artisan serve                 # dev server on :8000
vendor/bin/pint                   # code style (must pass)
php artisan test                  # run all tests
```

### Frontend (`frontend/`)

```bash
npm run dev       # dev server on :3000
npm run lint      # eslint (must pass)
npm run build     # production build (must pass)
npx tsc --noEmit  # type check
```

## Rules

- Read this file and the reference planning document before any important modification.
- Inspect existing code before creating new files. Reuse existing components and services.
- Avoid duplication.
- Use Laravel migrations for all database changes. Validate the full schema before generating migrations.
- Never bypass security to fix a problem quickly. Permissions are enforced server-side via
  the `permission:*` middleware; frontend checks only improve UX.
- Always add tests for important business logic. Never delete failing tests — fix the code.
- Keep controllers thin. Do not put complex business logic in UI components.
- Every new model must follow the Laravel 13 attribute style (`#[Fillable]`, `#[Hidden]`, `casts()`).
- Every new page in the frontend must be a client component that uses `useI18n()` for text.
  Never hard-code user-facing strings in components — use translation keys in `messages/{fr,en,ar}.json`.
- Document important decisions.

## Mission format

Each implementation task must be specified as an OpenCode mission with:

- OBJECTIF (goal)
- EXIGENCES (requirements)
- CHANGEMENTS BASE DE DONNÉES (DB migrations)
- CHANGEMENTS API (endpoints)
- EXIGENCES UI (UI requirements)
- PERMISSIONS (required role permissions)
- VALIDATION (rules)
- TESTS (tests to add)
- CRITÈRES D'ACCEPTATION (definition of done)
- FICHIERS AUTORISÉS / À NE PAS MODIFIER (allowed / forbidden files)

After the task, report: IMPLEMENTÉ, FICHIERS MODIFIÉS, CHANGEMENTS BASE DE DONNÉES,
ENDPOINTS API, TESTS EXÉCUTÉS, RÉSULTATS, PROBLÈMES CONNUS, ÉTAPE SUIVANTE.

## Definition of done

A feature is NOT done when the code compiles. It is done when UI, API, database,
permissions, validation, error/loading/empty states, tests, responsive design and
documentation are coherent.

## Status of phases

- Phase 0 — done (product foundation)
- Phase 1 — done (technical foundation: Docker, Laravel, Next.js, DB schema, auth, design system, i18n)
- Phase 2 — done (administration: users/roles, schools, academic years, programs, classes, subjects)
- Phase 3 — done (students: profiles, guardians, enrollment/status)
- Phase 4 — done (teachers: profiles, subject assignments)
- Phase 5 — done (grades: assessments, score entry, publish/lock)
- Phase 6 — done (attendance: sessions, presence/absence/late/justified records)
- Phase 7 — done (schedules: weekly slots per class + rooms management)
- Phase 8 — done (documents & communication: announcements + notifications center + document upload/download)
- Phase 9 — done (reports & analytics: summary KPIs, student distribution, grade averages, attendance rates)
- Phase 10 — done (production: docker healthchecks, startup entrypoint + migrations/seeding, CI, backups, env examples)

## Phase 2 notes

- Programs, academic years and schools are managed under the `settings.view` / `settings.update` permissions
  (no `programs.*` / `academic_years.*` permission exists). Classes use `classes.*`, subjects `subjects.*`, users `users.*`.
- School scoping: `admin_establishment` only reads/manages their own `school_id`; `admin_system` sees everything.
  Only `admin_system` can create/manage schools (and admin roles). Establishment admins lack `users.delete`.
- Academic year `is_current` is exclusive per school (setting one clears the others).
- Frontend admin pages live under `/dashboard/admin/*` (users, schools, academic-years, programs); classes/subjects
  pages were created in Phase 1 as placeholders and now implement full CRUD.

## Roles and permissions

Roles: `admin_system`, `admin_establishment`, `teacher`, `student`.
Permissions use `module.action` keys seeded in `RolesAndPermissionsSeeder`.
Auth endpoint includes role permissions for the logged-in user.

## Phase 3 notes

- Students use `students.view/create/update/delete` (`admin_system` + `admin_establishment` full CRUD;
  `teacher` and `student` have `students.view`).
- School scoping mirrors Phase 2: `admin_establishment` only sees/manages students of their `school_id`.
- Store/update accept an optional `class_id` (assigns the student to a class for the class's current academic
  year) and an optional `guardian` object. Enrollment keeps `enrollments` + `class_students` in sync.
- `StudentResource` reports nested `guardians`, `guardians_count`, and a `current_class` summary.
- `list` supports `search` / `status` / `class_id` / `school_id` filters.
- Frontend page: `/dashboard/students` (full CRUD with search, status filter, class + guardian form).

## Phase 5 notes

- Grades use `grades.view/create/update/delete` (`admin_system` + `admin_establishment` full CRUD; `teacher` has
  `grades.view/create/update` and auto-assigns the assessment to the teacher). `student` has no grades permissions.
- Schema: `assessments` (school-scoped, class/subject/academic_year, type in exam/quiz/homework/practical/project/
  continuous, max_score, weight, is_published, is_locked) and `grades` (assessment_student, score, comment,
  published_at, unique [assessment_id, student_id]).
- Grade entry only accepts students pre-enrolled in the class (`enrollments`/`class_students`), never arbitrary ids.
- Once `is_published`, grades can no longer be updated; `lock` freeze entry (idempotent).
- `AssessmentResource` reports nested `class`/`subject`/`teacher`, `grades_count`, `students_count`, and `average`.
- `User::isTeacher()` exists; teachers may only create/grade assessments where they are the assigned teacher
  (`teacher_id`) unless scoped as admin.
- Frontend page: `/dashboard/grades` (assessment CRUD, filters class/subject/search, grade entry, publish/lock).

## Phase 4 notes

- Teachers use `teachers.view/create/update/delete` (`admin_system` + `admin_establishment` full CRUD;
  `teacher` and `student` roles have NO `teachers.*` permission and cannot access the endpoint at all).
- School scoping mirrors Phase 2/3: `admin_establishment` only manages teachers of their `school_id`.
- Optional `subject_ids[]` on store/update syncs the `teacher_subject_assignments` pivot (subjects taught).
- `TeacherResource` reports nested `school`, `subjects`, and `assignments_count`.
- `list` supports `search` / `specialization` / `is_active` / `school_id` filters.
- Frontend page: `/dashboard/teachers` (full CRUD with search, subject assignment checkboxes, active toggle).

## Phase 6 notes

- Attendance uses `attendance.view/create/update` (`admin_system` + `admin_establishment` full CRUD;
  `teacher` has view/create/update and auto-assigns the session to the teacher; `student` has view only).
- Schema: `attendance_sessions` (class/subject/teacher/date/start/end) and `attendance_records`
  (session+student, status in present/absent/late/justified, justification, unique [session, student]).
- `stream` endpoint returns enrolled students (`enrollments`/`class_students`) with their recorded
  status (defaults to `present` when none saved), mirroring the grades `grade-stream` pattern.
- `AttendanceSessionResource` reports nested `class`/`subject`/`teacher` plus per-status counts.
- Frontend page: `/dashboard/attendance` (session list, filters class/subject/date, inline marking view).

## Phase 7 notes

- New permissions `rooms.*` and `schedule.*` were added to the seeder (`admin_system` + `admin_establishment`
  full CRUD; `teacher` and `student` have `rooms.view`/`schedule.view`). The sidebar `/dashboard/schedule`
  item now uses `schedule.view`.
- `rooms`: school-scoped; establishment admin has `school_id` forced (validation requires it only for non-establishment).
- `schedules`: scoped via `class->program->school`; `teacher` only sees their assigned slots or unassigned ones.
  `day_of_week` in monday..sunday, `start_time`/`end_time` format `H:i`.
- `ScheduleResource` reports nested `class`/`subject`/`teacher`/`room`/`academic_year`.
- Frontend page: `/dashboard/schedule` — weekly grid (Mon–Sun) filtered by class + academic year, plus a
  Rooms tab (room CRUD).

## Phase 8 notes

- New permissions `announcements.*`, `notifications.*`, `documents.*` (`admin_system` + `admin_establishment`
  full CRUD; `teacher` has announcements.view + documents.view/create; `student` view-only). Seeder updated and
  re-run against the live DB (`php artisan db:seed --class=RolesAndPermissionsSeeder --force`).
- `AnnouncementModel` exposes an `is_published` accessor: `published_at != null && (expires_at == null || expires_at
  is in the future)`. Publishing (creating/updating with `published_at`) auto-generates `user_notifications` rows
  targeted by `audience` (everyone/teachers/students/class/program). Users without an account never get notified.
- `User` model gained `isStudent()`; notification routes only ever return/affect the current user's own rows.
- `Document` uploads are stored on `FILESYSTEM_DISK=local` under `documents/`. `is_private=true` docs are visible
  only to the owner, the school admin, or system admin; `false` = shared school-wide. List is school-scoped.
- Frontend pages: `/dashboard/announcements`, `/dashboard/documents`, `/dashboard/notifications` (replaces the
  placeholder). Document download is done client-side via a blob fetch so the Bearer token is included.
- `CommunicationModuleTest` (10 tests) mirrors the Pattern from `AttendanceModuleTest`/`ScheduleModuleTest`. Current
  full backend suite: **80 tests / 233 assertions**. Frontend: `npm run lint`, `npx tsc --noEmit`, `npm run build`
  all green.

## Phase 9 notes

- `ReportController` exposes 4 read-only analytics endpoints: `/reports/summary`, `/reports/students`,
  `/reports/grades`, `/reports/attendance`. All are school-scoped and filterable by `academic_year_id`
  (defaults to the school's current academic year).
- Scoping chain for grade/assessment/attendance aggregates: `Grade → Assessment.class_id → classes.program_id
  → programs.school_id`. The `SchoolClass` model maps to the `classes` table; `Program` owns `school_id`.
- Establishment admins are force-scoped to their `school_id` by the controller; system admins pass `school_id`.
- Permissions `reports.view`/`reports.generate` already existed in the seeder (`admin_system`,
  `admin_establishment`, `teacher`, `student` all get `reports.view`); re-seeded into the live DB.
- Frontend page `/dashboard/reports` is guarded by `reports.view` (denied view for others). Uses only CSS bars
  (no chart library). `ReportModuleTest` (7 tests); full backend suite now **87 tests / 258 assertions**.

## Phase 10 notes

- Docker Compose is production-oriented: secrets required via `.env` (`APP_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD`)
  using `${VAR:?...}` to fail fast. Healthchecks + `depends_on: condition: service_healthy` for DB/Redis/backend/frontend.
- `backend/docker/entrypoint.sh` is the container ENTRYPOINT: waits for DB (netcat), `migrate --force`,
  idempotent seed, `storage:link`, `config:cache`/`route:cache`, then starts supervisord (nginx + php-fpm).
- New artisan command `app:ensure-bootstrap` seeds `RolesAndPermissionsSeeder` idempotently and only creates a
  demo system admin when the `users` table is empty AND `--seed-demo` is passed (or env is local/testing). It does
  NOT depend on tinker, so it works in the `--no-dev` production image. `SEED_DEMO` env (default `false`) controls it.
- `scripts/backup.sh` (bash) dumps Postgres + backend `storage/app` from the running containers into `./backups/<stamp>/`.
- CI: `.github/workflows/ci.yml` runs backend (pint --test + `php artisan test`, env from `backend/.env.ci`) and
  frontend (lint, `tsc --noEmit`, build) on push/PR. `backend/.env.ci` is tracked and headless (sqlite/array).
- `.env.example` (root) is the compose template; `frontend/.env.production.example` for `NEXT_PUBLIC_API_URL`.
- Real HTTPS (reverse proxy/TLS), domain `APP_URL`/`NEXT_PUBLIC_API_URL`, CORS origins and scheduled backups
  are left as manual deployment steps documented in REPORT.md and README.md.
