# EntryDesk — Agent Briefing

> **READ THIS FIRST. Then read ONLY what you need. Never scan random files.**
> This file gives you the full mental model. Follow the links below for specifics.

---

## What Is EntryDesk?

A **Next.js 16 / React 19 / TypeScript** karate tournament management platform.  
Coaches manage dojos & students. Organisers run tournaments. Parents register their kids via a coach-shared link. No Supabase — uses **Neon Postgres** directly via the `postgres` npm package.

**Roles:** `coach` | `organizer` | `admin` (in `users.role`) + **parent** (separate `guardian_accounts` table)

---

## 📁 Codebase Map — Stop Here, Navigate Surgically

```
EntryDesk-Live/
├── AGENTS.md                    ← YOU ARE HERE
├── .agents/
│   ├── rules/
│   │   ├── conventions.md       ← coding rules, patterns, DO/DON'T
│   │   ├── db-schema.md         ← full DB schema reference (fast lookup)
│   │   └── api-routes.md        ← all API routes + server actions map
│   └── modules/
│       ├── students.md          ← students module deep-dive
│       ├── events.md            ← events & entries module deep-dive
│       ├── parent-portal.md     ← parent portal deep-dive
│       └── auth.md              ← auth system deep-dive
├── src/
│   ├── app/
│   │   ├── api/                 ← Next.js API routes
│   │   │   ├── auth/            → otp/, google-join/, logout/, session/
│   │   │   ├── email/
│   │   │   ├── id-card/
│   │   │   ├── public-events/
│   │   │   └── upload/
│   │   ├── auth/                ← login/signup pages
│   │   ├── dashboard/           ← COACH + ORGANISER views
│   │   │   ├── page.tsx         ← main dashboard (33KB) — coach+organiser combined
│   │   │   ├── students/        → page.tsx, actions/index.ts
│   │   │   ├── events/          → page.tsx, [id]/, actions/
│   │   │   ├── entries/         → [eventId]/, actions/
│   │   │   ├── approvals/       → page.tsx, actions/
│   │   │   ├── dojos/
│   │   │   ├── parent-entries/
│   │   │   └── events-browser/
│   │   ├── parent/              ← PARENT PORTAL
│   │   │   ├── page.tsx         ← parent home
│   │   │   ├── layout.tsx       ← parent layout + nav
│   │   │   ├── children/
│   │   │   ├── entries/
│   │   │   ├── actions.ts       ← parent server actions
│   │   │   └── entry-actions.ts ← parent entry server actions (14KB)
│   │   ├── join/[slug]/         ← parent dojo join flow
│   │   ├── login/
│   │   ├── v/                   ← volunteer check-in
│   │   └── page.tsx             ← public landing page
│   ├── components/
│   │   ├── ui/                  ← shadcn/ui primitives (27 files)
│   │   ├── students/            → student-data-table, student-dialog, student-bulk-upload, student-actions
│   │   ├── events/              → organiser-entries-list (88KB!), entries-table, create-event-dialog, event-settings-form, ...
│   │   ├── coach/               → coach-entries-list (90KB!), coach-add-student-dialog (50KB), coach-overview, parent-entries-table, ...
│   │   ├── parent/              → registration-form (30KB), edit-athlete-dialog, status-timeline, entry-withdraw-dialog, portal-nav, ...
│   │   ├── id-card/             → id-card-preview (49KB), id-card-download, team-cards-print-client
│   │   ├── approvals/           → approval-buttons
│   │   ├── auth/                → compulsory-profile-photo-upload, google-sign-in-button
│   │   ├── app/                 ← app-level shared components
│   │   └── terms-dialog.tsx
│   ├── lib/
│   │   ├── auth/                → session.ts, otp.ts, google.ts, require-role.ts, rate-limit.ts, rate-limit-db.ts, password.ts, profile.ts, add-user.ts
│   │   ├── db/
│   │   │   ├── index.ts         ← DB connection (postgres npm package)
│   │   │   ├── schema.sql       ← FULL schema (read .agents/rules/db-schema.md instead)
│   │   │   └── migrations/001_parent_portal.sql
│   │   ├── email/               → client.ts, notifications.ts (15KB), templates/
│   │   ├── events/              ← events lib helpers
│   │   ├── audit.ts
│   │   ├── category.ts
│   │   ├── date.ts
│   │   ├── image-compression.ts
│   │   ├── qr.ts
│   │   ├── status.ts            ← entry status helpers (5KB)
│   │   ├── utils.ts
│   │   └── validation.ts        ← zod schemas (8KB)
│   ├── types/
│   │   └── database.ts          ← ALL TypeScript types (9KB) — READ THIS for types
│   └── proxy.ts                 ← edge proxy config
```

---

## Tech Stack (Quick Ref)

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| DB | Neon Postgres via `postgres` npm package |
| Auth | Custom OTP (email) + Google OAuth, HttpOnly session cookies |
| Email | Resend | Not confugured yet - just for future use
| Storage | Vercel Blob |
| Forms | react-hook-form + zod v4 |
| Tables | @tanstack/react-table |
| UI | Radix UI primitives + custom shadcn components in `src/components/ui/` |
| Export | jsPDF, jszip, xlsx, html2canvas |
| QR | qrcode |
| Turnstile | @marsidev/react-turnstile (bot protection) |

---

## Key Patterns — ALWAYS Follow These

See → `.agents/rules/conventions.md` for full details.

**TL;DR:**
- DB: `import sql from '@/lib/db'` → use `` sql`...` `` tagged template. Never raw strings.
- Auth: call `requireRole(['coach'])` from `@/lib/auth/require-role` at top of server actions/route handlers.
- Server Actions: live in `actions/index.ts` or `actions.ts` co-located with their page. Use `'use server'` directive.
- Types: import from `@/types/database` — do NOT redefine types inline.
- Env: `APP_BASE_URL` for all generated links. Never hardcode domain.
- Status values: use helpers from `@/lib/status` — never raw strings in UI.
- Migrations: add SQL files to `src/lib/db/migrations/` — never edit `schema.sql` for changes.

---

## DB Tables (Ultra-compact)

See → `.agents/rules/db-schema.md` for full column list.

| Table | Purpose |
|---|---|
| `users` | coaches, organizers, admins — role in `role` col |
| `sessions` | HttpOnly session store |
| `dojos` | coach-owned clubs |
| `students` | athletes (belong to dojo) |
| `guardian_accounts` | parent accounts (separate from users) |
| `events` | tournaments/seminars |
| `event_days` | multi-day breakdowns |
| `categories` | competition divisions per event |
| `event_applications` | coach ↔ event join requests |
| `entries` | student ↔ event participation record |
| `event_collaborators` | shared event access |
| `dojo_collaborators` | shared dojo access |
| `contacts` | public contact form submissions |

---

## Module Docs — Navigate Here for Deep Work

| Module | Doc | Key Files |
|---|---|---|
| Students | `.agents/modules/students.md` | `src/app/dashboard/students/`, `src/components/students/` |
| Events & Entries | `.agents/modules/events.md` | `src/app/dashboard/events/`, `src/components/events/` |
| Parent Portal | `.agents/modules/parent-portal.md` | `src/app/parent/`, `src/components/parent/` |
| Auth | `.agents/modules/auth.md` | `src/lib/auth/`, `src/app/api/auth/` |

---

## Entry Points by Task Type

| Task | Go To |
|---|---|
| Add/edit a student field | `src/components/students/student-dialog.tsx` + `src/app/dashboard/students/actions/index.ts` |
| Change entry status logic | `src/lib/status.ts` then `src/components/events/organiser-entries-list.tsx` |
| Add a DB column | Write migration in `src/lib/db/migrations/` + update `src/types/database.ts` |
| Add API route | `src/app/api/<name>/route.ts` |
| Add server action | co-locate `actions.ts` or `actions/index.ts` next to the page |
| Change email template | `src/lib/email/templates/` + `src/lib/email/notifications.ts` |
| Parent portal change | `src/app/parent/` + `src/components/parent/` |
| ID card change | `src/components/id-card/id-card-preview.tsx` (49KB, very large) |
| Auth flow change | `.agents/modules/auth.md` first |

---

## Anti-Patterns (NEVER DO)

- Never install Supabase — DB is Neon Postgres directly
- Never hardcode `entrydesk.shorinkai.in` — use `APP_BASE_URL` env var
- Never write raw SQL strings — always use `` sql`...` `` tagged template
- Never show raw DB status values in UI — use `@/lib/status` helpers
- Never edit `schema.sql` to make changes — write a safe migration instead keeping in mind that its an active running db and it shouldnt affect running application
- Never redefine types from DB — use `@/types/database`
- Never import from `node_modules` paths when an alias exists (`@/...`)
