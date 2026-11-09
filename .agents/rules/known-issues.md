# Known issues, risks, scale limits (found by end-to-end testing, 2026-11-09)

Legend: ✅ fixed in the working tree (not yet deployed / migration not yet run on Neon) · ⚠️ open

## Bugs
| | Issue | Detail |
|---|---|---|
| ✅ | **Email-OTP sign-in never worked** | `INTERVAL '${n} seconds'` put a bind param inside a SQL string → "could not determine data type of parameter $2" on every send. Fixed in `lib/auth/otp.ts`. Needs `RESEND_API_KEY` in Vercel to actually deliver mail. |
| ✅ | **OTP verify could log into / re-activate coach accounts** | `/api/auth/otp/verify` upserted `is_active=TRUE` and logged in whoever owned the email. Combined with the fixed OTP it would have let a pending (inactive) coach self-approve. Now parent-only, 403 otherwise. |
| ✅ | **Registration numbers break at athlete #10,000** | `LPAD(n,4,'0')` truncates → `SK26-1000` collides with #1,000; every sign-up after 9,999 fails. Fix: `migrations/002_fix_registration_no_overflow.sql` (**run it on Neon**; `schema.sql` already updated). |
| ✅ | Hydration mismatch on `/athlete/<id>/register` | locale-less `toLocaleDateString` (server en-US vs browser en-IN). Fixed with `'en-IN'` + `timeZone:'UTC'` in registration-form, entry-day-selector, coach-events-browser. Other server-rendered `toLocaleDateString()` calls are consistent but timezone-dependent. |
| ✅ | Failed registration looked like "nothing happened" | error banner is above the fold of a long form → now scrolls into view + `role=alert`. |
| ⚠️ | `dob_locked` is never set/enforced | parents can change DOB/weight/rank after approval (age/weight category cheating). |
| ⚠️ | Parent never picks a category | Form text says "select category" but there is no field; `lib/category.ts` is not called at submit/approve. Entries show "Open"/"-". |
| ⚠️ | `next/image` crashes the whole page for unlisted hosts | any `avatar_url`/`photo_url` outside `remotePatterns` → "Something went wrong". Wrap in an error-tolerant avatar or use `unoptimized` fallback. |
| ⚠️ | Photo-guideline example images render blank in the Browser pane | files exist (0.8 MB each); likely lazy-load/optimizer — verify on a phone; compress them. |
| ⚠️ | Mandatory coach/organiser photo gate blocks first use | bad first impression; make it a dismissible banner. |
| ⚠️ | Registration/ID-card/URL naming split (`/parent` code vs `/athlete` URL) | confusing; rename folder to `athlete` and drop rewrites when convenient. |

## Scale (target 10k athletes / 1k coaches) — measured on local PG16
- DB size: 22 MB at 9k athletes + 3k entries + 1k users. Neon free (1 GB/project) is nowhere near a limit. **Photos are the storage risk**, not rows.
- Bulk approve 3,000 entries: 3.5 s, chest numbers 1…3000 unique. Organiser entries page at 3,000 rows: ~150 ms, ~500 KB HTML.
- ⚠️ `assign_chest_no_on_approval` = `MAX(chest_no)+1` with no lock and no `UNIQUE(event_id, chest_no)`: two organisers/collaborators approving at the same instant can get the same number. Add the unique index + `pg_advisory_xact_lock(event_id)` (not reproduced, reasoned from the code).
- ⚠️ `evaluate_activity_on_entry` fires per row and rescans the dojo; fine now, revisit if a dojo has hundreds of athletes.
- ⚠️ Peak load is a few hours around registration deadlines. `max: 1` connection per serverless instance + Neon pooler is right; keep the **`-pooler`** URL.
- ⚠️ `xlsx@0.18.5` (SheetJS from npm) has known advisories; it parses coach-uploaded files in the browser. Prefer the SheetJS CDN build or `exceljs`.
- ⚠️ both `bcrypt` and `bcryptjs` are dependencies; keep one (bcryptjs avoids native builds).

## Hosting / cost notes (verify on vendor pricing pages; blog figures conflicted)
- **Vercel Hobby is non-commercial only** (Vercel fair-use). If you charge entry fees / run it as a business, you need Pro ($20/mo) regardless of traffic.
- Neon free: 100 CU-hours/month and 1 GB per project; exceeding storage blocks writes (no surprise bill). Autosuspend adds a cold start after idle.
- Cheapest robust setup for tournament season: Vercel Pro + Neon free/Launch + move photos to object storage with free egress (e.g. Cloudflare R2).
- Free alternative with real request headroom: Cloudflare Workers (OpenNext adapter, ~100k requests/day free) — needs adapter work + testing of `bcrypt`/`sharp`-style native deps (this app uses `bcrypt` native → switch to `bcryptjs`).
