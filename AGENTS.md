# EntryDesk — Agent Briefing

> Read this first, then open ONLY the doc for your task. Every doc here was verified against the code
> (last verified 2026-11-09). If you change behaviour, update the matching doc in the same change.

## What it is
Karate tournament entry platform. **Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Postgres (Neon) via the `postgres` package · Vercel Blob for photos · Resend for email (not configured yet).**
Scale target: ~10,000 athletes, ~1,000 coaches (dojos).

## The product flow (one paragraph)
Organiser creates an **event** → **coach** applies (`event_applications`) and organiser approves → coach shares the
**dojo join link** `/join/<dojo.slug>` → **parent** signs in (Google, or email code) and adds an **athlete** with a
photo (`/athlete/new`) → parent **registers** the athlete for an approved event (`/athlete/<id>/register`) →
entry is `pending_coach` → coach **forwards** it (`submitted`) or sends back/declines → organiser **approves**
(`approved`, DB trigger assigns `chest_no`, QR token issued) → parent downloads the **ID card**; volunteers scan `/v/<token>`.

## Roles (all in ONE table: `users.role`)
`parent` · `coach` · `organizer` · `admin`. There is NO `guardian_accounts` table (old docs were wrong).
Coach/organiser/admin are **whitelisted** (an admin adds them; unknown Google emails are stored inactive). Parents
self-register. One session cookie for everyone: `entrydesk_session`. → `.agents/modules/auth.md`

## URL ≠ folder (important)
Public parent URLs are `/athlete/...` but the code lives in `src/app/parent/...`. `next.config.ts` **rewrites**
`/athlete/*` → `/parent/*`, and `src/proxy.ts` redirects `/parent/*` → `/athlete/*`. There is no `src/app/athlete/`.
`src/proxy.ts` is Next 16's replacement for `middleware.ts`.

## Where things are
```
src/app/
  page.tsx, login/, join/[slug]/, v/[token]/, contact/, privacy/, terms/   public
  dashboard/        coach + organiser UI (role decides what renders)
    students/ dojos/ events/ events-browser/ entries/ parent-entries/ approvals/
  parent/           parent portal (served at /athlete/*)  actions.ts, entry-actions.ts
  api/              auth/{otp,otp/verify,google-join,logout,session}  upload/{photo,profile-photo}
                    id-card/[entryId]  public-events  email/preview
src/components/     ui/ (shadcn primitives) + one folder per module (coach, events, parent, students, id-card…)
src/lib/            auth/ db/ email/ events/ status.ts validation.ts audit.ts category.ts date.ts qr.ts
src/lib/db/         schema.sql (base) + migrations/NNN_*.sql (apply in order, by hand, on Neon)
src/types/database.ts   all DB types
```

## Docs index
| Need | Open |
|---|---|
| Tables/columns/triggers | `.agents/rules/db-schema.md` |
| Every route + server action | `.agents/rules/api-routes.md` |
| Code patterns, do/don't | `.agents/rules/conventions.md` |
| Colours, fonts, components | `.agents/rules/design-system.md` |
| Run + test end-to-end locally (safe DB) | `.agents/rules/testing.md` |
| Bugs/risks found, scale limits, hosting | `.agents/rules/known-issues.md` |
| Auth | `.agents/modules/auth.md` |
| Events, entries, statuses | `.agents/modules/events.md` |
| Parent portal + join flow | `.agents/modules/parent-portal.md` |
| Students/athletes | `.agents/modules/students.md` |

## Hard rules
1. **Never test against the Neon database in `.env`.** Use the local Docker DB (`testing.md`).
2. SQL only via the `` sql`...` `` tagged template; **never put `${}` inside a quoted SQL string**
   (`INTERVAL '${n} seconds'` is broken — use `(${n}::int * INTERVAL '1 second')`).
3. Schema changes = a new `src/lib/db/migrations/NNN_*.sql` (additive, idempotent) **and** mirror in `schema.sql`
   and `src/types/database.ts`. The DB is live: never drop/rename in one step.
4. No hard-coded hex colours in components — use design tokens (`design-system.md`).
5. Never render raw status strings; use `src/lib/status.ts`.
6. Email-OTP is for **parents only**; it must never sign in or re-activate a coach/organiser/admin.
7. Dates from the DB are date-only strings: format with explicit locale + `timeZone: 'UTC'` (hydration safety).
8. Links/QR use `NEXT_PUBLIC_BASE_URL` (not a hard-coded domain).
