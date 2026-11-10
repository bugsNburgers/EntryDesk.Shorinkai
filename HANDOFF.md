# EntryDesk — Handoff for implementation (written 2026-11-09)

Audience: Claude Opus 5.5 (medium) implementing the next round of changes. Everything below was verified by reading the code
and running the app end to end on a **local throwaway Postgres**. Read `AGENTS.md` first, then only the `.agents/*` doc you need.

## 0. Context
EntryDesk is a Next.js 16 / React 19 / Postgres (Neon) karate entry platform. Flow: organiser creates event → coach applies, organiser
approves → coach shares dojo join link `/join/<slug>` → parent signs in (Google; email-code fallback) and adds an athlete with photo →
registers athlete for an approved event → coach reviews/forwards → organiser approves (chest number + QR) → ID card.
The entries are then used to run the tournament in **RingFlow** (separate app: `D:\symm\symmetrical-memory\RingFlow-CISCE`).
Scale target: ~10,000 athletes, ~1,000 coaches. Hosting: Vercel + Neon + Vercel Blob (photos). **Business model: no payments in the
app.** Coaches collect fees from parents; the owner is paid in cash by organisers. So there is no payment code and none should be added.

### Non-negotiables
1. **Never run anything against the Neon DB in `.env`.** Only read-only queries if you must inspect it. Use the Docker DB (`.agents/rules/testing.md`).
2. Production is live: migrations must be additive, idempotent, and safe to run while the app is running. The owner runs them by hand on Neon.
3. Do not commit or push unless asked. Leave a clean, reviewable working tree; if asked, one commit per task below.
4. `npx tsc --noEmit` must exit 0 after every task. Keep `.agents/*` docs in sync with behaviour you change.
5. No hard-coded hex colours (design tokens, `.agents/rules/design-system.md`). No `${}` inside a quoted SQL literal.

## 1. State of the working tree (my uncommitted work — review, then commit as a baseline first)
41 changed paths. Suggest the first action is a baseline commit of these so later diffs are separable:
- **Security/bug fixes**: `src/lib/auth/otp.ts` (INTERVAL bind-param bug), `src/app/api/auth/otp/verify/route.ts` (parent-only; 403 for
  coach/organiser/admin/inactive), `src/lib/db/migrations/002_fix_registration_no_overflow.sql` + `schema.sql` (registration_no overflow at #10,000),
  `components/parent/registration-form.tsx` (error scroll-into-view), `registration-form.tsx` / `entry-day-selector.tsx` / `coach-events-browser.tsx`
  (`toLocaleDateString('en-IN',{timeZone:'UTC'})` hydration fix).
- **UI tokens**: `src/app/globals.css` (Washi & Ink tokens), `src/app/layout.tsx` (Shippori Mincho display font), ~23 component/page files had
  ~1,800 hard-coded hex colours codemodded to tokens, `src/lib/status.ts` (status badges use `--status-*` tokens).
- **Docs**: `AGENTS.md`, `.agents/**` rewritten from code (the old ones were wrong: no `guardian_accounts` table, one cookie `entrydesk_session`, 8 entry statuses).
- Verified: tsc exit 0; OTP send+verify works for a new parent email; coach email gets 403; athletes #9,999→#10,002 get distinct numbers (local).
- **Not yet applied to Neon**: migration 002. **Needs env in Vercel**: `RESEND_API_KEY`, `EMAIL_FROM` (email-code login cannot send otherwise).

## 2. Decisions from the owner (authoritative)
1. Fixes 1 and 2 (OTP + OTP-verify role guard) are approved as done.
2. **Per-event data lock** (replaces the dead `dob_locked` idea): a parent may edit the athlete profile (DOB, weight, rank, name) at any time
   for *future* events. Once the athlete has applied to an event, **that event's entry must not change** when the profile is edited.
   Profile edits only affect events the athlete has not entered yet.
3. **Chest numbers**: owner believed uniqueness was already enforced. It is not (see §3.2). Fix it.
4. Category question (owner unsure whether it needs a fix): see §3.3 — recommendation is a small fix; do the minimal version described.
5. **RingFlow export** is wanted. Spec in §4.
6. **Photos stay on Vercel Blob.** Do not migrate to R2.
7. **Coach profile photo stays mandatory** — organisers must know who a coach is. Keep the gate; fix whatever breaks around it (§3.6).
8. Add tests (unit + DB-level + e2e). Split the huge components. Do the housekeeping (xlsx, bcrypt duplicate, `/parent`→`/athlete` folder rename).

## 3. Tasks (do in this order; each ends with tsc + tests + doc update)

### 3.1 Per-event snapshot (replaces `dob_locked`)
Facts: `students.dob_locked` exists but **nothing sets or reads it** (`grep dob_locked` → only a comment in `lib/validation.ts`).
`updateChildAsParent` (`src/app/parent/actions.ts`) freely rewrites name/gender/rank/weight/DOB; every organiser/ID-card/print/export query joins
`students` live, so an edit changes already-submitted entries. `entries` already has `declared_weight_kg` and `category_snapshot` but no DOB/rank/gender/name.
Do:
- Migration `003_entry_snapshot.sql`: add to `entries` nullable `snap_name, snap_gender, snap_dob, snap_rank, snap_school_or_city` (additive). Backfill from `students` for existing rows.
- `submitParentEntry` (and the coach flows `upsertEntry`, `bulkCreateEntries`, `coachAddManualStudentAndEntry`) write the snapshot at insert; re-registration after withdraw/decline refreshes it.
- Every read that shows an athlete **in the context of an event** uses `COALESCE(e.snap_*, s.*)`: organiser entries page + list + print, coach parent-entries, ID card API/page, `/v/[token]`, exports, status timeline. Profile pages (`/athlete/<id>`) keep showing the live profile.
- Keep editing allowed in the profile. Show a small notice on the edit dialog: "Changes apply to future events. Existing entries keep the details they were submitted with."
- Coach/organiser may correct an entry's snapshot (typo fixes) with an audit row (`AUDIT_ACTIONS`); parents may not.
- Drop reliance on `dob_locked` (leave the column; remove the misleading comment; document it as unused).
- Acceptance: submit entry → edit DOB/weight in profile → entry views/exports/ID card still show the old values; new entry for a second event shows the new ones. Add a DB-level test.

### 3.2 Chest number uniqueness
Facts: trigger `assign_chest_no_on_approval` does `MAX(chest_no)+1` per event with no lock; **no unique index on (event_id, chest_no)** (confirmed on Neon index list and `schema.sql`).
`updateEntryChestNo` lets organisers set numbers manually.
Do:
- First, read-only on Neon: `select event_id, chest_no, count(*) from entries where chest_no is not null group by 1,2 having count(*)>1` — report duplicates to the owner before creating the index.
- Migration `004_chest_no_unique.sql`: `pg_advisory_xact_lock(hashtext(NEW.event_id::text))` inside the trigger function (CREATE OR REPLACE) + `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_event_chest ON entries(event_id, chest_no) WHERE chest_no IS NOT NULL`. (CONCURRENTLY cannot run inside a transaction — document how to run it.) Mirror in `schema.sql`.
- Never reuse numbers: withdrawn/rejected entries keep theirs or clear it explicitly, but a number is not reassigned silently. Decide and document.
- `updateEntryChestNo` / bulk update: catch unique-violation (23505) and show a friendly "number already used" error.
- Acceptance: a test that approves 20 entries concurrently from 4 connections → 20 distinct numbers, no errors; manual duplicate set → friendly error.

### 3.3 Category (owner was unsure — here is the real situation)
Facts: the **coach flow** computes `category_snapshot` via `lib/category.ts#calculateCategory` (`dashboard/entries/actions/index.ts:545`). The **parent flow never does**:
`submitParentEntry` inserts `category_snapshot = NULL` and no `category_id`, so organiser lists/print/ID card show "-"/"Open" for every parent entry. The form text says
"Select category" but there is no field (that text should be reworded either way).
RingFlow assigns categories itself from age/belt/sex/weight using its own categories file (§4), so EntryDesk's category is for **display and sanity only**.
Do (minimal): compute `category_snapshot` in `submitParentEntry` with the event's `age_cutoff_rule` (`tournament_day` | `jan_1`) using the snapshot data from 3.1; recompute when
the coach/organiser corrects the snapshot; reword the registration form text. Do NOT build parent-side category picking. Organiser-defined `categories` rows (`category_id`) stay optional.
Acceptance: parent entry shows a category label in organiser list and ID card; unit tests for `calculateCategory` boundaries and both cutoff rules.

### 3.4 RingFlow export — see §4.

### 3.5 Photos
Stay on Vercel Blob (`/api/upload/photo`, ≤200 KB, client-compressed). No migration. Only: verify upload+delete+replace works end to end (I could not drive a file picker in my browser pane),
and confirm the DB never stores `data:` URIs in production (fallback exists when `BLOB_READ_WRITE_TOKEN` is unset; make it throw in production instead).
Note for the owner (don't act): Vercel **Hobby** is non-commercial; the owner receives cash from organisers, which is arguably commercial use → Pro ($20/mo) is the safe choice. Blob free-tier storage limits were not verified.

### 3.6 Coach photo gate (mandatory, keep)
Intent: organisers must be able to recognise a coach. Facts: the gate is `components/auth/compulsory-profile-photo-upload.tsx` (blocks when `users.avatar_url IS NULL`).
Problems found:
- **The organiser approvals page does not show the coach's photo** (it showed an initial letter in a circle even with `avatar_url` set), so the gate's purpose is not served. Show the photo (click to enlarge via `enlarged-pfp-dialog`) on `/dashboard/approvals`, `/dashboard/events/[id]/approvals`, collaborators lists and the organiser entries "Coach" column.
- Example images on the gate (`public/images/guidelines/*.jpg`, ~0.8 MB each) rendered blank in my test pane and are heavy for phones → compress to <100 KB, add explicit width/height, `loading="eager"` for the first.
- `next/image` throws and **crashes the whole page** for any `avatar_url` host outside `next.config.ts → images.remotePatterns` → create a `SafeAvatar` component (error boundary / `onError` fallback to initials) and use it for every user/athlete image.
- Make the gate copy explain the why: "Organisers see this photo when approving you."
Acceptance: coach without avatar is gated; after upload the photo appears on the organiser approvals page; a bad avatar URL never crashes a page.

### 3.7 Tests (add; none exist today)
- Add **Vitest** (RingFlow already uses vitest — mirror its config) for pure logic: `lib/status.ts`, `lib/category.ts`, `lib/date.ts`, `lib/events/registration.ts`, validation schemas, the RingFlow export mapper.
- **DB-level tests** against the Docker Postgres (apply `schema.sql` + all migrations to a fresh DB per run): registration_no at 9,999/10,000/10,001; chest-number concurrency; OTP verify role guard (parent ok, coach/organiser/admin/inactive → 403); snapshot immutability; `INTERVAL` query works.
- **Playwright e2e** of the golden path in `.agents/rules/testing.md §4` using seeded sessions (cookie `entrydesk_session`, DB stores sha256). Run at 375 px as well as desktop. Include: parent hydration (no console hydration errors on `/athlete/<id>/register`).
- Wire `npm test`, `npm run test:db`, `npm run test:e2e`. Document in `testing.md`.

### 3.8 Split the giant components (after 3.7 so tests protect the refactor; behaviour-preserving, one component per change)
`components/coach/coach-entries-list.tsx` (~90 KB), `components/events/organiser-entries-list.tsx` (~88 KB), `components/coach/coach-add-student-dialog.tsx` (~50 KB), `components/id-card/id-card-preview.tsx` (~49 KB; **printed output must stay pixel-identical — it uses fixed colours on purpose**).
Target: files under ~400 lines, extract hooks (`useEntriesFilters`, selection, bulk actions), row/menus/dialog subcomponents, shared types. No UI or query changes.

### 3.9 Housekeeping
- `xlsx@0.18.5` (npm) has known advisories and parses user files. Move to the SheetJS-distributed build (≥0.20.x, `https://cdn.sheetjs.com/…` tarball) or `exceljs`. Used by: `students/student-bulk-upload.tsx`, export actions. (RingFlow also pins 0.18.5 — mention to owner, don't change RingFlow.)
- Remove `bcrypt` (native) and `@types/bcrypt`: it is imported only in `src/lib/auth/otp.ts`; `password.ts` already uses `bcryptjs`. Switch `otp.ts` to `bcryptjs`, reinstall, rerun OTP tests.
- Rename `src/app/parent` → `src/app/athlete`; delete the rewrites/redirects in `next.config.ts` and `src/proxy.ts`; update all `revalidatePath('/parent…')` pairs and imports (`@/app/parent/entry-actions`). Keep a redirect from legacy `/parent/*` → `/athlete/*` for old bookmarks. Update `AGENTS.md` ("URL ≠ folder" section) and docs.
- `src/lib/validation.ts:107` comment about `dob_locked` is false — fix.

### 3.10 UI (last, optional — only after everything above is green)
Tokens/typography are done. Remaining: redesign the landing page, `/login`, the join page `/join/<slug>` (first thing parents see; mobile first, 375 px) and the coach dashboard using the "Washi & Ink" system. Remove decorative glow/gradient/blur, keep one primary action per screen, large touch targets.
Also fix the parent home status pill truncation and the theme-toggle indicator that looks inverted in light mode.

## 4. RingFlow export spec (verified by reading RingFlow source)
RingFlow repo: `D:\symm\symmetrical-memory\RingFlow-CISCE` (Next.js, Drizzle, vitest). Admin imports athletes at `src/components/admin/AthletesClient.tsx` (~L285–375) which reads the **first sheet** of an `.xlsx`/`.csv` via `XLSX.utils.sheet_to_json` and passes rows to `importOfficialRoster` → `prepareOfficialRows` in `src/lib/roster/officialImport.ts`.
Header names it accepts (case variants in code): 
`Number` (chest no; must be unique), `School`, `School Code`, `SPORTS ID`, `Name`, `category` (read but categorisation is done by RingFlow), `age`, `sex`, `belt`, `day`, `weight` (also `weight (kg)`), `kata`, `kumite`, `Team Kata`, `Team Kumite`.
Row rules from `prepareOfficialRows`: name required; age numeric 0–119; weight 0–999 (2 dp); duplicate Number → row skipped; without a Number, duplicates by name+school+sportsId are skipped; max 10,000 athletes per import; kata/kumite/team flags accept boolean/"yes"/1 style.
RingFlow also has a "Local" sheet importer (`src/lib/local/sheetImport.ts`: Name, Chest Number, Club, Age, Belt, Sex, Kumite, Kata, one sheet per category) — **target the official roster format above**.

Build "Export for RingFlow" on the organiser event entries page (`components/events/export-entries.tsx`, action `exportEventEntries` in `app/dashboard/events/[id]/entries/actions.ts`):
| Column | Source |
|---|---|
| Number | `entries.chest_no` (approved entries only; ordered by chest_no) |
| School | dojo name |
| School Code | dojo `join_code` (stable short code) |
| SPORTS ID | athlete `registration_no` |
| Name | `COALESCE(snap_name, name)` |
| age | whole years at the event's reference date per `events.age_cutoff_rule` (`tournament_day` = `start_date`, `jan_1` = Jan 1 of start year), from `COALESCE(snap_dob, date_of_birth)` |
| sex | normalise to the values RingFlow expects — **read RingFlow's sex/belt normalisation in `officialImport.ts` and map EntryDesk `male/female` and rank slugs (`white, yellow, orange, green, blue, brown_3…black_3`) to it; unit test the mapping** |
| belt | mapped rank string as above |
| day | event day name for `event_day_id` |
| weight | `declared_weight_kg` |
| kata / kumite / Team Kata / Team Kumite | derived from comma list in `participation_type` (`both` ⇒ kata=1,kumite=1) |
Acceptance test: run the generated rows through RingFlow's own `prepareOfficialRows` (import it in a vitest in this repo via relative path or copy the function under test as a fixture) and assert `skipped.length === 0` and counts match. Do not modify RingFlow.

## 5. Evidence & measurements (so you don't re-derive)
- Neon (read-only, 2026-11-09): Postgres 18.6, 9.6 MB, 5 users / 3 dojos / 2 students / 2 entries; schema matches repo migrations; indexes include `idx_entries_student_event` (unique) and `idx_entries_qr_token`; **no chest_no index**.
- Local PG16 at 1,000 coaches + 1,000 dojos + 9,000 athletes + 3,000 entries: DB 22 MB; 3,000 entries insert 2.5 s (per-row activity trigger); bulk-approve 3,000 entries 3.5 s, chest numbers 1…3000 unique; organiser entries page (3,000 rows) ≈150 ms/500 KB.
- Bugs already fixed: see §1 and `.agents/rules/known-issues.md`. Still open there: `dob_locked`, category, next/image crash, photo gate, naming split.
- Gotchas hit while testing (all in `testing.md`): use `127.0.0.1` not `localhost` for the DB; Docker Desktop on this PC sometimes exits mid-session (symptom: everything redirects to `/login`); `.next/` can reach 2 GB and make Turbopack panic (delete it); zod v4 `.uuid()` rejects hand-typed fake UUIDs; remote avatar hosts not in `remotePatterns` crash pages; Google button doesn't render on localhost (origin not authorised) so sign-in is tested via seeded sessions; the in-pane browser can't drive a native file picker.
- Security notes: OTP codes are returned as `devCode` only when email is unconfigured and `NODE_ENV !== 'production'`; production without `RESEND_API_KEY` fails closed (500). Turnstile protects first OTP send.

## 6. Definition of done
All tasks above green: `tsc` 0, unit + DB + e2e tests pass, docs updated, migrations 003/004 written (and 002 noted as pending on Neon) with a short "run order & rollback" note in the final report, no changes to RingFlow, no writes to Neon.
