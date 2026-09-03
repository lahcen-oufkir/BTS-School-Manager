# Phase 0 — Product Foundation & Project Overview

> **For absolute beginners.** This page explains what the product is, who it is for,
> and how the whole system fits together, before we look at any code.

---

## 1. What problem does this solve?

Running a BTS (vocational higher-education) school involves a LOT of admin work:

- Enrolling and tracking **students**
- Hiring and organising **teachers**
- Building **programs, classes, and subjects**
- Recording **grades** and **attendance**
- Building **timetables**
- Sending **announcements** to students and teachers
- Storing **documents**
- Producing **reports** for managers

Before this project, schools did many of these things on paper or in separate tools.
**BTS School Manager** brings them all together into a single, secure, centralised web
application. It serves multiple schools from one platform (that's why it's called a
"multi-établissement" / multi-establishment system).

---

## 2. The four types of users (roles)

| Role | Who has it | Main abilities |
|------|-----------|----------------|
| `admin_system` | The platform owner | Manage every school, every user, all permissions |
| `admin_establishment` | A school's manager | Run one specific school end-to-end |
| `teacher` | A teacher | Enter grades, take attendance, view timetable |
| `student` | A student | View own profile, grades, attendance, timetable, announcements |

A neat consequence of "multi-establishment": an `admin_establishment` user only ever sees
and edits **their own school's** data. This is called **school scoping**, and it's one of
the most important design ideas in the whole project. It is set up in Phase 2 and reused
by every later phase.

---

## 3. Permissions — who can do what

The system uses tiny strings called **permissions**. They look like `students.create`,
`grades.update`, `reports.view`, and so on. The format is always:

```
module.action
```

- `module` = which area (students, grades, attendance, rooms, ...)
- `action` = what you can do (view, create, update, delete, ...)

Each **role** is given a list of permissions. When a user tries to do something, the
**backend** checks whether that user's role has the matching permission. If not, the
request is rejected with an error (HTTP 403 = "forbidden").

> **Why does this matter for beginners?** It explains why a `student` cannot delete a
> student record, or why a `teacher` cannot create a new school. The rules are not just
> hidden buttons in the interface — they are enforced by the server, which is much safer.

Here is the permission map (from `AuthController`), shown as a simple table:

| Permission | system admin | establishment admin | teacher | student |
|------------|:---:|:---:|:---:|:---:|
| `students.view` | ✔ | ✔ | ✔ | ✔ |
| `students.create/update/delete` | ✔ | ✔ | ✖ | ✖ |
| `teachers.*` | ✔ | ✔ | ✖ | ✖ |
| `classes.*`, `subjects.*` | ✔ | ✔ | ✔ (view) | ✔ (view) |
| `grades.*` | ✔ | ✔ | ✔ (view/create/update) | ✔ (view) |
| `attendance.*` | ✔ | ✔ | ✔ (view/create/update) | ✔ (view) |
| `users.*` | ✔ | ✔ (view/create/update, not delete) | ✖ | ✖ |
| `settings.*` | ✔ | ✔ (view) | ✖ | ✖ |
| `reports.view` | ✔ | ✔ | ✔ | ✔ |

---

## 4. The technology stack (recap)

| Layer | Technology | Plain-English role |
|-------|-----------|--------------------|
| Frontend | **Next.js 16 + TypeScript + Tailwind CSS 4** | The visual pages in the browser |
| Backend | **Laravel 13 + PHP 8.3** | Server logic, rules, validation, security |
| API / Auth | **REST (`/api/v1`) + Sanctum tokens** | The "language" frontend ↔ backend speaks |
| Database | **PostgreSQL 16** | Permanent storage of all data |
| Cache | **Redis 7** | Fast temporary memory storage |
| Containers | **Docker + docker-compose** | Packages the app to run anywhere |

The application is **trilingual**: French, English and Arabic. This is handled by an
**i18n** (internationalisation) system set up in Phase 1 — every user-facing sentence is
stored as a *key* and translated into each language.

---

## 5. The architecture (in more detail)

```
Your browser
   │ HTTPS
   ▼
+---------------------------+
| Next.js (frontend)        |  <- draws the screens, collects your clicks
|  + design system (buttons, |
|    cards, forms, badges)   |
|  + i18n (FR/EN/AR)         |
+---------------------------+
   │ calls REST API: GET /api/v1/students, POST /api/v1/students ...
   ▼
+---------------------------+
| Laravel (backend)          |  <- does the REAL work
|  + authentication         |
|  + authorization (permission check)
|  + validation (is the data correct?)
|  + business logic          |
|  + routes (the API map)    |
+---------------------------+
   │
   ├── PostgreSQL  (the database: tables of students, grades, ...)
   ├── Redis       (memory cache for speed)
   └── File storage (uploads: photos, documents)
```

**The golden rule to remember:** the frontend NEVER talks to the database directly.
Every piece of data passes through the (Laravel) backend. This is what keeps the system
secure and consistent.

---

## 6. How the folders are organised

```
BTS-School-Manager/
├── frontend/          -> the Next.js web app (what the user clicks)
│   ├── app/           -> pages (login, dashboard, students, grades, ...)
│   ├── components/    -> reusable building blocks (buttons, tables, cards)
│   ├── lib/           -> code that talks to the API + shared types
│   └── messages/      -> translations (fr.json, en.json, ar.json)
├── backend/           -> the Laravel API (the "kitchen")
│   ├── app/Http/Controllers/...  -> the logic for each feature
│   ├── app/Models/    -> the data models (Student, Teacher, Grade, ...)
│   ├── database/migrations/ -> the database structure ("recipes")
│   └── routes/api.php -> the map of API addresses
├── scripts/backup.sh  -> backup helper
├── docker-compose.yml -> how all the services start together
└── docs/guide/        -> THIS documentation
```

---

## 7. Demo accounts

For testing, the project seeds a handful of demo users (all with password `password`):

| Role | Email |
|------|-------|
| System admin | `admin@example.com` |
| Establishment admin | `admin.establishment@example.com` |
| Teacher | `teacher@example.com` |
| Student | `student@example.com` |

> Use the **system admin** account to see everything, because it has all permissions.

---

## ✅ Phase 0 deliverable

Phase 0 produced the **specifications and architecture** described on this page: the
product scope, the roles, the permission model, the technology choices, and the
11-phase roadmap. Everything in Phases 1–3 (and beyond) is built on top of this plan.

Next: **[01-phase1-foundation.md](01-phase1-foundation.md)** — where the actual code
starts, in Phase 1.
