# Running and testing end-to-end (safely)

`.env` points at the **live Neon database**. Do not run tests against it. Use a throwaway local Postgres.

## 1. Local DB (Docker)
```bash
docker run -d --name entrydesk-test-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=entrydesk -p 55432:5432 postgres:16-alpine
# Git-Bash on Windows: export MSYS_NO_PATHCONV=1 so /schema.sql isn't rewritten
docker cp src/lib/db/schema.sql entrydesk-test-pg:/schema.sql
docker cp src/lib/db/migrations/001_parent_portal.sql entrydesk-test-pg:/m1.sql
for f in src/lib/db/migrations/0*.sql; do docker exec -i entrydesk-test-pg psql -U postgres -d entrydesk -v ON_ERROR_STOP=1 -q < "$f"; done
```
Docker Desktop on this machine sometimes exits mid-session; if the app suddenly redirects everything to `/login`
or renders take 10 s+, the DB is gone — restart Docker Desktop and `docker start entrydesk-test-pg`.

After the local database has been initialized, `npm run db:migrate:local` starts `entrydesk-test-pg` and applies the numbered migrations to its `entrydesk` database. It uses the fixed Docker address regardless of `DATABASE_URL`.

## 2. Dev server against it (does not touch `.env`)
Use `127.0.0.1` (not `localhost`, which can resolve to IPv6 and get ECONNREFUSED).
```bash
DATABASE_URL="postgresql://postgres:test@127.0.0.1:55432/entrydesk" NEXT_PUBLIC_BASE_URL="http://localhost:3100" BLOB_READ_WRITE_TOKEN="" npx next dev -p 3100
```
If Turbopack panics, delete `.next/` (it is regenerable build cache, can reach 2 GB).

## 3. Seed users + sessions (Google sign-in can't be automated)
Session cookie `entrydesk_session` = raw token; DB stores `sha256(raw)`.
```sql
insert into users(id,email,full_name,role,avatar_url) values
 (gen_random_uuid(),'coach@test.local','Sensei Test','coach','/icons/add-athlete-128.svg'), ...;
insert into sessions(user_id,session_token,expires_at)
 select id, encode(digest('coach-tok-1','sha256'),'hex'), now()+interval '7 days' from users where email='coach@test.local';
```
(needs `create extension pgcrypto` — already in schema.sql). In the browser: `document.cookie="entrydesk_session=coach-tok-1; path=/"`.
Give coach/organiser an `avatar_url` (a local path like `/icons/add-athlete-128.svg` is easiest; any host is now safe thanks to
`SafeAvatar`), or they hit the mandatory photo gate.

## 4. Golden path to verify after any change
1. coach → `/dashboard/dojos` → create dojo (slug + join code generated)
2. insert an event (+ `event_days`) as organiser; coach applies (or insert `event_applications`); organiser `/dashboard/approvals` → Approve
3. parent → `/athlete/new?dojo=<slug>` (photo required) → `/athlete/<id>/register` → Submit → entry `pending_coach`
4. coach `/dashboard/events/<id>/entries` (or `/dashboard/parent-entries`, which redirects there) → tick **Paid** → **Send to organiser** → `submitted`
5. organiser `/dashboard/events/<id>` → **Accept** → `approved`, `chest_no` set, `qr_token` set
6. parent `/athlete` shows "Accepted"; ID card at `/athlete/entries/<id>/id-card`
Check each step with `select status, chest_no from entries`.

## 5. Load test recipe (numbers from 2026-11-09, local PG16)
1,000 coaches + 1,000 dojos + 9,000 athletes insert in <1 s; 3,000 entries insert 2.5 s (activity trigger);
bulk-approve 3,000 entries 3.5 s with gap-free unique chest numbers; organiser entries page with 3,000 entries ≈ 150 ms / 500 KB.
Supply `registration_no` explicitly when bulk-loading >9,999 students on a DB without migration 002.

## 6. Automated tests (all against the LOCAL Docker DB; they refuse non-local hosts)
| Command | What | Notes |
|---|---|---|
| `npm test` | Vitest unit tests, `tests/unit/**` | pure modules: status, category (both age cutoff rules), date, registration, validation, SafeAvatar helpers, RingFlow mapper + RingFlow import acceptance |
| `npm run test:db` | Vitest DB tests, `tests/db/**` | creates `entrydesk_test_<ts>` and applies schema.sql + all migrations statement-by-statement (`tests/db/sql-files.ts`). Set `ENTRYDESK_KEEP_TEST_DATA=1` to retain it. registration_no 9,999→10,001 · chest-number concurrency (20 approvals / 4 connections) + duplicate → 23505 · snapshot immutability · OTP INTERVAL + verify-route role guard |
| `npm run test:e2e` | Playwright, `tests/e2e/**` | Creates and retains a fresh `entrydesk_e2e_<timestamp>` database. Desktop covers the golden path, workflow edges, and tournament rehearsal. Read-only guards also run at 375 px. |

- Env: `TEST_DATABASE_ADMIN_URL` (default `postgresql://postgres:test@127.0.0.1:55432/postgres`), `E2E_PORT`, `PW_CHANNEL`
  (default `chrome` = installed Google Chrome; set `chromium` after `npx playwright install chromium`), `RINGFLOW_DIR`
  (default `D:/symm/symmetrical-memory/RingFlow-CISCE`, only for the fixture-drift check; skipped if absent).
- If port 3100 is taken by your own dev server: `E2E_PORT=3110 npm run test:e2e`.
- `tests/fixtures/ringflow-official-import.ts` is a verbatim copy of RingFlow's row checks (RingFlow is not modified); the unit
  test fails if RingFlow's `prepareOfficialRows`/`normalizeSex` change, so re-copy them when that happens.
- e2e file order matters: `golden-path.spec.ts` must run before `guards-and-pages.spec.ts` (alphabetical; it creates the entry).
- `next dev` with `NEXT_DIST_DIR` adds `.next-e2e/...` globs to tsconfig `include` — they are committed on purpose.

## 7. Persistent tournament rehearsal

`npm run dev` and `npm run start` start `entrydesk-tournament-pg` and use the retained 3,001-athlete rehearsal database. `npm run start` requires an existing build. Both commands override `DATABASE_URL` for the app process and disable Blob uploads and Resend. The automated suites create separate databases so their fixtures do not change the retained rehearsal data.

Use a dedicated local container and named volume. The app under Playwright runs
on the host with an explicit local database URL. This keeps test runs away from
the existing local container and production Neon database.

```powershell
docker volume create entrydesk-tournament-data
docker run -d --name entrydesk-tournament-pg --restart unless-stopped -p 127.0.0.1:55439:5432 -e POSTGRES_PASSWORD=rehearsal -v entrydesk-tournament-data:/var/lib/postgresql/data postgres:16-alpine
$env:TEST_DATABASE_ADMIN_URL = 'postgresql://postgres:rehearsal@127.0.0.1:55439/postgres'
$env:ENTRYDESK_KEEP_TEST_DATA = '1'
$env:E2E_PORT = '3194'
npm test
npm run test:db
npm run test:e2e
```

Playwright prints the database name and keeps it after success or failure. The
suite uses synthetic athletes and seeded sessions in place of live Google
sign-in. The normal golden path registers a parent entry in the app. The scale
rehearsal seeds 3,000 registrations across 50 coaches and 150 dojos and then
drives coach payment, forwarding, organiser decisions and RingFlow in Chrome.
Keep the named volume to retain all runs.

## 8. Before you finish
`npx tsc --noEmit` must exit 0. `npm run lint` is noisy; at least lint the files you touched.
