# Coding conventions

## Database
```ts
import sql from '@/lib/db'
const rows = await sql<Student[]>`SELECT * FROM students WHERE dojo_id = ${dojoId}`   // tagged template only
await sql.begin(async (tx) => { /* transaction */ })
```
- **Never put `${}` inside a quoted SQL literal.** `INTERVAL '${n} seconds'` makes Postgres fail with "could not determine data
  type of parameter". Use `(${n}::int * INTERVAL '1 second')`. (This silently broke email-OTP for months.)
- Pool is `max: 1` per serverless instance → use Neon's **pooled** URL (`-pooler` host). Don't hold connections open.
- Prefer one set-based UPDATE over per-row loops (see `coachBulkForwardEntries`).

## Auth in actions / pages
```ts
const { user } = await requireRole(['coach', 'organizer'])        // throws if role not allowed
const { user } = await requireRole('parent', { redirectTo: '/login' })
```
Always scope queries to the caller (`parent_id = ${user.id}` / `dojos.coach_id = ${user.id}`); never trust ids from the client.

## Server actions
Co-locate `actions.ts` next to the page, `'use server'` on top, validate with zod (`lib/validation.ts`), `audit()` for
consent/status changes (fire-and-forget `.catch(console.error)` except consent), then `revalidatePath` for the
`/athlete…` page(s) (URL = folder since the rename; there is no `/parent` route any more) and the dashboard pages.

## Forms
react-hook-form + zod v4. **zod v4 `.uuid()` is strict (RFC variant bits)** — hand-typed fake UUIDs like
`aaaaaaaa-0000-…` are rejected; use real `gen_random_uuid()` ids in tests/seeds.
Show errors next to the submit button or scroll the banner into view (see `registration-form.tsx`).

## Dates & hydration
`new Date(x).toLocaleDateString()` with no locale renders differently on server (en-US) and browser (en-IN) → React
hydration mismatch → the form can fall back to a native submit. Always: `toLocaleDateString('en-IN', { timeZone: 'UTC', … })`
for DB `DATE` values (they parse as UTC midnight).

## Images
`next/image` throws (whole page crashes) for hosts not in `next.config.ts → images.remotePatterns`. Allowed:
`*.googleusercontent.com`, `*.public.blob.vercel-storage.com`, `avatars.githubusercontent.com`, and local `/…` paths.
Use **`SafeAvatar`** (`components/ui/safe-avatar.tsx`) for any user/athlete photo: it only hands next/image an allowed
src, falls back to `<img>` otherwise and to initials on error, and can open the enlarge dialog (`enlargeable`).
Keep its `ALLOWED_HOSTS` in sync with `remotePatterns`.

## JSONB
Bind JSONB values with `sql.json(x)` / `jsonb(x)`. `${JSON.stringify(x)}` is stored as a JSON *string* (postgres.js
serialises jsonb params itself) and `col->>'key'` then returns NULL (migration 005 repaired old rows).

## Entry snapshot
Event-context reads (organiser/coach lists, print, exports, ID card, `/v/[token]`, emails): `COALESCE(e.snap_x, s.x)`.
Profile pages read `students`. Coach draft rows show the live profile (snapshot is re-taken when the draft is sent).

## Components
Large client components are split into `<name>-parts/` folders: `use-<name>.ts(x)` (all state/handlers, returns a VM),
one file per screen section taking `{ vm }`, and `shared.tsx` (icons/helpers/types). Keep new sections under ~400 lines.
Server Components by default; `'use client'` only for hooks/events. Primitives in `components/ui`. Colours only via tokens
(`design-system.md`). Status badges via `lib/status.ts`.

## Migrations
`src/lib/db/migrations/NNN_name.sql`: additive + idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`). Mirror in `schema.sql`
and `types/database.ts`. Run by hand on Neon (SQL editor) — and on the local test DB first.

## Env vars
`DATABASE_URL` (Neon pooled) · `NEXT_PUBLIC_BASE_URL` · `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`NEXT_PUBLIC_GOOGLE_CLIENT_ID` ·
`BLOB_READ_WRITE_TOKEN` · `RESEND_API_KEY` + `EMAIL_FROM` (needed for OTP in production) ·
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`. (`APP_BASE_URL` in old docs does not exist — it is `NEXT_PUBLIC_BASE_URL`.)
