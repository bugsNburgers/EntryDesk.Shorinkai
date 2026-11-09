# Running and testing end-to-end (safely)

`.env` points at the **live Neon database**. Do not run tests against it. Use a throwaway local Postgres.

## 1. Local DB (Docker)
```bash
docker run -d --name entrydesk-test-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=entrydesk -p 55432:5432 postgres:16-alpine
# Git-Bash on Windows: export MSYS_NO_PATHCONV=1 so /schema.sql isn't rewritten
docker cp src/lib/db/schema.sql entrydesk-test-pg:/schema.sql
docker cp src/lib/db/migrations/001_parent_portal.sql entrydesk-test-pg:/m1.sql
docker cp src/lib/db/migrations/002_fix_registration_no_overflow.sql entrydesk-test-pg:/m2.sql
for f in schema m1 m2; do docker exec entrydesk-test-pg psql -U postgres -d entrydesk -v ON_ERROR_STOP=1 -q -f /$f.sql; done
```
Docker Desktop on this machine sometimes exits mid-session; if the app suddenly redirects everything to `/login`
or renders take 10 s+, the DB is gone — restart Docker Desktop and `docker start entrydesk-test-pg`.

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
Give coach/organiser an `avatar_url` that is a **local path** (a remote host not in `remotePatterns` crashes next/image),
or they hit the mandatory photo gate.

## 4. Golden path to verify after any change
1. coach → `/dashboard/dojos` → create dojo (slug + join code generated)
2. insert an event (+ `event_days`) as organiser; coach applies (or insert `event_applications`); organiser `/dashboard/approvals` → Approve
3. parent → `/athlete/new?dojo=<slug>` (photo required) → `/athlete/<id>/register` → Submit → entry `pending_coach`
4. coach `/dashboard/parent-entries` → Send → `submitted`
5. organiser `/dashboard/events/<id>/entries` → ✓ → `approved`, `chest_no` set, `qr_token` set
6. parent `/athlete` shows "Accepted"; ID card at `/athlete/entries/<id>/id-card`
Check each step with `select status, chest_no from entries`.

## 5. Load test recipe (numbers from 2026-11-09, local PG16)
1,000 coaches + 1,000 dojos + 9,000 athletes insert in <1 s; 3,000 entries insert 2.5 s (activity trigger);
bulk-approve 3,000 entries 3.5 s with gap-free unique chest numbers; organiser entries page with 3,000 entries ≈ 150 ms / 500 KB.
Supply `registration_no` explicitly when bulk-loading >9,999 students on a DB without migration 002.

## 6. Before you finish
`npx tsc --noEmit` must exit 0. `npm run lint` is noisy; at least lint the files you touched.
