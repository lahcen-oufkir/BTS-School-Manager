# BTS School Manager — Complete Project Guide

**A beginner-friendly, phase-by-phase tour of the whole project.**

This is a plain-English guide written for people who have **no prior knowledge** of
this project. You don't need to be a developer to follow the first parts, but each
phase also includes the **key code** (backend + frontend) so that developers can learn
how the system is built.

---

## 📚 Start here

| File | What it covers |
|------|----------------|
| [00-overview.md](00-overview.md) | What the app is, the technology, and the architecture (**start here**) |
| [01-phase1-foundation.md](01-phase1-foundation.md) | Phase 1 — Technical foundation, database & authentication |
| [02-phase2-administration.md](02-phase2-administration.md) | Phase 2 — Managing schools, users, roles, years, programs, classes, subjects |
| [03-phase3-students.md](03-phase3-students.md) | Phase 3 — Managing students |
| [04-phase4-teachers.md](04-phase4-teachers.md) | Phase 4 — Managing teachers |
| [05-phase5-grades.md](05-phase5-grades.md) | Phase 5 — Notes / grades and assessments |
| [06-phase6-attendance.md](06-phase6-attendance.md) | Phase 6 — Attendance (presence/absence) |
| [07-phase7-schedules-rooms.md](07-phase7-schedules-rooms.md) | Phase 7 — Timetables (schedules) and rooms |
| [08-phase8-communication-documents.md](08-phase8-communication-documents.md) | Phase 8 — Announcements, notifications and documents |
| [09-phase9-reports-analytics.md](09-phase9-reports-analytics.md) | Phase 9 — Reports and analytics |
| [10-phase10-production.md](10-phase10-production.md) | Phase 10 — Production, Docker, CI and backups |

All screenshots live in the **[screenshots/](screenshots/)** folder.

---

## 🧩 The big picture

**BTS School Manager** is a web application that helps vocational (BTS) schools in
Morocco manage everything about their day-to-day life in one place:

- **Students** (personal profiles, guardians, the class they belong to)
- **Teachers** (profiles and which subjects they teach)
- **Classes, programs and subjects**
- **Grades** (marks students get in assessments/exams)
- **Attendance** (who is present, absent, late...)
- **Timetables** (weekly schedule per class) and **rooms**
- **Announcements and notifications** (school news)
- **Documents** (upload and download files)
- **Reports** (statistics: averages, attendance rates, student distribution)

The whole project was built in a series of **11 phases (0 to 10)**. Each phase adds
one coherent chunk of functionality, which makes the project easy to understand and
easy to test. This guide walks through each phase in order.

> **A word of caution for newcomers:** the original project files (README, REPORTS,
> code comments) are mostly written in **French**. This guide translates the important
> ideas into **English** and adds code explanations, but you may see French text in
> screenshots and in the code.

---

## 🧑‍🎓 Who uses it?

The application has **4 different roles**. This is at the heart of how the system
controls who can do what.

| Role | What the person can do |
|------|------------------------|
| `admin_system` | Super-administrator: manages the whole platform, all schools, all users. |
| `admin_establishment` | Runs a single school: manages students, teachers, classes, grades, attendance... |
| `teacher` | Marks grades, takes attendance, sees their timetable. |
| `student` | Sees their own profile, grades, attendance, timetable and announcements. |

Every action is protected by a **permission** (a small string like `students.create`).
The backend checks the permission before doing anything, so security is always enforced
on the server — not just hidden in the interface.

---

## 🛠 Technologies

| Layer | Technology | Why it is used |
|-------|-----------|----------------|
| **Frontend (the screen the user sees)** | Next.js 16 + TypeScript | A modern React framework for building web interfaces |
| **Frontend styling** | Tailwind CSS 4 | Makes pages look clean with ready-made style classes |
| **Backend (the logic)** | Laravel 13 + PHP 8.3 | The server that handles all the "thinking", validation and rules |
| **API / Auth** | REST + Laravel Sanctum | A set of web addresses (`/api/v1/...`) that the frontend calls; Sanctum handles secure logins |
| **Database** | PostgreSQL 16 | Where all the data (students, grades...) is stored |
| **Cache / Queue** | Redis 7 | Speeds things up and handles background jobs |
| **Containers** | Docker + docker-compose | Packages the app so it runs the same anywhere |

---

## 🏗 Architecture in plain English

Think of the application as a **restaurant**:

- The **customer** is the person using a web browser.
- The **waiter** is the **frontend** (Next.js). It talks to the customer and shows them
  nicely organised information.
- The **kitchen** is the **backend** (Laravel). It does all the real work: it checks that
  you're allowed to do something, applies the rules, and reads/writes the data.
- The **pantry** is the **database** (PostgreSQL) where all ingredients (data) are kept.

```
Browser (you)
   │  HTTPS
   ▼
Next.js / TypeScript  ->  the frontend (waiter)
   │  REST calls to /api/v1
   ▼
Laravel backend  ->  the kitchen (all rules + validation + security)
   ├── PostgreSQL  (the pantry / database)
   ├── Redis       (fast memory cache)
   └── File storage
```

**Key rule:** the frontend **never talks to the database directly**. Every request goes
through the backend. This keeps the system safe, because the backend always validates
data and checks permissions.

---

## 🗺 The phases at a glance

| Phase | Name | What was delivered |
|:-----:|------|--------------------|
| 0 | Product foundation | Specifications & architecture planning |
| 1 | Technical foundation | Docker, Laravel, Next.js, database, auth, design system, i18n |
| 2 | Administration | Users/roles, schools, academic years, programs, classes, subjects |
| 3 | Students | Profiles, guardians, enrollment/class, statuses |
| 4 | Teachers | Profiles, subject assignments |
| 5 | Grades | Assessments, score entry, publish/lock |
| 6 | Attendance | Sessions, present/absent/late/justified records |
| 7 | Schedules & rooms | Weekly slots per class + room management |
| 8 | Documents & communication | Announcements, notification center, document upload/download |
| 9 | Reports & analytics | KPI summary, student distribution, grade averages, attendance rates |
| 10 | Production | Docker healthchecks, CI, backups, env examples |

> **Note:** the "raw" project reports mark Phases 1–3 as `Done` and Phases 4–10 as
> `Done (code)` — meaning the code is written and tests pass, but some are still being
> reviewed on the live site.

Now continue with **[00-overview.md](00-overview.md)** for the full walkthrough, or jump
to any phase file above. Each phase file explains:
1. **What the phase does** (plain English)
2. **How it looks** (screenshots)
3. **How the code works** (backend API + frontend page)
