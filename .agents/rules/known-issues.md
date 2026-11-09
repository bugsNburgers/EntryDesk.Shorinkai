# Known issues, risks, scale limits (end-to-end tested 2026-11-09)

Legend: ✅ fixed in the working tree (not yet deployed; migrations not yet run on Neon) · ⚠️ open

## Bugs
| | Issue | Detail |
|---|---|---|
| ✅ | **Email-OTP sign-in never worked** | `INTERVAL '${n} seconds'` put a bind param inside a SQL string. Fixed in `lib/auth/otp.ts` (DB test). Needs `RESEND_API_KEY` + `EMAIL_FROM` in Vercel to deliver mail. |
| ✅ | **OTP verify could log into / re-activate coach accounts** | Now parent-only, 403 otherwise (DB + e2e tests). |
| ✅ | **Registration numbers break at athlete #10,000** | migration 002 (DB test 9,999 → 10,001). **Run on Neon.** |
| ✅ | **Profile edits changed already-submitted entries** | per-event snapshot, migration 003 (DB + e2e tests). `dob_locked` stays unused. |
| ✅ | **Chest numbers could duplicate** (no lock, no unique index) | migration 004: advisory lock + `idx_entries_event_chest` (20 concurrent approvals test). |
| ✅ | **Parent entries had no category** ("-"/"Open" everywhere) | `submitParentEntry` writes `category_snapshot` using the event's age cutoff rule. |
| ✅ | **`category_snapshot` and `audit_log.details` were stored as JSON strings** | `${JSON.stringify(x)}` double-encoded jsonb → `->>'key'` was NULL (coach manual-add category never displayed). Now `sql.json`; migration 005 repairs rows. |
| ✅ | **Parent could not resubmit after "Please correct and send again"** | `submitParentEntry` and the form treated `correction_needed` as "already registered". Fixed. |
| ✅ | **Coach event page crashed (SSR `ReferenceError: status is not defined`)** whenever the event had entries | `coach-overview.tsx` used an un-destructured `status` prop (resolved to the DOM global in tsc). Fixed; e2e covers it. |
| ✅ | `next/image` crashed the page for unlisted avatar hosts | `SafeAvatar` everywhere a DB photo URL is rendered (e2e uses an unlisted host). |
| ✅ | Organiser approvals did not show the coach photo | shown + enlargeable on approvals pages, collaborator lists, entries Coach column. |
| ✅ | Photo-guideline images 0.7–0.8 MB, blank in some panes | recompressed to 480 px / 16–31 KB, plain `<img>` with size, first eager. |
| ✅ | `data:` URI photos could reach the production DB | fallback now throws in production. |
| ✅ | `/parent` code vs `/athlete` URL split | folder renamed to `src/app/athlete`, rewrites removed, legacy redirect kept in `src/proxy.ts`. |
| ✅ | Hydration mismatch on `/athlete/<id>/register` | fixed earlier; e2e asserts no hydration errors at desktop + 375 px. |
| ⚠️ | `dashboard/dojos/page.tsx` loads **all** `dojo_collaborators` rows (no WHERE) | grouped per dojo client-side; leaks nothing visible today but grows with the whole platform. Scope it to the coach's dojos. |
| ⚠️ | Organiser list links to `/athlete/entries/<id>/id-card` | that page is parent-only, so organisers get redirected. Pre-existing; consider an organiser ID-card route. |
| ⚠️ | Rank values are inconsistent | parent/coach dialogs use `brown_3`, `black_1`…; student-dialog/category-dialog/bulk-upload use `brown`, `black`, `shodan`… The RingFlow export maps both. |
| ⚠️ | Lint is noisy | many pre-existing `no-explicit-any` / unescaped-entity errors (moved verbatim by the component split). |

## Scale (target 10k athletes / 1k coaches) — measured on local PG16
- DB size: 22 MB at 9k athletes + 3k entries + 1k users. **Photos are the storage risk**, not rows.
- Bulk approve 3,000 entries: 3.5 s, chest numbers 1…3000 unique (now also under the advisory lock).
- ⚠️ `evaluate_activity_on_entry` fires per row and rescans the dojo; fine now, revisit if a dojo has hundreds of athletes.
- ⚠️ `tr_fill_entry_snapshot` adds one indexed `students` lookup per inserted entry (negligible).
- Peak load is a few hours around registration deadlines. Keep `max: 1` per serverless instance + the Neon **`-pooler`** URL.

## Dependencies
- `xlsx` is now 0.20.3 from cdn.sheetjs.com (npm 0.18.5 had advisories). **RingFlow still pins 0.18.5** — owner to decide there.
- `bcrypt` (native) removed; `bcryptjs` only.
- `npm audit --omit=dev` still reports advisories in transitive deps (e.g. `sharp`/libvips via Next). Not addressed in this round.

## Hosting / cost notes (verify on vendor pricing pages)
- **Vercel Hobby is non-commercial only.** The owner is paid by organisers → Vercel Pro ($20/mo) is the safe choice.
- Photos stay on **Vercel Blob** (owner decision). Blob free-tier storage/transfer limits were not verified.
- Neon free: 100 CU-hours/month and 1 GB per project; exceeding storage blocks writes. Autosuspend adds a cold start after idle.
