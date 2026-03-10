# EntryDesk – Fixes & Root Causes 

This doc captures the main issues encountered while setting up/running the app locally, what was changed, and why.

## Session Summary (one-liners)

- **1st session:** Fixed Supabase migration ownership error (`auth.users` ownership/RLS).
- **1st session:** Consolidated DB schema into a single migration file.
- **1st session:** Fixed auth UX (landing shows Dashboard CTA; `/login` redirects when already logged in).
- **1st session:** Migrated Next.js `middleware.ts` → `proxy.ts` to remove deprecation warning.
- **1st session:** Repo hygiene: added `.env.example`, updated `.gitignore`, documented fixes.

- **2nd session:** Added instant navigation loader overlay for dashboard + app routes.
- **2nd session:** Added determinate progress behavior during route transitions.
- **2nd session:** Prevented same-route clicks from causing slow “reload-like” navigation.
- **2nd session:** Removed/disabled the awkward partial (right-side) loader so behavior is consistent.
- **2nd session:** Improved auth feedback + navigation (login/logout messaging, login page back-to-home links).
- **2nd session:** Clarified role management by populating `public.profiles` for coach/organizer roles.

- **3rd session:** Fixed Next.js prerender error by wrapping global provider usage in `Suspense`.
- **3rd session:** Fixed coach “Apply to event” 500 by ensuring a `profiles` row exists before inserting `event_applications`.
- **3rd session:** Improved coach name display (fallback to email/email prefix when `full_name` is missing).
- **3rd session:** Added “Approved coaches” list panel on event overview (not just the count).
- **3rd session:** Made dashboard/event metric cards clickable and deep-link to filtered pages.
- **3rd session:** Compacted organizer per-event Entries/Approvals pages by merging headers into the card UI.
- **3rd session:** Removed coach tabs and merged overview + entries + register into a single page with a register dialog.
- **3rd session:** Made organizer event list cards fully clickable (not only the “Manage” button).
- **3rd session:** Implemented consistent one-step back navigation (history back) across organizer + coach dashboard pages.

- **4th session:** Merged coach “Browse Events” into dashboard home and removed the separate nav section.
- **4th session:** Fixed “Approved” applications still showing “Request to Participate” (Apply button state).
- **4th session:** Moved the global back button into the sidebar to reduce page-header clutter.
- **4th session:** Added a mobile slide-out dashboard nav (hamburger + sheet) to match desktop sidebar.
- **4th session:** Removed Settings from both organizer + coach dashboard navigation.
- **4th session:** Improved light-mode separation (borders/shadows) consistently across dashboard pages.
- **4th session:** Fixed multiple “Parsing ecmascript source code failed” issues caused by malformed JSX.

- **5th session:** Implemented a truly global navigation loading overlay (any internal link click triggers loader instantly).
- **5th session:** Covered programmatic navigations (router.push/replace/back) so non-Link buttons also show a loader.
- **5th session:** Removed duplicate dashboard-only loader plumbing to avoid double overlays and keep behavior consistent.

- **6th session:** Enforced role-based access in dashboard pages and server actions (coach vs organizer).
- **6th session:** Hardened Supabase RLS policies and organizer view to prevent role escalation and cross-role access.

- **7th session:** Unified dashboard loading (single `/dashboard/loading.tsx`; disabled overlay loader inside dashboard).

- **8th session:** Split events into Active vs Past (organizer) and Active/Approved/Past (coach); coach Home shows only Active + Approved.

- **9th session:** Fixed dashboard drawer sizing across breakpoints (sheet full-width/full-height on small screens).
- **9th session:** Fixed “Failed to save dojo” by ensuring `public.profiles` row exists and surfacing Supabase error messages.
- **9th session:** Fixed DOB imported as numbers (Excel serials) via DOB normalization at parse, save, and render.
- **9th session:** Bulk upload review UX: added dojo selection in review step, cancel import, and row checkboxes + “Delete selected”.

- **10th session:** Dashboard UI polish pass — softened harsh borders, unified card/list hover surfaces to match Home style, and improved visual consistency for coach + organizer event pages.
- **10th session:** Updated organizer event demographics block: Female shown first, F/M color-coded (pink/blue), with per-gender participation bars based on total entries.

- **11th session:** Prevented accidental duplicate event creation end-to-end with layered protection: frontend submit lock, backend dedupe guard, and DB unique index migration.
- **11th session:** Documented safe Supabase rollout path for existing projects, including duplicate pre-check/cleanup SQL before applying the unique index.

- **12th session:** Hardened organizer event deletion UX with a 3-dot actions menu + destructive modal + typed confirmation (`delete`) to reduce accidental data loss.
- **13th session:** Completed image-only optimization pass (Next image formats/sizes/cache + responsive hero `sizes`) without introducing unrelated UX changes.
- **14th session:** Fixed Vercel production TypeScript build failure in dashboard entries by replacing an unsafe relation cast with normalized flattening + strict type guard filtering.
- **15th session:** Integrated external Student Profile Portal (`testlist.shorinkai.in`) into landing UX with header link + dedicated section, then iteratively polished the mock preview (spacing, styling, and accent/avatar overlap fixes).
- **17th session:** Fixed coach event visibility/actions so upcoming approved events also appear under Active Events with direct Entries navigation, and events auto-disappear after `end_date`.
- **18th session:** Reworked landing-page render path for faster first paint (above-the-fold first, deferred below-the-fold), moved public events loading to post-render client fetch, fixed App Router dynamic import build issue, and stabilized `/api/public-events` with schema-correct query + scoped proxy behavior.
- **19th session:** Polished dark-theme tone and landing hero refresh behavior, fixed dashboard hydration mismatch from locale-dependent date rendering, and rebuilt mock dashboard side-switch UX with modern indicator + interaction-aware auto-scroll timing.

- **20th session:** Made Dojo cards deep-link to Students with dojo filtering via `?dojo=`.
- **20th session:** Added dojo-scoped Students view (server-side query filter) and preselected dojo in Add Student + Bulk Upload.
- **20th session:** Synced Students dojo filter to URL and reset pagination on filter change (with global navigation loader).
- **20th session:** Centralized profile display-name derivation for OAuth and improved profile auto-create/update behavior (role + full_name).

- **21st session:** Added shimmer-based `Skeleton` UI primitive and global CSS animation for consistent skeleton loading states.
- **21st session:** Replaced the dashboard root loading screen with a skeleton layout matching the home bento + list surfaces.
- **21st session:** Added route-level skeleton `loading.tsx` for Entries, Events, Events Browser, and Students.

- **22nd session:** Improved coach “Register athletes” dialog sizing/scrolling to work better on mobile and small viewports.
- **22nd session:** Made coach register filters/action bar responsive (full-width controls, horizontal scroll where needed) and allowed table horizontal scroll.
- **22nd session:** Tuned dashboard mobile header stacking (z-index/borders) and reduced mobile drawer width for better content context.
- **22nd session:** Minor copy polish on dashboard Students metric (“Total Athletes”).

- **23rd session:** Implemented organizer-side event Entries management (filtering, pagination, per-entry + bulk approve/reject) backed by `organizer_entries_view`.
- **23rd session:** Added export-to-Excel for event entries, plus new fields surfaced across UI (student `registration_no`, entry `chest_no`).
- **23rd session:** Added per-event Settings page (title/location edits, registration open/close toggle, and a “Danger Zone” delete flow).
- **23rd session:** Added DB support for registration/chest numbers (triggers + view rebuild) and added submit locks to reduce accidental double-submit spam.

- **24th session:** Fixed event creation stability issues (500 fallback handling, validation fixes, label/id accessibility corrections, and clearer submit error handling).
- **24th session:** Fixed Radix module resolution errors by correcting imports and installing missing scoped packages for Accordion/Switch.
- **24th session:** Added a unified registration deadline row (`Last date for Registration:`) with open/closed status indicator across public/coach/organizer event surfaces.
- **24th session:** Updated public event cards to keep metadata single-line/truncated for equal card heights, while preserving full details inside the `View event` dialog.
- **24th session:** Restored public past-event card behavior to keep `View event` dialog accessible after user-requested revert.
- **24th session:** Adjusted coach-facing queries so `is_public` no longer hides private events in dashboard/browser views (hero/public API remains `is_public`-filtered).

- **25th session:** Enforced registration-closed behavior for coaches end-to-end: active events remain visible, but all entry mutations/actions are locked when registration is closed (manual toggle, close-date elapsed, or past event).
- **25th session:** Added a shared registration-lock helper and aligned coach UI state/messages (`Registration Closed`) with backend guardrails.
- **26th session:** Implemented distributed rate limiting across edge proxy, auth flows, public API, and dashboard server actions using Upstash Redis + sliding-window policies.

## 26th Session - Security Hardening: Distributed Rate Limiting

**When**
- Completed in this session on **2026-03-10**.

**Why**
- The app had no centralized request throttling for auth endpoints, public API reads, or server action mutations.
- That left critical surfaces exposed to brute-force attempts (`/login`), endpoint scraping (`/api/public-events`), and action spam/double-submit abuse on dashboard mutations.
- Goal: add layered protection without changing existing business flows/RLS behavior.

**How (Rollout Strategy)**
- Implemented a **layered** model instead of a single limiter:
- Edge coarse limiter in `src/proxy.ts` for broad traffic shaping.
- Route/action-specific strict limiters inside high-risk handlers.
- Used Upstash distributed counters (`@upstash/ratelimit` + `@upstash/redis`) with sliding-window policies so limits are consistent across instances.
- Added shared helpers for identity keys (IP/email/user-based) and reusable action-level assertions.

**Where (Files Changed)**
- Foundation / env / docs:
- `package.json`
- `package-lock.json`
- `.env.example`
- `README.md`
- `src/lib/security/rate-limit.ts`
- `src/lib/security/request-identity.ts`
- `src/lib/security/action-rate-limit.ts`
- Edge layer:
- `src/proxy.ts`
- Auth + public API:
- `src/app/login/actions.ts`
- `src/app/auth/signout/route.ts`
- `src/app/api/public-events/route.ts`
- Coach mutation actions:
- `src/app/dashboard/dojos/actions.ts`
- `src/app/dashboard/students/actions/index.ts`
- `src/app/dashboard/entries/actions/index.ts`
- `src/app/dashboard/events-browser/actions/index.ts`
- Organizer/admin mutation actions:
- `src/app/dashboard/approvals/actions/index.ts`
- `src/app/dashboard/events/actions/index.ts`
- `src/app/dashboard/events/[id]/actions.ts`
- `src/app/dashboard/events/[id]/entries/actions.ts`
- `src/app/dashboard/events/[id]/categories/actions/index.ts`

**Policy Highlights**
- Proxy matcher expanded to include `/dashboard/:path*`, `/api/:path*`, `/login`, `/auth/signout`.
- Auth policies:
- login attempts limited by `ip + normalized email`.
- signup attempts limited by `ip + normalized email`.
- Google OAuth initiation limited by `ip`.
- Public events API (`GET /api/public-events`) now returns `429` with `Retry-After` when limited.
- Dashboard server actions are now user-scoped (`user.id`) with stricter limits for bulk/destructive operations.

**Operational Notes**
- New required env vars:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- Current behavior is intentionally **fail-open** if Redis env vars are missing (logs warning once), to avoid accidental production outage from misconfiguration.

**Commit Sequence (incremental rollout)**
- `c61cafc` - shared distributed rate limiting foundation.
- `71ab1eb` - edge proxy rate limiting.
- `c49d23e` - auth flows + public API limits.
- `4d83789` - coach action limits.
- `88495fe` - organizer/admin action limits.

## 1) Supabase migration error: `must be owner of table users`

**Symptom**
- Running the SQL migrations failed with: `ERROR: 42501: must be owner of table users`

**Root cause**
- The migration attempted to run:
  - `alter table auth.users enable row level security;`
- `auth.users` is a Supabase-managed table owned by an internal database role (the `auth` schema owner), not by your migration role. So Postgres blocks that statement.

**Fix**
- Removed that statement from the initial schema migration.

**Why this is correct**
- You generally shouldn’t modify Supabase’s internal `auth.*` tables in your app migrations.
- Your app’s security is implemented via RLS policies on your own tables (e.g. `profiles`, `events`, `entries`, etc.).

## 2) “Merge the db files” (multiple migration files)

**Symptom**
- DB logic was split across multiple migration files (schema + view creation).

**Fix**
- Moved the `organizer_entries_view` creation into the initial schema migration.
- Turned the later view migration into a **no-op** to prevent duplicate definition errors.

**Why**
- Keeping the foundational schema and required views together reduces setup friction when bootstrapping a fresh database.

## 3) Login appears to “work” but you stay on the landing page

**Symptom**
- After logging in, you could manually visit `/dashboard` and it worked, but the UI didn’t guide you there.
- Landing page always showed “Login / Get Started” even when already logged in.

**Root cause**
- The landing page didn’t check `supabase.auth.getUser()` to render a logged-in state.
- The login page didn’t redirect already-authenticated users away from `/login`.

**Fix**
- Landing page now detects the current user and shows:
  - a **Dashboard** nav button
  - a **Go to Dashboard** hero CTA
- Login page now checks for an existing session and redirects authenticated users to `/dashboard`.

**Why**
- This aligns UI state with auth state so users don’t get “stuck” on marketing/landing views after a successful sign-in.

## 4) Next.js warning: `"middleware" file convention is deprecated. Please use "proxy" instead.`

**Symptom**
- `npm run dev` warns that `middleware.ts` is deprecated and should be renamed to `proxy.ts`.

**Root cause**
- Newer Next.js versions are renaming the file convention from `middleware` to `proxy`.

**Fix**
- Created `src/proxy.ts` with the same session-refresh logic.
- Removed `src/middleware.ts` so Next.js stops warning.

**Why**
- The warning is triggered by the presence of the `middleware` file.
- Using `proxy` follows the newer convention and avoids future breakage.

## Verification Checklist

- Start dev server: `npm run dev`
- Visit `/`:
  - Logged out: see Login / Get Started
  - Logged in: see Dashboard / Go to Dashboard
- Visit `/login` while already logged in:
  - you should be redirected to `/dashboard`
- Re-run migrations:
  - should not fail with `must be owner of table users`

## Notes

- If Google OAuth is used, make sure `NEXT_PUBLIC_BASE_URL` matches your local site (e.g. `http://localhost:3000`) and also matches the redirect URL configured in Supabase Auth providers.

---

# Second Session 

This section captures the second round of issues and UX improvements around navigation/loading, auth feedback, and role management.

## 1) Dashboard navigation felt “unresponsive” / loader appeared late

**Symptom**
- Clicking dashboard sidebar links sometimes showed no feedback for a moment.
- Then a loader would appear only briefly (felt useless).

**Root cause**
- Next.js App Router `loading.tsx` only renders once the new route actually suspends/streams.
- Fast routes may not show a loader at all; slower routes may show it late.

**Fix / Addition**
- Added an immediate client-side navigation overlay that starts on click.
- Added a determinate progress bar that ramps up while navigation is in-flight and completes when the route changes.

**Why this is correct**
- This provides instant feedback (click → loader) instead of waiting for suspense boundaries.
- It avoids adding heavy “real network progress” tracking that could slow the app.

## 2) Clicking the same section caused “reloading” / slow refresh

**Symptom**
- Clicking “My Entries” while already on “My Entries” triggered a slow transition.

**Root cause**
- The click handler still allowed “navigate to the same URL”, which can cause unnecessary route work.

**Fix**
- Updated the dashboard nav link wrapper to treat same-path clicks as a no-op.

## 3) Two loaders showed (full overlay + partial right-side loader)

**Symptom**
- After the full-page overlay, a second loader appeared inside the dashboard content area (only on the right side), which looked odd.

**Root cause**
- Route-level `loading.tsx` inside `/dashboard` was rendering in the `children` area after the overlay.

**Fix**
- Disabled the dashboard segment `loading.tsx` (so the overlay is the main navigation feedback).

## 4) Progress bar looked “static” during login/register/sign out

**Symptom**
- Auth actions (login/register/logout) didn’t show the progress animation.

**Root cause**
- The “navigation overlay” logic initially only existed in the dashboard shell.
- Some auth redirects only changed query params (e.g. `/login?message=...`), which can prevent a pathname-only detector from closing the overlay.

**Fix / Addition**
- Added an app-wide navigation provider so the overlay/progress can be shown outside the dashboard too.
- Updated the “route changed” detection to consider `pathname + searchParams`, not just `pathname`.
- Kept the same loader design and changed only the text for auth actions:
  - Login/Register: “Please wait while we log you in”
  - Sign out: “Please wait while we log you out”

## 5) Login page had no way back to the hero page

**Symptom**
- From `/login`, there wasn’t an obvious way to return to the landing page.

**Fix / Addition**
- Made the “EntryDesk” title link back to `/`.
- Added an explicit “Back to Home” button/link.

## 6) Supabase roles/coaches not visible in `public.profiles` (Not fixed, rn just hardcoded into db file)

**Symptom**
- Supabase Auth → Users showed accounts, but `public.profiles` was empty.
- Roles (coach/organizer) couldn’t be managed via the `profiles` table because there were no rows.

**Root cause**
- Auth works independently using `auth.users`.
- The app role system depends on `public.profiles`, but there was no automatic mechanism (trigger or app code) inserting a profile row for each user.

**Fix / Workaround used**
- Manually inserted/updated the missing `profiles` row using the user’s Auth UID and email.

**Why this matters**
- Without a `profiles` row, the app can authenticate users, but cannot reliably assign/lookup roles.
- Long-term, this should be automated (e.g. a DB trigger on `auth.users` insert) to prevent `profiles` from staying empty.


---

# Session 3 — Log of Fixes, Additions & Modifications

This session focused on making the dashboard behave like a “real product”: reliable data flows (especially coach→event apply), clearer organizer vs coach meaning, clickable + consistent UI patterns, and navigation that behaves predictably.

---

# Session 24 — Event Creation Hardening, Registration UX, and Event Visibility Rules

This session focused on event reliability (create flow + build stability), consistent registration-deadline display, card layout consistency, and aligning visibility behavior to product intent.

## 1) Event create failures (`500`) + confusing validation behavior

**Symptom**
- Event creation intermittently failed with a generic `Failed to create event` alert and `POST /dashboard/events 500`.
- Registration date validation rejected valid flows where registration closes before the event starts.
- Browser accessibility warnings reported mismatched `<label for=...>` references.

**Root cause**
- Server action could throw on DB/schema mismatch and surfaced only a generic client alert.
- Validation rule incorrectly required registration close date to be *between* start/end.
- Multiple form labels targeted non-existent element ids.

**Fix**
- Hardened create-event server action error handling and validation responses.
- Corrected date rules:
  - event `start_date <= end_date`
  - `registration_close_date <= start_date`
- Fixed label/id mappings in create-event dialog and wired submit handling to display returned server messages.

**Where**
- `src/app/dashboard/events/actions/index.ts`
- `src/components/events/create-event-dialog.tsx`

**Why**
- Prevents opaque failures, keeps validation aligned with real event workflows, and improves accessibility/autofill behavior.

---

## 2) Build break: incorrect Radix imports

**Symptom**
- Build failed with `Module not found` for accordion/switch UI modules.

**Root cause**
- UI primitives were imported from the umbrella `radix-ui` package name instead of scoped React packages.

**Fix**
- Replaced imports with:
  - `@radix-ui/react-accordion`
  - `@radix-ui/react-switch`
- Added/installed missing direct dependencies.

**Where**
- `src/components/ui/accordion.tsx`
- `src/components/ui/switch.tsx`
- `package.json`

**Why**
- Ensures Turbopack/Next resolves modules reliably and avoids transitive dependency ambiguity.

---

## 3) Registration deadline visibility across event surfaces

**Symptom**
- Registration close date/status was missing or inconsistent across hero/public, coach, and organizer event cards.

**Fix**
- Added shared `RegistrationDeadline` component displaying:
  - `Last date for Registration: DD/MM/YYYY`
  - subtle status dot (green=open, blue=closed)
- Integrated the row into key event list/card surfaces and dialog metadata.

**Where**
- `src/components/events/registration-deadline.tsx`
- `src/components/app/public-events-section.tsx`
- `src/components/app/public-events-shell.tsx`
- `src/app/api/public-events/route.ts`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/coach-active-events-cards.tsx`
- `src/app/dashboard/entries/page.tsx`

**Why**
- Provides a consistent and visible registration deadline signal everywhere users evaluate event availability.

---

## 4) Public card height inconsistency due to wrapping addresses

**Symptom**
- Public event cards became uneven because long location/address text wrapped to multiple lines.

**Fix**
- Enforced one-line truncation for card metadata rows (title/date/location/registration row) and kept full details in dialog.
- Stabilized card layout using full-height flex column behavior.

**Where**
- `src/components/app/public-events-section.tsx`
- `src/components/events/registration-deadline.tsx`

**Why**
- Keeps grid rhythm visually consistent while preserving full content discoverability via `View event`.

---

## 5) Visibility behavior intent: `is_public` should control hero only

**Symptom**
- Coaches could not see private events because coach-facing queries were still filtered by `is_public = true`.

**Fix**
- Removed `is_public` filtering from coach dashboard/browser queries.
- Kept public API (`/api/public-events`) filtered by `is_public` for hero/public-only listing.

**Where**
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/api/public-events/route.ts` (unchanged behavior intentionally)

**Why**
- Aligns product behavior: public toggle controls hero/public exposure, not coach operational visibility.

---

# Session 25 — Registration Closed Lockdown for Coach Entry Flow

This session enforced product behavior where registration closure should behave like a past event for coach actions, even when the event still appears under Active Events.

## 1) Coaches could still create/submit entries after organizer closed registration

**Symptom**
- After organizer toggled registration off (or close date passed), coaches could still add/edit/submit/delete entries.
- This conflicted with expected behavior: event can stay visible, but coach entry operations must be inaccessible.

**Root cause**
- Coach mutation actions were checking role/auth only, not event registration state.
- Read-only UI mode on coach event page was tied primarily to past-event date checks.

**Fix**
- Added a shared registration lock helper that treats an event as closed when any of these are true:
  - event is past (`end_date < today`)
  - organizer toggled `is_registration_open = false`
  - `registration_close_date` is before today
- Applied backend guardrails to all coach entry mutation actions.
- Switched coach event page read-only mode to use the shared registration lock state.

**Where**
- `src/lib/events/registration.ts`
- `src/app/dashboard/entries/actions/index.ts`
- `src/app/dashboard/entries/[eventId]/page.tsx`

**Why**
- Ensures business rules are enforced server-side (cannot be bypassed via UI/devtools) and keeps behavior consistent with organizer registration controls.

---

## 2) Event application and coach CTA states did not reflect closed registration clearly

**Symptom**
- Coaches could still attempt `Request to Participate` in some flows.
- UI feedback for blocked actions was too generic.

**Fix**
- Blocked `applyToEvent` server action when registration is closed.
- Added `registrationClosed` UI path in apply button to render disabled `Registration Closed` state.
- Passed registration-closed state from active coach event surfaces.
- Improved coach bulk/register error surfaces to show specific server messages (e.g. `Registration is closed for this event`).

**Where**
- `src/app/dashboard/events-browser/actions/index.ts`
- `src/components/events/apply-button.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/components/dashboard/coach-active-events-cards.tsx`
- `src/components/coach/coach-entries-list.tsx`
- `src/components/coach/coach-student-register.tsx`

**Why**
- Keeps coach UX explicit and predictable while matching backend enforcement.



Below is a detailed, chronological and technical log of what changed, why it was needed, and how it was implemented.

## 0) Goal / UX direction for Session 3

**Primary UX goals**
- Reduce “dead UI”: metric cards should be actionable and take you to the relevant filtered view.
- Remove redundant page headers / duplicated blocks (the “top 3 texts” issue).
- Keep organizer and coach UI consistent in density and component sizing.
- Fix coach application flow (coach applies to event) and make approvals/coach names display correctly.
- Fix back navigation: back should go one step back (history), not jump to a fixed list page.

**Data/logic goals**
- Prevent hard failures when creating rows that depend on `public.profiles`.
- Make coach identity display stable even when `profiles.full_name` is empty.
- Make “Approved coaches” (applications) clearly distinct from “Approved entries” (entries status).

---

## 1) Next.js build/runtime issue: `useSearchParams()` must be wrapped in Suspense (404 prerender)

**Symptom**
- Production build complained about `useSearchParams()` needing a Suspense boundary for `/_not-found` / `/404` prerender.

**Root cause**
- Some global client/provider code referenced `useSearchParams()` (directly or indirectly).
- Next.js requires Suspense boundaries around certain hooks during pre-rendering paths.

**Fix**
- Wrapped the app provider tree with `<Suspense>` in `src/app/layout.tsx`.

**Why this works**
- It satisfies Next’s requirement for suspenseful rendering paths without forcing every page to add its own boundary.

---

## 2) Coach “Apply to event” failing (POST 500 + “Error applying to event”)

**Symptom**
- Coaches clicking “Apply” saw 500 errors and an alert failure.
- The server-side action inserting into `event_applications` failed.

**Root cause**
- `event_applications.coach_id` references `public.profiles(id)`.
- For many users, there was no row in `public.profiles` yet (auth exists in `auth.users`, but the app identity exists in `public.profiles`).
- Without a profile row, inserts fail (FK) and/or RLS blocks follow-up queries.

**Fix (server action hardening)**
- Updated `src/app/dashboard/events-browser/actions/index.ts` to:
  1) Fetch the current user.
  2) Ensure a `profiles` row exists for `user.id` (create it if missing).
  3) Use an idempotent “already applied?” check via `.maybeSingle()`.
  4) Handle unique constraint races (`23505`) as “Already applied”.
  5) On profile creation, best-effort populate `profiles.full_name` from user metadata or email prefix.

**Fix (client refresh + UX)**
- Updated `src/components/events/apply-button.tsx` to:
  - call the server action
  - surface the returned message clearly
  - call `router.refresh()` to update the UI after apply succeeds

**Why this is correct**
- It prevents a hard dependency on “profiles must be pre-provisioned.”
- It makes the apply action safe under concurrency (two fast clicks / double submissions).
- It improves display data quality (names) without requiring an immediate DB trigger.

---

## 3) Organizer approvals: coach name not appearing

**Symptom**
- Organizer approvals list showed blank coach names.

**Root cause**
- `profiles.full_name` was empty for some coaches.
- Some UI assumed full_name always existed.

**Fix**
- Approvals UI now falls back in this order:
  1) `profiles.full_name`
  2) `profiles.email`
  3) email prefix
  4) `—`

**Where**
- Organizer approvals pages (global and per-event):
  - `src/app/dashboard/approvals/page.tsx`
  - `src/app/dashboard/events/[id]/approvals/page.tsx`

**Why**
- A display name should never be “missing”; fallback prevents confusing empty UI.

---

## 4) “Approved entries” confusion vs “Approved coaches”

**Symptom**
- User expected approved coaches to show in “Approved entries” or vice versa.

**Root cause (domain mismatch)**
- “Approved entries” refers to `entries.status = 'approved'`.
- “Approved coaches” refers to `event_applications.status = 'approved'`.
- These are different tables and workflows.

**Fix / Clarification added in UI**
- Event overview now shows an explicit “Approved Coaches” metric.
- Approvals pages emphasize that they are *coach approvals*, not entries approvals.

**Why**
- Prevents product confusion and makes metrics map directly to their table/state.

---

## 5) Deep-linking: dashboard metric cards behave like buttons

**Symptom**
- Dashboard stats looked clickable but didn’t navigate.
- User wanted “cards as buttons” to go to relevant pages.

**Fix**
- Updated dashboards to make metric cards link to appropriate routes and filtered views.
- Organizer event overview metrics link into the correct per-event entries/approvals pages with query params.

**Where**
- Organizer dashboard: `src/app/dashboard/page.tsx`
- Event overview: `src/app/dashboard/events/[id]/page.tsx`
- Coach dashboard: `src/components/coach/coach-overview.tsx` and `src/components/coach/coach-dashboard.tsx`

**Why**
- Metrics become navigation primitives: “see the number → click to see the list.”

---

## 6) Organizer per-event Entries/Approvals pages: redundant top blocks + inconsistent sizing

**Symptom**
- Entries/Approvals pages had separate header blocks, making one page feel “big” and the other “small.”

**Fix**
- Merged title/count/actions/filters into the Card header for both pages.
- Removed redundant top text blocks.

**Where**
- `src/app/dashboard/events/[id]/entries/page.tsx`
- `src/app/dashboard/events/[id]/approvals/page.tsx`

**Why**
- One consistent page pattern improves perceived quality and reduces vertical clutter.

---

## 7) Organizer event overview: show Approved Coaches list

**Symptom**
- Under “Approved Coaches” the metric existed, but user wanted names visible.

**Fix**
- Event overview now queries approved `event_applications` joined to `profiles` and renders a compact “Approved coaches” panel.

**Where**
- `src/app/dashboard/events/[id]/page.tsx`

**Why**
- A list is more useful than a count; names enable verification and reduce admin friction.

---

## 8) Coach event UI: removed tabs; merged overview/entries/register into one page

**Symptom**
- Tabs (“Overview / Entries / Register Athletes”) felt heavy and forced extra clicks.

**Fix**
- Refactored coach event view into a single-page layout:
  - Overview metrics always visible
  - Entries list always visible
  - Quick filter buttons (All/Drafts/Submitted/Approved)
  - “Register athletes” moved into a Dialog modal (faster flow)

**Where**
- `src/components/coach/coach-dashboard.tsx`
- `src/components/coach/coach-overview.tsx`
- `src/components/coach/coach-entries-list.tsx`

**Why**
- Fewer navigation affordances = fewer ways for users to get lost.
- Modal register flow keeps context (event) while completing the task.

---

## 9) Events list: make the entire event card clickable (not only “Manage”)

**Symptom**
- On organizer events list, only the “Manage” button navigated.

**Fix**
- Made the entire card clickable using a full-card overlay link.
- Kept “Manage” button above the overlay via z-index so it still works.

**Where**
- `src/app/dashboard/events/page.tsx`

**Why**
- More forgiving click target, faster navigation, and matches modern dashboard UX.

---

## 10) Back button behavior: must go one step back (history) everywhere

**Symptom**
- Back arrow on organizer event pages jumped directly to `/dashboard/events` instead of going back one step (e.g., Approved Coaches → Event dashboard).

**Root cause**
- Back controls were implemented as normal links to fixed routes, not history navigation.

**Fix (reusable component)**
- Added a reusable client component that uses `router.back()` with a fallback when there’s no history (opened in a new tab):
  - `src/components/app/history-back.tsx`

**Fix (made it consistent everywhere)**
- Added a single global back button to the dashboard shell so it appears on every dashboard page (organizer + coach).
- Removed page-specific back controls that could conflict or jump to fixed routes.
- Also updated login to use a one-step back with fallback to home.

**Where**
- Global dashboard back: `src/app/dashboard/layout.tsx`
- Removed per-event back (duplicate): `src/app/dashboard/events/[id]/layout.tsx`
- Removed coach local back (duplicate): `src/components/coach/coach-dashboard.tsx`
- Login back uses history: `src/app/login/page.tsx`

**Why**
- This matches user expectation for a “Back” affordance.
- It prevents accidental jumps to list pages when the user wanted to go back one screen.

---

## 11) Notes / Known state

- `npm run build` succeeds.
- If `npm run dev` still exits with code 1, the next step is to capture the full terminal output (stack trace / error message) so we can address the root cause. Build passing usually means the issue is dev-only (often environment, runtime fetch, or a route that only executes in dev).

---

# Session 4 — Dashboard UX / Navigation Parity (Desktop + Mobile) & Light-Mode Separation

This session focused on reducing dashboard clutter, making coach “event browsing” feel first-class, ensuring mobile navigation parity with the desktop sidebar, and making light mode visually readable (clear separation without harsh borders).

## 0) Goal / UX direction for Session 4

**Primary UX goals**
- Remove redundant navigation items and make the dashboard home more useful.
- Ensure mobile has a real “side panel” experience.
- Keep the back navigation available everywhere, but without consuming valuable content/header space.
- Improve light-mode depth/separation consistently across dashboard pages.

---

## 1) Coach event browsing: move “Browse Events” into dashboard home

**Symptom**
- “Browse Events” existed as a separate dashboard section/page/link, but the user wanted it inside the dashboard home.

**Fix**
- Added a “Browse Events” section to the coach dashboard home rendering public events.
- Removed the separate “Browse Events” nav entry so users don’t have two places for the same thing.

**Where**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/layout.tsx`

**Why**
- Home becomes the default “start here” surface for coaches.
- Fewer duplicate navigation targets reduces confusion.

---

## 2) Coach application UI: Approved/Pending/Rejected still showed “Request to Participate”

**Symptom**
- Even when an application was already approved, the UI still showed the action as if it wasn’t applied.

**Root cause**
- The caller was not providing the application `status` into the `ApplyButton`, so it rendered its default “apply” state.

**Fix**
- Build an `event_id -> status` map from `event_applications` and pass `status={status}` into `ApplyButton`.

**Where**
- `src/app/dashboard/page.tsx`

**Why**
- `ApplyButton` already supports status-driven rendering; the issue was the wrong prop/inputs at the call site.

---

## 3) Back button “takes too much space”: reduce clutter by moving it into the sidebar

**Symptom**
- The back button was taking too much vertical/header space and competing with page content.

**Fix**
- Kept the global history back behavior, but relocated the back control into the dashboard sidebar (desktop).
- Used a small gating/wrapper component so it renders consistently from the dashboard shell.

**Where**
- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/dashboard-back-gate.tsx`
- `src/components/app/history-back.tsx`

**Why**
- The back action stays available “at any cost,” but does not inflate each page layout.

---

## 4) Settings removed from both organizer + coach navigation

**Symptom**
- Dashboard nav included Settings, but it wasn’t needed.

**Fix**
- Removed Settings UI from the dashboard sidebar/nav.

**Where**
- `src/app/dashboard/layout.tsx`

**Why**
- Reduces noise and keeps nav focused on core tasks.

---

## 5) Mobile dashboard had no side panel: add hamburger + slide-out nav (Sheet)

**Symptom**
- On mobile there was no functional equivalent to the desktop sidebar.

**Fix**
- Added a mobile top bar with a hamburger trigger.
- Implemented a slide-out left “Sheet” drawer and rendered the dashboard navigation inside it.

**Where**
- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/mobile-nav.tsx`

---

# Session 10 — Hero/Auth Redesign + Dashboard UI Normalization + Branding Cleanup

This session focused on aligning the product UI with the redesign references while keeping existing product behavior and data flows intact.

## 1) Landing page redesign mismatch (hero looked disconnected from actual product)

**Symptom**
- Landing page visuals did not match the redesign reference.
- Hero mock content did not reflect real coach/organizer workflows.
- CTA wording needed `Login / Signup` instead of old sign-in wording.

**Root cause**
- Existing landing page used a prior visual pattern and generic hero previews.
- Branding mark used placeholder text blocks (`ED`) instead of the actual favicon asset.

**Fix**
- Reworked landing navbar + hero content and CTA language.
- Added a dedicated coach/organizer preview section that mirrors actual dashboard concepts.
- Updated branding mark in landing header to use the favicon image (`/favicon.ico`) instead of text-based placeholder.

**Where**
- `src/app/page.tsx`
- `src/components/app/landing-ui-preview.tsx`

## 2) Login/Register UI needed to match hero language + clear auth feedback

**Symptom**
- Login/Register screen looked stylistically detached from the updated landing page.
- Auth failures were generic and not user-friendly.

**Root cause**
- Login page and auth action redirects used broad error strings without stable message codes.

**Fix**
- Redesigned `login` + `register` tabs to match the same visual language as the hero.
- Added structured auth status codes in server actions.
- Added explicit inline messages for:
  - invalid credentials,
  - generic login failure,
  - signup failure,
  - Google auth launch failure,
  - post-signup “check email” success guidance.
- Replaced login header placeholder mark with favicon image (`/favicon.ico`).

**Where**
- `src/app/login/page.tsx`
- `src/app/login/actions.ts`

## 3) Dashboard pages felt visually inconsistent (harsh borders / uneven surfaces)

**Symptom**
- Cards, tables, and list containers across dashboard pages had inconsistent border/overlay intensity.
- Interaction feedback varied by page and felt fragmented.

**Root cause**
- Several pages used page-local style combinations instead of shared dashboard surface/list primitives.

**Fix**
- Added shared dashboard component-layer classes for:
  - shell-level surface containers,
  - list separators,
  - empty states,
  - subtle active/press interactions.
- Applied those shared styles across core dashboard pages.

**Where**
- `src/app/globals.css`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/entries/page.tsx`
- `src/app/dashboard/approvals/page.tsx`
- `src/app/dashboard/students/page.tsx`
- `src/app/dashboard/dojos/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/events/[id]/entries/page.tsx`

## 4) List pages needed strict server-side pagination (50 rows/page)

**Symptom**
- Large datasets could over-render in list screens.
- UX required strict page windows (e.g., 1–50, 51–100).

**Root cause**
- Some pages were still fully loading records or mixing server and client pagination patterns.

**Fix**
- Added uniform server-side pagination with page query param and `.range(...)` limits (`50`).
- Updated shared pagination component to show row ranges (`start-end of total`).
- Removed conflicting client-side row pagination from students table so server pagination remains authoritative.

**Where**
- `src/components/ui/pagination-controls.tsx`
- `src/components/students/student-data-table.tsx`
- `src/app/dashboard/students/page.tsx`
- `src/app/dashboard/dojos/page.tsx`
- `src/app/dashboard/entries/page.tsx`
- `src/app/dashboard/approvals/page.tsx`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/events/[id]/entries/page.tsx`

## 5) Organizer home dashboard required actionable active-event visibility

**Symptom**
- Organizer home lacked a direct “your active events” section with full-row navigation.

**Fix**
- Added organizer-only `Your Active Events` block on dashboard home.
- Queried organizer events with active date condition (`end_date >= today`).
- Made each list row fully clickable to the event detail route.

**Where**
- `src/app/dashboard/page.tsx`

## 6) Organizer quick-actions sizing mismatch (needed identical compact cards)

**Symptom**
- Quick action tiles looked oversized/uneven.

**Fix**
- Reduced quick-actions section spacing and tile paddings.
- Locked both quick-action cards to the exact same compact dimensions and icon sizing.

**Where**
- `src/app/dashboard/page.tsx`

## 7) Branding mark cleanup: replace placeholder logos with favicon image

**Symptom**
- UI still showed placeholder logo marks (`ED` blocks / icon substitutes) in multiple headers.

**Fix**
- Replaced placeholder logo marks with the favicon image (`/favicon.ico`) in primary brand touchpoints.
- Removed now-unneeded decorative icon imports used only for placeholder brand marks.

**Where**
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/mobile-nav.tsx`

## Verification notes

- Checked updated files for TypeScript/compile diagnostics after critical patches.
- Confirmed no remaining `ED` or `Prize` placeholder branding strings in `src/**` UI code.

---

# Session 9 — Bulk Student Import UX + Data Normalization

This session fixes a handful of issues discovered while using the dashboard in real workflows: the nav drawer sizing, dojo save failures, DOB import edge cases from Excel, and quality-of-life tools in the bulk student import review screen.

## 1) Dashboard drawer showed oddly on mobile/desktop

**Symptom**
- The slide-out dashboard nav (Sheet) could look clipped or oddly sized depending on viewport/breakpoint.

**Fix**
- Refactored the mobile nav sheet layout to be a stable full-height column layout.
- Adjusted the shared Sheet variants so left/right drawers use full width/height on small screens.

**Where**
- `src/components/dashboard/mobile-nav.tsx`
- `src/components/ui/sheet.tsx`

## 2) Dojo create/update failed with a generic “Failed to save dojo”

**Symptom**
- Dojo creation/update would fail and the UI only showed a generic error.

**Root cause**
- Some workflows hit RLS/foreign key dependencies that require a `public.profiles` row for the logged-in user.

**Fix**
- Ensure a profile row exists (best-effort create on demand) before role checks / downstream inserts.
- Bubble up the underlying Supabase error messages so the UI shows the real cause.

**Where**
- `src/lib/auth/require-role.ts`
- `src/app/dashboard/dojos/actions.ts`
- `src/components/dojos/dojo-dialog.tsx`

## 3) DOB kept showing as a number (e.g. 39291)

**Symptom**
- Date of Birth imported from Excel sometimes appeared as a number in the UI.

**Root cause**
- Excel often stores dates as a serial number; XLSX parsing can surface the raw numeric value.

**Fix**
- Added DOB normalization that converts Excel serials (and a few common text formats) into ISO `YYYY-MM-DD`.
- Applied normalization at ingestion (bulk upload parse), at save (server actions), and at display (tables/forms/age calc).

**Where**
- `src/lib/date.ts`
- `src/components/students/student-bulk-upload.tsx`
- `src/app/dashboard/students/actions/index.ts`
- `src/components/students/student-dialog.tsx`
- `src/components/students/student-data-table.tsx`
- `src/components/entries/entry-row.tsx`

## 4) Bulk upload review needed “quick functions” (delete rows)

**Request**
- Add a checkbox at the end for quick actions like delete.

**Fix**
- Added a rightmost checkbox column (row selection + select-all).
- Added a minimal bulk action: **Delete selected** (removes selected rows from the import list).

**Where**
- `src/components/students/student-bulk-upload.tsx`
- `src/components/ui/sheet.tsx`

**Why**
- Mobile users get the same navigation affordances as desktop, without compressing the UI into an always-visible sidebar.

---

## 6) Build error: “Parsing ecmascript source code failed” (malformed JSX)

**Symptom**
- Next.js dev/build failed with: `Parsing ecmascript source code failed`.

**Root cause**
- Malformed JSX (missing closing tags / incorrect nesting) introduced during iterative UI changes.

**Fix**
- Corrected JSX structure (balanced tags, fixed nesting) in the affected components/pages.

**Where**
- `src/app/dashboard/page.tsx`
- `src/app/login/page.tsx`
- `src/components/dashboard/mobile-nav.tsx`
- `src/components/dashboard/dashboard-back-gate.tsx`

**Why**
- These failures are parse-time errors; the only real fix is restoring valid JSX.

---

## 7) Light mode lacked separation/depth: apply consistent borders + shadows across dashboard

**Symptom**
- Dark mode looked fine, but in light mode cards and containers blended together.

**Root cause**
- Some components relied on theme tokens that were too subtle in light mode.

**Fix**
- Switched key dashboard wrappers/cards to explicit light/dark border utilities (e.g. `border-black/10` + `dark:border-white/10`).
- Added soft gradients + shadows to make card boundaries readable in light mode.

**Where**
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/students/page.tsx`
- `src/app/dashboard/approvals/page.tsx`
- `src/app/dashboard/entries/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/dojos/page.tsx`

**Why**
- Improves readability and perceived quality without adding heavy/harsh borders.

---

# Session 5 — Global Loading Overlay “Everywhere”

This session focused specifically on ensuring the app shows an immediate loading overlay whenever a click results in navigation, including cases that were previously missed (non-sidebar links and programmatic `router.push/replace/back`).

## 0) Goal / UX direction for Session 5

**Primary UX goals**
- If a click causes a route change and the next screen is slow, show a loader instantly.
- Do not rely on every individual button/link remembering to manually trigger a loader.
- Avoid duplicate/stacked loaders (one from dashboard, one global).

---

## 1) Some links still felt “dead”: loader wasn’t guaranteed outside the dashboard sidebar

**Symptom**
- Many buttons/links across the app could navigate, but the loader didn’t always appear immediately.
- The delay felt like the click “didn’t register” for ~2–3 seconds.

**Root cause**
- Loader triggering was not guaranteed globally for all link clicks (it depended on specific components calling `beginNavigation`).

**Fix**
- Added a global click-capture handler inside the app navigation provider that:
  - detects same-origin `<a href>` clicks
  - ignores modified clicks (new tab, ctrl/cmd click), downloads, hash links, external links
  - starts the loader immediately before navigation begins
  - does nothing for same-route clicks
- Added an escape hatch: `data-no-global-loader` on links to opt out.

**Where**
- `src/components/app/navigation-provider.tsx`

**Why**
- This provides a single “at any cost” guarantee for link-driven navigation without needing to touch every page/component.

---

## 2) Non-Link buttons (router.push/replace) didn’t show a loader

**Symptom**
- Filters/pagination/select controls that use `router.push()` / `router.replace()` could still feel slow with no immediate feedback.

**Root cause**
- These navigations are not `<a>` clicks, so the global link-capture handler won’t fire.

**Fix**
- Updated key components that do programmatic navigation to call `beginNavigation()` right before route changes.

**Where**
- `src/components/ui/pagination-controls.tsx`
- `src/components/events/entry-filters.tsx`
- `src/components/entries/event-filter.tsx`
- `src/components/app/history-back.tsx`

**Why**
- Ensures route transitions initiated by controls (not links) still show the same immediate loading feedback.

---

## 3) Avoid duplicate overlays: dashboard-specific loader vs app-wide loader

**Symptom**
- With both a dashboard navigation provider and an app navigation provider, it’s easy to end up with two loaders competing or inconsistent behavior.

**Fix**
- Standardized on the app-wide navigation provider for loader behavior.
- Dashboard navigation links were aligned to use the same global provider.

**Where**
- `src/app/layout.tsx` (App-wide provider host)
- `src/app/dashboard/layout.tsx` (removed the dashboard-only loader wrapper)
- `src/components/dashboard/nav-link.tsx`

**Why**
- One source of truth for “loader while navigating” keeps UX consistent and avoids stacked overlays.

---

## Notes / Limitations

- This guarantees loaders for route changes (navigation).
- For slow server actions that do **not** change the URL (e.g. submit → `router.refresh()` on the same route), the correct pattern is still:
  - `PendingButton` / `useFormStatus` for form submissions
  - `NavigationOnPending` to trigger the global overlay during pending server actions

---

# Session 6 — Role-Based Access Control (RBAC) Hardening

This session focuses on fixing “coach sees organizer UI” access leaks and tightening data-layer enforcement so UI and DB permissions match.

## 1) Coach users could access organizer pages and actions

**Symptom**
- Coach accounts could open organizer routes (events, approvals, organizer event entries).
- Coach UI sometimes showed “Organiser” label, causing confusion.

**Root cause**
- Pages and server actions relied on auth presence, not role checks.
- The dashboard layout hardcoded the sidebar label.

**Fix**
- Added a centralized role guard helper (`requireRole`) used by server components and server actions.
- Enforced role checks on organizer-only pages/actions and coach-only pages/actions.
- Updated the sidebar role label to reflect the actual profile role.

**Why this is correct**
- Role gating in the server layer prevents accidental access regardless of client UI state.
- A single guard avoids duplicated role logic across routes.

## 2) RLS policies allowed cross-role access and role escalation

**Symptom**
- Users could potentially interact with tables based on `auth.uid()` only, without role verification.
- `profiles` updates could be abused to change roles if not constrained.

**Root cause**
- Several policies used only ownership checks without role constraints.
- `profiles` update policy did not lock down role changes.

**Fix**
- Added role checks to dojos, students, entries, event_applications, categories, event_days, and events policies.
- Locked `profiles` inserts to `role = 'coach'` and prevented self-role changes on updates.
- Hardened `organizer_entries_view` to require organizer/admin roles.

**Why this is correct**
- It blocks privilege escalation and ensures the DB enforces the same rules as the UI.
- The organizer view now mirrors organizer-only access expectations.

## 3) Update-only Supabase migration workflow

**Symptom**
- Re-running the full schema migration caused “already exists” errors.

**Root cause**
- The initial schema file is not idempotent; it cannot be re-run on an existing DB.

**Fix**
- Added an update-only migration (`supabase/migrations/migration.sql`) that drops/recreates policies and replaces the view.

**Why this is correct**
- Incremental migrations avoid destructive schema resets and are safe to re-run on existing databases.

**Where**
- `src/lib/auth/require-role.ts`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/approvals/page.tsx`
- `src/app/dashboard/events/[id]/layout.tsx`
- `src/app/dashboard/events/[id]/approvals/page.tsx`
- `src/app/dashboard/events/[id]/categories/page.tsx`
- `src/app/dashboard/events/[id]/entries/page.tsx`
- `src/app/dashboard/events/actions/index.ts`
- `src/app/dashboard/approvals/actions/index.ts`
- `src/app/dashboard/events/[id]/categories/actions/index.ts`
- `src/app/dashboard/events/[id]/entries/actions.ts`
- `src/app/dashboard/dojos/page.tsx`
- `src/app/dashboard/students/page.tsx`
- `src/app/dashboard/entries/page.tsx`
- `src/app/dashboard/entries/[eventId]/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/entries/actions/index.ts`
- `src/app/dashboard/dojos/actions.ts`
- `src/app/dashboard/students/actions/index.ts`
- `src/app/dashboard/events-browser/actions/index.ts`
- `supabase/migrations/migration.sql`

---

# Session 7 — Dashboard Loader Unification (Single Loader)

This session focuses on fixing the “two different loading pages” that showed up when switching between dashboard pages in production.

## 1) Dashboard navigation showed two different loaders (prod only / much more visible in prod)

**Symptom**
- When switching between dashboard pages, the user would see the global overlay loader ("Changing stances...") and then a second full-page loader like "Loading dojos..." / "Loading students...".
- This was much more noticeable in production because navigation/data fetching takes longer, so suspense fallbacks render long enough to see.

**Root cause**
- Two loader systems were active inside `/dashboard`:
  - A client-side overlay loader ("Changing stances...") triggered on dashboard navigation.
  - Multiple route-level `loading.tsx` files under `src/app/dashboard/**/loading.tsx` that render page-specific loaders (different titles).
- When a dashboard route suspended during navigation, Next.js rendered the route-level `loading.tsx`, producing a second loader screen with different text.

**Fix**
- Standardized dashboard UX to a single loader during navigation:
  - Use a single route-level loader: `src/app/dashboard/loading.tsx` (one design).
  - Remove/disable dashboard overlay loader triggers so "Changing stances..." does not appear inside `/dashboard`.
  - Removed nested dashboard `loading.tsx` files so the dashboard-level loader is the only suspense fallback.

**Why this is correct**
- It guarantees one consistent loader design during dashboard-to-dashboard transitions.
- It avoids both problems at once:
  - double loaders (overlay + route fallback)
  - blank gaps (overlay hides before server data finishes)
- It keeps login/landing/non-dashboard behavior unchanged.

**Where**
- `src/app/dashboard/loading.tsx`
- `src/components/dashboard/nav-link.tsx`
- `src/components/app/navigation-provider.tsx`
- Deleted nested loaders under `src/app/dashboard/**/loading.tsx` (kept only the dashboard-level loader)

---

# Session 8 — Past Events + Coach Events Page

This session adds automatic “Past Events” grouping once an event date has passed, and refactors the coach dashboard so Home stays focused while a dedicated Events page shows all categories.

## 1) Organizer events needed a “Past Events” section

**Request / Symptom**
- Once an event is done (past the event date), it should be moved under a separate **Past Events** section on the organizer Events page.

**Root cause**
- Organizer events were rendered as a single list ordered by `start_date`, with no grouping logic.

**Fix**
- On `/dashboard/events`, split the organizer’s events into:
  - **Active Events**: `end_date >= today`
  - **Past Events**: `end_date < today`
- Render both sections on the page.

**Why this is correct**
- `events.end_date` is the canonical “event finished” boundary for multi-day events.
- Using an ISO date string (`YYYY-MM-DD`) keeps comparison stable for Postgres `date` values.

**Where**
- `src/app/dashboard/events/page.tsx`

## 2) Coach dashboard needed Home to show only Active + Approved

**Request / Symptom**
- Coach Home should show **Active Events** and **Approved Events**.
- Past events should not clutter Home.

**Root cause**
- Coach Home was effectively acting as a full event browser list.

**Fix**
- Coach Home (`/dashboard`) now shows:
  - **Approved Events** (approved applications) where `end_date >= today`
  - **Active Events** (public events) where `end_date >= today` and not already approved
- Removed past events from the Home lists.

**Where**
- `src/app/dashboard/page.tsx`

## 3) Coach needed a dedicated Events page with Active/Approved/Past sections

**Request / Symptom**
- Create a separate “Events” page under dashboard (similar to Dojos/Students pages).
- That page should show **Active**, **Approved**, and **Past** events in separate sections.

**Fix**
- Reworked `/dashboard/events-browser` into the coach Events page with three sections:
  - **Approved Events** (approved + upcoming)
  - **Active Events** (upcoming, not approved)
  - **Past Events** (end date passed)

**Where**
- `src/app/dashboard/events-browser/page.tsx`

## 4) Navigation updates for coach Events

**Fix**
- Added an **Events** link for coaches to the dashboard navigation (desktop + mobile) pointing to `/dashboard/events-browser`.

**Where**
- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/mobile-nav.tsx`

---

# Session 10 — UI Surface Polish + Demographics Visualization (Today)

This session focused on visual quality and consistency across organizer and coach event flows. The goal was to remove harsh/contrasty outlines, align hover/surface treatment with the Home cards, and improve readability of demographic metrics.

## 1) Harsh borders on cards/tables looked noisy

**Symptom**
- Card and table surfaces had high-contrast white-ish borders that felt sharp and distracting.
- Across pages, border weight/contrast was inconsistent.

**Root cause**
- Mixed border/shadow treatments accumulated across components over multiple iterations.
- Some list/table wrappers used stronger contrast than card surfaces.

**Fix**
- Softened border contrast and normalized container styling to subtle separators.
- Preserved borders (did not remove them entirely), but matched the softer Home-card treatment.

**Why this is correct**
- Maintains structure and separation while reducing visual noise.
- Keeps readability and hierarchy without “hard-line” artifacts.

## 2) Hover/surface behavior was inconsistent vs Home cards

**Symptom**
- Home cards had the preferred “smooth” hover/surface behavior, but coach/organizer event surfaces did not match.

**Fix**
- Applied Home card-style hover and surface treatment to:
  - coach event → My Entries card/list areas
  - organizer events list + manage-event related surfaces
  - student list/table blocks that were still using harsher styling

**Why this is correct**
- Users get one predictable visual language across dashboard modules.
- Reduces context switching cost and makes screens feel part of one system.

## 3) Organizer demographics block needed clearer information density

**Request / Symptom**
- Show Female first.
- Color F pink and M blue.
- Add bars that represent each gender’s entries as a proportion of total entries.

**Fix**
- Reordered demographic display to Female first, Male second.
- Applied pink styling for female and blue styling for male values.
- Added proportional bars using:
  - Female bar width = $\frac{femaleCount}{totalEntries} \times 100$
  - Male bar width = $\frac{maleCount}{totalEntries} \times 100$

**Why this is correct**
- Preserves exact counts while adding immediate visual ratio comprehension.
- Color + order + bars together improve scanability for organizers.

**Where (major touched areas)**
- `src/components/coach/coach-entries-list.tsx`
- `src/components/coach/coach-overview.tsx`
- `src/components/coach/coach-student-register.tsx`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/events/[id]/page.tsx`
- `src/app/globals.css`

---

# Session 11 — Duplicate Event Prevention (Frontend + Backend + Migration)

This session addresses accidental double-creation when users tap/click “Create Event” twice quickly. The fix is intentionally layered so each tier protects the next one.

## Problem statement

**Symptom**
- A rapid double tap on “Create Event” created two event rows.

**Why this can happen**
- UI can dispatch two submits before disabled/loading state is fully observed.
- Even with frontend guard, concurrent requests can still race at backend/database level.

## Architecture of the fix (defense in depth)

1) **Frontend guard**: prevent duplicate submit from the same dialog interaction.
2) **Backend guard**: detect recent same-payload create attempts and reuse existing event.
3) **Database guard**: unique index guarantees duplicates cannot persist under race conditions.

This three-layer model ensures reliability even when one layer is bypassed.

## 1) Frontend: immediate submit lock on Create Event dialog

**What changed**
- In the create dialog submit handler, an in-memory lock (`useRef`) is checked before processing.
- If already submitting, handler exits early.
- Lock is set before awaiting server action and always released in `finally`.
- Submit button remains disabled while `isSubmitting` is true.

**Why**
- Prevents accidental double-click/double-tap from issuing multiple create actions.
- `useRef` lock is synchronous and protects the tiny timing window around state updates.

**Where**
- `src/components/events/create-event-dialog.tsx`

## 2) Backend: dedupe check before insert + race-safe fallback

**What changed**
- Before insert, server action checks for a very recent existing event (same organizer + key fields) and returns that event if found.
- On insert error, if Postgres returns unique violation (`23505`), server fetches matching existing event and returns success with existing ID.

**Key match fields used for dedupe**
- `organizer_id`
- `title` (trimmed in action)
- `event_type`
- `start_date`
- `end_date`
- `location` (trimmed, null-safe handling)

**Why**
- Eliminates duplicate creation from near-simultaneous requests.
- Prevents user-facing failure in race scenarios by converting race collisions into idempotent success.

**Where**
- `src/app/dashboard/events/actions/index.ts`

## 3) Database migration: hard uniqueness guarantee

**What changed**
- Added unique index migration to enforce one logical event per organizer+payload.

**Migration file**
- `supabase/migrations/20260214_prevent_duplicate_events.sql`

**SQL used**
```sql
-- Prevent accidental duplicate event creation for the same organizer.
-- Treats case and NULL/empty location consistently.
CREATE UNIQUE INDEX IF NOT EXISTS events_dedupe_unique_idx ON events (
    organizer_id,
    lower(title),
    event_type,
    start_date,
    end_date,
    lower(coalesce(location, ''))
);
```

**Why this shape**
- `lower(title)` avoids duplicates differing only by text case.
- `lower(coalesce(location, ''))` treats `NULL` and empty location consistently.
- `IF NOT EXISTS` makes migration re-runnable safely.

## 4) How to apply this migration to an existing Supabase project

This repository’s standard setup flow uses Supabase SQL Editor.

### Step A — Pre-check duplicates (recommended)

```sql
select organizer_id, lower(title), event_type, start_date, end_date, lower(coalesce(location,'')), count(*)
from events
group by 1,2,3,4,5,6
having count(*) > 1;
```

If no rows return, proceed to Step B.

### Step B — Run migration SQL

Run contents of `supabase/migrations/20260214_prevent_duplicate_events.sql` in Supabase SQL Editor.

### Step C — Verify index exists

```sql
select indexname
from pg_indexes
where tablename = 'events'
  and indexname = 'events_dedupe_unique_idx';
```

### Step D — If Step B fails due to existing duplicates

Clean duplicates (keep newest per logical event), then rerun Step B:

```sql
delete from events e
using (
  select id from (
    select id, row_number() over (
      partition by organizer_id, lower(title), event_type, start_date, end_date, lower(coalesce(location,''))
      order by created_at desc, id desc
    ) as rn
    from events
  ) t where rn > 1
) d
where e.id = d.id;
```

## 5) Net result

- Double-tap on Create Event no longer creates duplicate rows.
- Concurrency races are handled gracefully.

---

# Session 12 — Safer Event Deletion (Accidental Delete Protection)

This session improves organizer safety around event deletion. The previous flow used a single click + browser confirm, which was easy to trigger unintentionally.

## Problem statement

**Symptom**
- Organizers could accidentally delete an event from a simple destructive button flow.

**Risk**
- Event deletion is high-impact and hard to recover from.
- A single lightweight confirmation (`window.confirm`) is not strong enough protection for destructive actions.

## New deletion pattern (multi-step confirmation)

The delete flow is now intentionally friction-based:

1) Open **3-dot actions menu**.
2) Choose **Delete event**.
3) See destructive warning dialog.
4) Type `delete` in an input field.
5) Final **Delete permanently** button enables only when typed text matches.

This combines intent confirmation + explicit user action before submitting the server action.

## What changed

### 1) Replaced inline delete button with actions menu
- Added a compact 3-dot trigger using existing dropdown primitives.
- Moved delete into a contextual menu item (`Delete event`).

### 2) Replaced `window.confirm` with custom destructive dialog
- Added a dedicated modal with stronger warning copy.
- Shows that deletion is irreversible and may remove related event data.

### 3) Added typed keyword confirmation gate
- User must type `delete` (case-insensitive) to unlock final submit.
- Prevents reflexive confirmation clicks.

### 4) Added event title context inside dialog
- The modal displays the current event title to reduce “wrong record” deletion mistakes.

## Why this is better than the old approach

- **Higher intent assurance:** requires explicit typed input, not just quick click-through.
- **Lower accidental activation:** delete action is no longer a primary visible button.
- **Context-aware safety:** event title in modal helps users verify they are deleting the intended event.
- **No backend contract change needed:** still uses existing server action (`deleteEvent`) with stronger frontend guardrails.

## Where

- `src/components/events/delete-event-form.tsx`
  - Reworked to use dropdown menu + dialog + typed confirmation gate.
- `src/app/dashboard/events/[id]/layout.tsx`
  - Passes `eventTitle` into delete component for contextual confirmation.

## Net result

- Accidental organizer deletions are significantly less likely.
- Intentional deletion remains available but now requires deliberate confirmation behavior.
- Database enforces final correctness even if client/server race paths occur.

---

# Session 13 — Public Landing + Hero/Footer + Navigation/UX Pass (Detailed)

This session focused on the public-facing experience (especially for logged-out users), anchor scrolling behavior, hero/footer polish, dashboard nav toggles, and image delivery optimization.

## 1) Public events should be visible without login

### Symptom
- On landing page, clicking **View event** forced `/login` every time.
- Users could not inspect basic public event details unless authenticated.

### Root cause
- Landing event card CTA was hard-wired to `/login?next=/events/:id`.

### Fix
- Replaced login redirect behavior with in-page event details interaction.
- Public cards always show basic event metadata (title/type/date/location/capacity).
- Description is hidden by default and shown only when explicitly requested.

### Files
- `src/app/page.tsx`
- `src/components/app/public-events-section.tsx` (new)

---

## 2) Split landing events into Upcoming/Past with 3-item preview + view-all

### Requirement
- Separate upcoming and past events.
- Show only 3 items by default in each section.
- Show “view all” only if section has more than 3.

### Fix
- Added two grouped lists:
  - **Upcoming events**
  - **Past events**
- Added section-local toggles:
  - `View all ...` / `Show less`
- Kept default preview at 3 cards per section.

### Files
- `src/components/app/public-events-section.tsx`

---

## 3) Hydration mismatch fix (date rendering)

### Symptom
- React hydration warning on landing events:
  - server/client date text mismatch (locale differences like `2/6/2026` vs `6/2/2026`).

### Root cause
- `toLocaleDateString()` inside a client-rendered path produced locale-dependent output.

### Fix
- Replaced locale-dependent formatting with deterministic formatter (`DD/MM/YYYY`).
- Passed server snapshot (`todayIso`) to client component for stable section grouping at hydration time.

### Files
- `src/components/app/public-events-section.tsx`
- `src/app/page.tsx`

---

## 4) “View event” should open popup modal (not inline slide-down)

### Requirement
- Open selected event in a big popup with blurred background.
- Keep description in popup view.

### Fix
- Replaced inline expansion with dialog modal flow:
  - selected event state
  - centered dialog
  - blurred backdrop
- Added explicit **Description** label in event modal content.

### Supporting change
- Extended shared `DialogContent` to accept `overlayClassName` for controlled overlay styling.

### Files
- `src/components/app/public-events-section.tsx`
- `src/components/ui/dialog.tsx`

---

## 5) Hash links should smooth-scroll on same page (no route-like jump)

### Symptom
- `Events` / `Browse Events` / `Features` felt like redirect/jump behavior.

### Root cause
- Hash targets + link wrappers were mixed; one button wrapped inside anchor created invalid structure.
- Smooth scroll rule was accidentally placed inside `:root` block (ineffective).

### Fix
- Switched landing hash navigation to plain anchors for in-page sections.
- Used valid `Button asChild` anchor markup.
- Moved smooth-scroll CSS to top-level `html { scroll-behavior: smooth; }`.

### Files
- `src/app/page.tsx`
- `src/app/globals.css`

---

## 6) Section targeting fixes + Contact nav

### Symptom
- `Events` sometimes landed where past list was more visible first.

### Fix
- Created explicit section target for upcoming list: `#upcoming-events`.
- Updated top-nav + CTA links to that anchor.
- Added top nav **Contact** link and anchored footer as `#contact`.
- Added scroll offsets (`scroll-mt-24`) to avoid fixed-header overlap.

### Files
- `src/app/page.tsx`
- `src/components/app/public-events-section.tsx`
- `src/components/app/landing-ui-preview.tsx`
- `src/components/app/site-footer.tsx`

---

## 7) Footer redesign pass (spacing, hierarchy, links)

### Requirement
- Footer looked cramped/bland and needed cleaner visual structure.

### Fixes applied iteratively
- Increased spacing and visual rhythm.
- Improved typography hierarchy and grouping.
- Added gradient/surface treatment and border consistency.
- Refined links and contact sections.
- Added contribution callout:
  - **Open for contribution** + GitHub link.
- Added icons:
  - GitHub icon
  - Email icons
- Added `Features` in links section.
- Later adjusted links to vertical stack and removed GitHub from links list (kept contribution callout link).

### Files
- `src/components/app/site-footer.tsx`

---

## 8) Footer image blending

### Requirement
- Use AI-generated image in footer background, blurred and blended.

### Fixes
- Copied asset into public path:
  - `public/footer bg.png`
- Added layered footer background system:
  - background image layer
  - gradient readability overlay
  - foreground content surface
- Tuned opacity/blur/position multiple times based on visual feedback to improve visibility.

### Files
- `public/footer bg.png`
- `src/components/app/site-footer.tsx`

---

## 9) “Mock Dashboard” messaging clarity in hero preview

### Requirement evolution
- Explicitly communicate preview is mock/sample data.
- Copy and placement iterated for readability.

### Finalized copy/layout
- Heading: **Mock Dashboards***
- Subtitle: **This is how it would look once you get started!!**
- Subtle note: **\*This is sample data**
- Subtitle centered under heading; sample-data note positioned to the right between heading block and view switch.

### Files
- `src/components/app/landing-ui-preview.tsx`

---

## 10) Hero image treatment from public asset

### Requirement
- Use hero image from `public` and match blended cinematic look.

### Fix
- Hero now uses full-bleed `next/image` background (`/Hero image.png`) with layered overlays and text-on-image contrast.

### Later tuning
- Reduced overlay darkness after feedback so image remains visible (not over-tinted).

### Files
- `src/app/page.tsx`

---

## 11) Header blend over hero + scroll-based opacity behavior

### Requirement
- Header should blend with hero at top.
- On scroll, header should retain stronger translucent/background-tinted behavior.

### Fix
- Introduced client landing header with scroll state:
  - at top: light blue-tinted translucent glass
  - after scroll threshold: stronger translucent background tint
- Added nav/button interaction polish (hover + active states), excluding theme switch.

### Files
- `src/components/app/landing-header.tsx` (new)
- `src/app/page.tsx`

---

## 12) Dashboard 3-bar toggle behavior (desktop + mobile)

### Requirement
- Add sidebar open/close 3-bar on desktop too.
- Verify mobile already has it.

### Findings
- Mobile already had hamburger (`MobileNav`) and was kept.
- Desktop initially got a separate top menu bar, which was rejected.

### Final fix
- Added sidebar-close hamburger inside desktop side panel itself.
- Added compact reopen hamburger in main area only when sidebar is collapsed.
- Removed separate desktop “Menu” top header row.

### Files
- `src/components/dashboard/responsive-dashboard-frame.tsx` (new)
- `src/app/dashboard/layout.tsx` (switched to responsive frame)

---

## 13) Image configuration optimization (requested as image-only pass)

### Requirement
- Apply image optimization config only (no extra UX changes).

### Fix
- Added Next.js image optimization config:
  - AVIF/WebP output formats
  - tuned `deviceSizes`
  - `imageSizes`
  - `minimumCacheTTL`
- Kept hero `sizes` explicitly responsive.

### Files
- `next.config.ts`
- `src/app/page.tsx`

---

## 14) Vercel production build error on dashboard entries page

### Symptom
- Vercel build failed during `next build` / TypeScript check with:
  - `TS2352: Conversion of type ... to type 'ApprovedEvent[]' may be a mistake...`
- Failure location:
  - `src/app/dashboard/entries/page.tsx` (around approved events mapping)

### Root cause
- Code assumed joined Supabase relation data from `event_applications.events` could be directly cast as `ApprovedEvent[]`.
- In practice, relation payload shape can be `object | object[] | null` depending on select shape/inference.
- The direct cast (`as ApprovedEvent[]`) bypassed safe narrowing and failed strict production type checks.

### Fix
- Removed unsafe direct cast.
- Added a runtime-safe normalization path:
  - flatten relation values whether single object or array
  - filter with explicit type guard `isApprovedEvent(...)`
- Result: `approvedEvents` is now constructed as truly narrowed `ApprovedEvent[]`.

### Why this is correct
- Handles real-world relation shape variance safely.
- Satisfies strict TypeScript checks without weakening types.
- Prevents runtime surprises from malformed/null relation values.

### Files
- `src/app/dashboard/entries/page.tsx`

### Verification
- VS Code diagnostics now report no errors for `src/app/dashboard/entries/page.tsx`.
- This addresses the exact Vercel compile-time blocker shown in deployment logs.

---

## Final status for this session

- Public landing now supports full event discovery without forced login.
- Event details open in modal with blur backdrop.
- Anchors scroll smoothly and land on intended sections.
- Hero/header/footer are visually blended and interaction-polished.
- Footer includes contribution/contact enhancements and blended background image.
- Dashboard desktop + mobile both provide 3-bar navigation toggles.
- Next image pipeline is configured for better mobile delivery.
- Vercel TypeScript build blocker on coach entries is resolved with safe relation normalization.

---

# Session 15 — Student Portal Integration & Landing UI Polish

This session focused on blending the hosted Student Profile Portal into EntryDesk’s public landing experience without breaking existing layout rhythm.

## 1) Integrate Testlist portal into landing flow

### Requirement
- Expose hosted student portal (`testlist.shorinkai.in`) inside EntryDesk landing experience.
- Add link in header/title bar and include clear explanatory content on page.

### Fix
- Added top-nav external link: **Student Portal**.
- Added a dedicated landing section for student-portal context + CTA.

### Files
- `src/components/app/landing-header.tsx`
- `src/app/page.tsx`
- `src/components/app/student-portal-section.tsx` (new)

---

## 2) Section content/layout refinement after visual feedback

### Symptom
- Initial integration left visible empty space and secondary CTA noise.
- “Continue in EntryDesk” CTA was unnecessary in that block.

### Root cause
- Right-side panel was too text-heavy and under-utilized visually.
- Section hierarchy did not match surrounding “showcase” style.

### Fix
- Removed “Continue in EntryDesk” button.
- Added heading + supporting line above section for better narrative flow.
- Replaced static snapshot text block with a compact **mock student profile UI** (identity card, belt badge, stats, competition history snippet).

### Files
- `src/components/app/student-portal-section.tsx`

---

## 3) Visual cleanup: too many border lines + accent overpowering content

### Symptom
- Preview looked overly outlined/“wireframe”.
- Green accent strip visually overpowered content and appeared to override avatar `A` tile.

### Root cause
- Excessive border usage on nested containers/tiles.
- Accent strip intensity + stacking made the avatar overlap feel visually incorrect.

### Fix
- Reduced border noise by switching multiple blocks to soft surfaces/rings.
- Toned accent to a muted gradient and reduced height.
- Fixed avatar overlap using explicit stacking and surface:
  - avatar tile now uses `z-10`
  - solid `bg-card` tile surface
  - adjusted top spacing (`pt-5`) and overlap depth (`-top-5`)

### Why this is correct
- Keeps brand accent while avoiding color dominance.
- Preserves readability and hierarchy in dark mode.
- Eliminates the “accent overriding avatar” visual artifact.

### Files
- `src/components/app/student-portal-section.tsx`

---

## Verification

- Diagnostics check completed for all touched files:
  - `src/app/page.tsx`
  - `src/components/app/landing-header.tsx`
  - `src/components/app/student-portal-section.tsx`
- Result: **No errors found**.


---

# Session 16 — Dashboard Mobile Nav & Responsive Frame Polish (2026-02-18)

This session focused on improving the dashboard mobile navigation experience and refining the responsive dashboard frame for better consistency and accessibility.

## 1) Mobile dashboard nav: accessibility, layout, and role clarity

**Symptom**
- Mobile nav sheet (hamburger menu) lacked clear accessibility structure and role clarity in the header.
- Brand/logo area was visually inconsistent and role label was sometimes unclear.

**Fix**
- Added `SheetTitle` for accessibility (Radix compliance) in the mobile nav sheet.
- Refined the header: EntryDesk logo uses favicon image, role label is always present and capitalized, and role logic is explicit (`Organizer` vs. role).
- Improved avatar fallback: always shows first letter of name or email.
- Polished the management section heading and badge styling for role.
- Improved layout and spacing for all header and footer elements.

**Where**
- `src/components/dashboard/mobile-nav.tsx`

**Why**
- Ensures mobile navigation is accessible, visually consistent, and clearly communicates user role.

---

## 2) Responsive dashboard frame: container and sidebar polish

**Symptom**
- Dashboard frame container used an unnecessary max-width wrapper, causing layout issues on large screens.

**Fix**
- Simplified the main dashboard frame container to remove the `mx-auto max-w-7xl` wrapper, using a full-width flex layout for better responsiveness.

**Where**
- `src/components/dashboard/responsive-dashboard-frame.tsx`

**Why**
- Ensures the dashboard layout is consistent and responsive across all screen sizes, matching the sidebar and content area behavior.

---------------------

# Session 17 — Coach Active/Approved Event Visibility & Routing Fix (2026-02-18)

This session focused on resolving coach dashboard confusion where approved upcoming events disappeared from **Active Events** and did not provide a direct action to manage entries.

## 1) Approved upcoming events missing from Active Events

**Symptom**
- Upcoming events that were already approved showed in **Approved Events** but were removed from **Active Events**.
- This made active participation flow feel broken because an event could be active by date but hidden from the active list.

**Root cause**
- Active-event filters explicitly excluded events whose application status was `approved`.

**Fix**
- Removed the exclusion filter so all upcoming events (`end_date >= today`) remain visible in **Active Events**, including approved ones.

**Where**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`

**Why this is correct**
- “Active” should represent date-based availability, not approval-state exclusion.
- Keeps UX consistent: upcoming events remain discoverable until the event end date.

---

## 2) Approved items in Active Events now route to entries

**Symptom**
- In Active lists, approved events still rendered application-style actions, which was not the correct next step for coaches.

**Fix**
- For approved status in Active Events, replaced apply-action behavior with a direct **Entries** button linking to `/dashboard/entries/{eventId}`.
- Non-approved statuses continue to use the existing apply/pending/rejected action flow.

**Where**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`

**Why this is correct**
- Once approved, the coach’s primary action is entry management, not re-application.
- Reduces friction by making the next valid action one click away.

---

## 3) Event lifecycle behavior (auto-vanish after end date)

**Behavior**
- Active/upcoming sections continue to use date gating (`end_date >= today`).
- This means if an event ends in 3 days, it remains visible for those 3 days and automatically disappears after its final date.

**Why this matches intended UX**
- Aligns both **Approved** and **Active** displays with event lifecycle timing.
- Prevents stale events from lingering in active surfaces.

---------------------

# Session 19 — Landing UI/Theme Polish + Hydration Stability (2026-02-22)

This session focused on visual polish and interaction quality on the landing experience, plus SSR/client consistency fixes in dashboard date rendering.

## 1) Dark background tuning (reduce glow)

**Symptom**
- Updated dark background felt too light/glowy in dashboard surfaces.

**Fix**
- Iteratively tuned dark mode base background from `#0a192f` → `#081427` → `#071222`.

**Where**
- `src/app/globals.css`

**Why this is correct**
- Preserves the navy theme direction while reducing luminous/halo perception.

---

## 2) Landing hero image not updating immediately

**Symptom**
- Replaced hero image did not appear immediately despite asset updates.

**Root cause**
- Cached optimized image persisted.
- Query-string cache busting on local image path caused Next image local-pattern runtime validation error in this setup.

**Fix**
- Switched to versioned file-name cache busting.
- Added `public/hero-image-v2.webp` and updated hero source to the versioned path.

**Where**
- `src/app/page.tsx`
- `public/hero-image-v2.webp`

**Why this is correct**
- Versioned asset names are cache-safe and compatible with local image path restrictions.

---

## 3) Dashboard hydration mismatch from locale-dependent dates

**Symptom**
- Recoverable hydration warning due to server/client date text mismatch (e.g. `2/25/2026` vs `25/2/2026`).

**Root cause**
- `toLocaleDateString()` without fixed locale/timezone produced different output between environments.

**Fix**
- Added deterministic date helpers and stable range formatting.
- Replaced locale-implicit dashboard date rendering in affected components.

**Where**
- `src/lib/date.ts`
- `src/components/dashboard/coach-active-events-cards.tsx`
- `src/app/dashboard/page.tsx`

**Why this is correct**
- Ensures SSR and client render identical date strings, preventing hydration drift.

---

## 4) Mock dashboard preview side-switch UX rework

**Symptom**
- Requested behavior was side switching between full Coach/Organizer dashboards, not internal metric-row scrolling.

**Fix**
- Rebuilt preview as a two-panel horizontal snap viewport (full-width Coach + Organizer panels).
- Wired top toggle buttons to controlled horizontal panel switching.

**Where**
- `src/components/app/landing-ui-preview.tsx`

**Why this is correct**
- Matches intended interaction model and keeps switch behavior explicit and predictable.

---

## 5) Modern minimal navigation indicator + improved auto-switch behavior

**Symptom**
- Native scrollbar looked visually heavy.
- Auto-switch could interrupt manual reading by switching back too quickly.

**Fix**
- Hid native horizontal scrollbar and added minimal two-pill indicator matching active panel.
- Implemented interaction-aware auto scheduling:
  - initial auto switch after visibility delay,
  - ongoing Coach/Organizer switching,
  - manual interaction pauses auto movement,
  - auto resumes only after 4.5s inactivity.

**Where**
- `src/components/app/landing-ui-preview.tsx`

**Why this is correct**
- Preserves discoverability through motion while respecting user control/read time.

---

## 6) Preview panel fill-gap cleanup

**Symptom**
- Organizer side could show dead vertical space in the preview body.

**Fix**
- Converted preview wrappers to full-height flex columns and expanded lower content blocks with `flex-1`.

**Where**
- `src/components/app/landing-ui-preview.tsx`

**Why this is correct**
- Produces consistent panel fill and avoids empty visual gaps while keeping existing layout style.

---

# Session 18 — Landing Performance Render Order & Public Events API Stabilization (2026-02-20)

This session focused on improving landing-page perceived performance and Core Web Vitals by prioritizing critical hero render, deferring heavy/non-critical sections, and fixing the public-events data path so first paint is not blocked.

## 1) Landing page initial render was blocked by server work

**Symptom**
- Home route performed user/session and events queries before initial HTML render.
- Hero felt delayed and first paint was slower than expected.

**Root cause**
- `src/app/page.tsx` was an async server component waiting on Supabase (`auth.getUser()` + events fetch) before returning UI.

**Fix**
- Refactored landing page to render immediately without awaiting data in the critical path.
- Kept above-the-fold content independent of API responses.

**Where**
- `src/app/page.tsx`

**Why this is correct**
- Removes render-blocking network work from initial route render.
- Improves FCP/LCP perception by shipping hero markup immediately.

---

## 2) Hero LCP element optimization (image + critical section)

**Requirement addressed**
- Main hero image must render immediately and must not be lazy-loaded.

**Fix**
- Hero uses `next/image` with:
  - `priority`
  - `quality={75}`
  - `sizes="100vw"`
  - `fill` in a sized hero container

**Where**
- `src/app/page.tsx`

**Why this is correct**
- Ensures the LCP image is treated as high priority and served responsively.
- Preserves stable layout sizing and avoids extra jank for the hero surface.

---

## 3) Deferred below-the-fold sections with progressive loading

**Symptom**
- Landing loaded heavy showcase sections together, increasing initial JS/render pressure.

**Fix**
- Converted non-critical sections to dynamic imports with loading fallbacks:
  - `LandingUiPreview`
  - `StudentPortalSection`
  - `PublicEventsShell`
- Added skeleton placeholders with reserved heights to reduce CLS while deferred chunks load.

**Where**
- `src/app/page.tsx`

**Build correction made during implementation**
- Initial attempt used `ssr: false` in `next/dynamic` from a server component (`app/page.tsx`), which is invalid in App Router.
- Removed `ssr: false` and retained loading fallbacks to keep behavior compliant.

**Why this is correct**
- Keeps critical content on first paint while progressively loading below-the-fold UI.
- Uses App Router-compatible dynamic import behavior.

---

## 4) Public events API moved off critical render and fetched client-side

**Symptom**
- Public events were queried during initial page render.

**Fix**
- Added client shell that fetches events asynchronously after mount.
- Added dedicated API route for public events.

**Where**
- `src/components/app/public-events-shell.tsx` (new)
- `src/app/api/public-events/route.ts` (new)

**Why this is correct**
- Page can paint immediately; events hydrate progressively without blocking hero render.

---

## 5) Header auth behavior changed to non-blocking client resolution

**Symptom**
- Header CTA previously depended on server auth resolution at page render time.

**Fix**
- `LandingHeader` now resolves session client-side (`supabase.auth.getSession()`) after first paint and swaps CTA state (`Login / Signup` ↔ `Dashboard`) when ready.

**Where**
- `src/components/app/landing-header.tsx`

**Why this is correct**
- Avoids server render dependency for hero/nav first paint while preserving auth-aware UI shortly after hydration.

---

## 6) `/api/public-events` error stabilization and root-cause correction

**Symptom**
- `/api/public-events` returned 500 in runtime.

**Root cause**
- Query selected a non-existent events column (`max_participants`) relative to current DB schema.

**Fix**
- Updated select list to schema-valid fields only:
  - `id,title,event_type,start_date,end_date,location,description`

**Where**
- `src/app/api/public-events/route.ts`
- Verified against schema in `supabase/migrations/db.sql`.

**Why this is correct**
- Fixes the actual failure source instead of masking errors.
- Keeps API payload aligned with table definition.

---

## 7) Proxy/middleware scope clarified for public landing performance

**Symptom**
- Middleware/proxy overhead appeared in home route timings.

**Fix**
- Scoped proxy matcher to dashboard routes only.

**Where**
- `src/proxy.ts`

**Why this is correct**
- Public landing flow no longer pays auth session-refresh middleware cost.
- Protected dashboard routes remain guarded.

---

## 8) Verification log

**Build**
- `next build` initially failed due to `ssr: false` in server component dynamic import.
- After removing `ssr: false`, production build completed successfully.

**Lint (targeted)**
- Targeted lint runs for touched landing/performance files completed without errors.
- Full-repo lint still reports many unrelated legacy issues (outside this session scope).

---

## Final state after session

- Hero/nav/image render immediately without waiting on API.
- Non-critical landing sections load progressively with reserved skeleton space.
- Public events load asynchronously after paint via API route.
- App Router constraints are respected (no invalid `ssr: false` usage in server component).
- Public-events query now matches current DB schema.# EntryDesk – Fixes & Root Causes 

This doc captures the main issues encountered while setting up/running the app locally, what was changed, and why.

## Session Summary (one-liners)

- **1st session:** Fixed Supabase migration ownership error (`auth.users` ownership/RLS).
- **1st session:** Consolidated DB schema into a single migration file.
- **1st session:** Fixed auth UX (landing shows Dashboard CTA; `/login` redirects when already logged in).
- **1st session:** Migrated Next.js `middleware.ts` → `proxy.ts` to remove deprecation warning.
- **1st session:** Repo hygiene: added `.env.example`, updated `.gitignore`, documented fixes.

- **2nd session:** Added instant navigation loader overlay for dashboard + app routes.
- **2nd session:** Added determinate progress behavior during route transitions.
- **2nd session:** Prevented same-route clicks from causing slow “reload-like” navigation.
- **2nd session:** Removed/disabled the awkward partial (right-side) loader so behavior is consistent.
- **2nd session:** Improved auth feedback + navigation (login/logout messaging, login page back-to-home links).
- **2nd session:** Clarified role management by populating `public.profiles` for coach/organizer roles.

- **3rd session:** Fixed Next.js prerender error by wrapping global provider usage in `Suspense`.
- **3rd session:** Fixed coach “Apply to event” 500 by ensuring a `profiles` row exists before inserting `event_applications`.
- **3rd session:** Improved coach name display (fallback to email/email prefix when `full_name` is missing).
- **3rd session:** Added “Approved coaches” list panel on event overview (not just the count).
- **3rd session:** Made dashboard/event metric cards clickable and deep-link to filtered pages.
- **3rd session:** Compacted organizer per-event Entries/Approvals pages by merging headers into the card UI.
- **3rd session:** Removed coach tabs and merged overview + entries + register into a single page with a register dialog.
- **3rd session:** Made organizer event list cards fully clickable (not only the “Manage” button).
- **3rd session:** Implemented consistent one-step back navigation (history back) across organizer + coach dashboard pages.

- **4th session:** Merged coach “Browse Events” into dashboard home and removed the separate nav section.
- **4th session:** Fixed “Approved” applications still showing “Request to Participate” (Apply button state).
- **4th session:** Moved the global back button into the sidebar to reduce page-header clutter.
- **4th session:** Added a mobile slide-out dashboard nav (hamburger + sheet) to match desktop sidebar.
- **4th session:** Removed Settings from both organizer + coach dashboard navigation.
- **4th session:** Improved light-mode separation (borders/shadows) consistently across dashboard pages.
- **4th session:** Fixed multiple “Parsing ecmascript source code failed” issues caused by malformed JSX.

- **5th session:** Implemented a truly global navigation loading overlay (any internal link click triggers loader instantly).
- **5th session:** Covered programmatic navigations (router.push/replace/back) so non-Link buttons also show a loader.
- **5th session:** Removed duplicate dashboard-only loader plumbing to avoid double overlays and keep behavior consistent.

- **6th session:** Enforced role-based access in dashboard pages and server actions (coach vs organizer).
- **6th session:** Hardened Supabase RLS policies and organizer view to prevent role escalation and cross-role access.

- **7th session:** Unified dashboard loading (single `/dashboard/loading.tsx`; disabled overlay loader inside dashboard).

- **8th session:** Split events into Active vs Past (organizer) and Active/Approved/Past (coach); coach Home shows only Active + Approved.

- **9th session:** Fixed dashboard drawer sizing across breakpoints (sheet full-width/full-height on small screens).
- **9th session:** Fixed “Failed to save dojo” by ensuring `public.profiles` row exists and surfacing Supabase error messages.
- **9th session:** Fixed DOB imported as numbers (Excel serials) via DOB normalization at parse, save, and render.
- **9th session:** Bulk upload review UX: added dojo selection in review step, cancel import, and row checkboxes + “Delete selected”.

- **10th session:** Dashboard UI polish pass — softened harsh borders, unified card/list hover surfaces to match Home style, and improved visual consistency for coach + organizer event pages.
- **10th session:** Updated organizer event demographics block: Female shown first, F/M color-coded (pink/blue), with per-gender participation bars based on total entries.

- **11th session:** Prevented accidental duplicate event creation end-to-end with layered protection: frontend submit lock, backend dedupe guard, and DB unique index migration.
- **11th session:** Documented safe Supabase rollout path for existing projects, including duplicate pre-check/cleanup SQL before applying the unique index.

- **12th session:** Hardened organizer event deletion UX with a 3-dot actions menu + destructive modal + typed confirmation (`delete`) to reduce accidental data loss.
- **13th session:** Completed image-only optimization pass (Next image formats/sizes/cache + responsive hero `sizes`) without introducing unrelated UX changes.
- **14th session:** Fixed Vercel production TypeScript build failure in dashboard entries by replacing an unsafe relation cast with normalized flattening + strict type guard filtering.
- **15th session:** Integrated external Student Profile Portal (`testlist.shorinkai.in`) into landing UX with header link + dedicated section, then iteratively polished the mock preview (spacing, styling, and accent/avatar overlap fixes).
- **17th session:** Fixed coach event visibility/actions so upcoming approved events also appear under Active Events with direct Entries navigation, and events auto-disappear after `end_date`.

## 1) Supabase migration error: `must be owner of table users`

**Symptom**
- Running the SQL migrations failed with: `ERROR: 42501: must be owner of table users`

**Root cause**
- The migration attempted to run:
  - `alter table auth.users enable row level security;`
- `auth.users` is a Supabase-managed table owned by an internal database role (the `auth` schema owner), not by your migration role. So Postgres blocks that statement.

**Fix**
- Removed that statement from the initial schema migration.

**Why this is correct**
- You generally shouldn’t modify Supabase’s internal `auth.*` tables in your app migrations.
- Your app’s security is implemented via RLS policies on your own tables (e.g. `profiles`, `events`, `entries`, etc.).

## 2) “Merge the db files” (multiple migration files)

**Symptom**
- DB logic was split across multiple migration files (schema + view creation).

**Fix**
- Moved the `organizer_entries_view` creation into the initial schema migration.
- Turned the later view migration into a **no-op** to prevent duplicate definition errors.

**Why**
- Keeping the foundational schema and required views together reduces setup friction when bootstrapping a fresh database.

## 3) Login appears to “work” but you stay on the landing page

**Symptom**
- After logging in, you could manually visit `/dashboard` and it worked, but the UI didn’t guide you there.
- Landing page always showed “Login / Get Started” even when already logged in.

**Root cause**
- The landing page didn’t check `supabase.auth.getUser()` to render a logged-in state.
- The login page didn’t redirect already-authenticated users away from `/login`.

**Fix**
- Landing page now detects the current user and shows:
  - a **Dashboard** nav button
  - a **Go to Dashboard** hero CTA
- Login page now checks for an existing session and redirects authenticated users to `/dashboard`.

**Why**
- This aligns UI state with auth state so users don’t get “stuck” on marketing/landing views after a successful sign-in.

## 4) Next.js warning: `"middleware" file convention is deprecated. Please use "proxy" instead.`

**Symptom**
- `npm run dev` warns that `middleware.ts` is deprecated and should be renamed to `proxy.ts`.

**Root cause**
- Newer Next.js versions are renaming the file convention from `middleware` to `proxy`.

**Fix**
- Created `src/proxy.ts` with the same session-refresh logic.
- Removed `src/middleware.ts` so Next.js stops warning.

**Why**
- The warning is triggered by the presence of the `middleware` file.
- Using `proxy` follows the newer convention and avoids future breakage.

## Verification Checklist

- Start dev server: `npm run dev`
- Visit `/`:
  - Logged out: see Login / Get Started
  - Logged in: see Dashboard / Go to Dashboard
- Visit `/login` while already logged in:
  - you should be redirected to `/dashboard`
- Re-run migrations:
  - should not fail with `must be owner of table users`

## Notes

- If Google OAuth is used, make sure `NEXT_PUBLIC_BASE_URL` matches your local site (e.g. `http://localhost:3000`) and also matches the redirect URL configured in Supabase Auth providers.

---

# Second Session 

This section captures the second round of issues and UX improvements around navigation/loading, auth feedback, and role management.

## 1) Dashboard navigation felt “unresponsive” / loader appeared late

**Symptom**
- Clicking dashboard sidebar links sometimes showed no feedback for a moment.
- Then a loader would appear only briefly (felt useless).

**Root cause**
- Next.js App Router `loading.tsx` only renders once the new route actually suspends/streams.
- Fast routes may not show a loader at all; slower routes may show it late.

**Fix / Addition**
- Added an immediate client-side navigation overlay that starts on click.
- Added a determinate progress bar that ramps up while navigation is in-flight and completes when the route changes.

**Why this is correct**
- This provides instant feedback (click → loader) instead of waiting for suspense boundaries.
- It avoids adding heavy “real network progress” tracking that could slow the app.

## 2) Clicking the same section caused “reloading” / slow refresh

**Symptom**
- Clicking “My Entries” while already on “My Entries” triggered a slow transition.

**Root cause**
- The click handler still allowed “navigate to the same URL”, which can cause unnecessary route work.

**Fix**
- Updated the dashboard nav link wrapper to treat same-path clicks as a no-op.

## 3) Two loaders showed (full overlay + partial right-side loader)

**Symptom**
- After the full-page overlay, a second loader appeared inside the dashboard content area (only on the right side), which looked odd.

**Root cause**
- Route-level `loading.tsx` inside `/dashboard` was rendering in the `children` area after the overlay.

**Fix**
- Disabled the dashboard segment `loading.tsx` (so the overlay is the main navigation feedback).

## 4) Progress bar looked “static” during login/register/sign out

**Symptom**
- Auth actions (login/register/logout) didn’t show the progress animation.

**Root cause**
- The “navigation overlay” logic initially only existed in the dashboard shell.
- Some auth redirects only changed query params (e.g. `/login?message=...`), which can prevent a pathname-only detector from closing the overlay.

**Fix / Addition**
- Added an app-wide navigation provider so the overlay/progress can be shown outside the dashboard too.
- Updated the “route changed” detection to consider `pathname + searchParams`, not just `pathname`.
- Kept the same loader design and changed only the text for auth actions:
  - Login/Register: “Please wait while we log you in”
  - Sign out: “Please wait while we log you out”

## 5) Login page had no way back to the hero page

**Symptom**
- From `/login`, there wasn’t an obvious way to return to the landing page.

**Fix / Addition**
- Made the “EntryDesk” title link back to `/`.
- Added an explicit “Back to Home” button/link.

## 6) Supabase roles/coaches not visible in `public.profiles` (Not fixed, rn just hardcoded into db file)

**Symptom**
- Supabase Auth → Users showed accounts, but `public.profiles` was empty.
- Roles (coach/organizer) couldn’t be managed via the `profiles` table because there were no rows.

**Root cause**
- Auth works independently using `auth.users`.
- The app role system depends on `public.profiles`, but there was no automatic mechanism (trigger or app code) inserting a profile row for each user.

**Fix / Workaround used**
- Manually inserted/updated the missing `profiles` row using the user’s Auth UID and email.

**Why this matters**
- Without a `profiles` row, the app can authenticate users, but cannot reliably assign/lookup roles.
- Long-term, this should be automated (e.g. a DB trigger on `auth.users` insert) to prevent `profiles` from staying empty.


---

# Session 3 — Log of Fixes, Additions & Modifications

This session focused on making the dashboard behave like a “real product”: reliable data flows (especially coach→event apply), clearer organizer vs coach meaning, clickable + consistent UI patterns, and navigation that behaves predictably.

Below is a detailed, chronological and technical log of what changed, why it was needed, and how it was implemented.

## 0) Goal / UX direction for Session 3

**Primary UX goals**
- Reduce “dead UI”: metric cards should be actionable and take you to the relevant filtered view.
- Remove redundant page headers / duplicated blocks (the “top 3 texts” issue).
- Keep organizer and coach UI consistent in density and component sizing.
- Fix coach application flow (coach applies to event) and make approvals/coach names display correctly.
- Fix back navigation: back should go one step back (history), not jump to a fixed list page.

**Data/logic goals**
- Prevent hard failures when creating rows that depend on `public.profiles`.
- Make coach identity display stable even when `profiles.full_name` is empty.
- Make “Approved coaches” (applications) clearly distinct from “Approved entries” (entries status).

---

## 1) Next.js build/runtime issue: `useSearchParams()` must be wrapped in Suspense (404 prerender)

**Symptom**
- Production build complained about `useSearchParams()` needing a Suspense boundary for `/_not-found` / `/404` prerender.

**Root cause**
- Some global client/provider code referenced `useSearchParams()` (directly or indirectly).
- Next.js requires Suspense boundaries around certain hooks during pre-rendering paths.

**Fix**
- Wrapped the app provider tree with `<Suspense>` in `src/app/layout.tsx`.

**Why this works**
- It satisfies Next’s requirement for suspenseful rendering paths without forcing every page to add its own boundary.

---

## 2) Coach “Apply to event” failing (POST 500 + “Error applying to event”)

**Symptom**
- Coaches clicking “Apply” saw 500 errors and an alert failure.
- The server-side action inserting into `event_applications` failed.

**Root cause**
- `event_applications.coach_id` references `public.profiles(id)`.
- For many users, there was no row in `public.profiles` yet (auth exists in `auth.users`, but the app identity exists in `public.profiles`).
- Without a profile row, inserts fail (FK) and/or RLS blocks follow-up queries.

**Fix (server action hardening)**
- Updated `src/app/dashboard/events-browser/actions/index.ts` to:
  1) Fetch the current user.
  2) Ensure a `profiles` row exists for `user.id` (create it if missing).
  3) Use an idempotent “already applied?” check via `.maybeSingle()`.
  4) Handle unique constraint races (`23505`) as “Already applied”.
  5) On profile creation, best-effort populate `profiles.full_name` from user metadata or email prefix.

**Fix (client refresh + UX)**
- Updated `src/components/events/apply-button.tsx` to:
  - call the server action
  - surface the returned message clearly
  - call `router.refresh()` to update the UI after apply succeeds

**Why this is correct**
- It prevents a hard dependency on “profiles must be pre-provisioned.”
- It makes the apply action safe under concurrency (two fast clicks / double submissions).
- It improves display data quality (names) without requiring an immediate DB trigger.

---

## 3) Organizer approvals: coach name not appearing

**Symptom**
- Organizer approvals list showed blank coach names.

**Root cause**
- `profiles.full_name` was empty for some coaches.
- Some UI assumed full_name always existed.

**Fix**
- Approvals UI now falls back in this order:
  1) `profiles.full_name`
  2) `profiles.email`
  3) email prefix
  4) `—`

**Where**
- Organizer approvals pages (global and per-event):
  - `src/app/dashboard/approvals/page.tsx`
  - `src/app/dashboard/events/[id]/approvals/page.tsx`

**Why**
- A display name should never be “missing”; fallback prevents confusing empty UI.

---

## 4) “Approved entries” confusion vs “Approved coaches”

**Symptom**
- User expected approved coaches to show in “Approved entries” or vice versa.

**Root cause (domain mismatch)**
- “Approved entries” refers to `entries.status = 'approved'`.
- “Approved coaches” refers to `event_applications.status = 'approved'`.
- These are different tables and workflows.

**Fix / Clarification added in UI**
- Event overview now shows an explicit “Approved Coaches” metric.
- Approvals pages emphasize that they are *coach approvals*, not entries approvals.

**Why**
- Prevents product confusion and makes metrics map directly to their table/state.

---

## 5) Deep-linking: dashboard metric cards behave like buttons

**Symptom**
- Dashboard stats looked clickable but didn’t navigate.
- User wanted “cards as buttons” to go to relevant pages.

**Fix**
- Updated dashboards to make metric cards link to appropriate routes and filtered views.
- Organizer event overview metrics link into the correct per-event entries/approvals pages with query params.

**Where**
- Organizer dashboard: `src/app/dashboard/page.tsx`
- Event overview: `src/app/dashboard/events/[id]/page.tsx`
- Coach dashboard: `src/components/coach/coach-overview.tsx` and `src/components/coach/coach-dashboard.tsx`

**Why**
- Metrics become navigation primitives: “see the number → click to see the list.”

---

## 6) Organizer per-event Entries/Approvals pages: redundant top blocks + inconsistent sizing

**Symptom**
- Entries/Approvals pages had separate header blocks, making one page feel “big” and the other “small.”

**Fix**
- Merged title/count/actions/filters into the Card header for both pages.
- Removed redundant top text blocks.

**Where**
- `src/app/dashboard/events/[id]/entries/page.tsx`
- `src/app/dashboard/events/[id]/approvals/page.tsx`

**Why**
- One consistent page pattern improves perceived quality and reduces vertical clutter.

---

## 7) Organizer event overview: show Approved Coaches list

**Symptom**
- Under “Approved Coaches” the metric existed, but user wanted names visible.

**Fix**
- Event overview now queries approved `event_applications` joined to `profiles` and renders a compact “Approved coaches” panel.

**Where**
- `src/app/dashboard/events/[id]/page.tsx`

**Why**
- A list is more useful than a count; names enable verification and reduce admin friction.

---

## 8) Coach event UI: removed tabs; merged overview/entries/register into one page

**Symptom**
- Tabs (“Overview / Entries / Register Athletes”) felt heavy and forced extra clicks.

**Fix**
- Refactored coach event view into a single-page layout:
  - Overview metrics always visible
  - Entries list always visible
  - Quick filter buttons (All/Drafts/Submitted/Approved)
  - “Register athletes” moved into a Dialog modal (faster flow)

**Where**
- `src/components/coach/coach-dashboard.tsx`
- `src/components/coach/coach-overview.tsx`
- `src/components/coach/coach-entries-list.tsx`

**Why**
- Fewer navigation affordances = fewer ways for users to get lost.
- Modal register flow keeps context (event) while completing the task.

---

## 9) Events list: make the entire event card clickable (not only “Manage”)

**Symptom**
- On organizer events list, only the “Manage” button navigated.

**Fix**
- Made the entire card clickable using a full-card overlay link.
- Kept “Manage” button above the overlay via z-index so it still works.

**Where**
- `src/app/dashboard/events/page.tsx`

**Why**
- More forgiving click target, faster navigation, and matches modern dashboard UX.

---

## 10) Back button behavior: must go one step back (history) everywhere

**Symptom**
- Back arrow on organizer event pages jumped directly to `/dashboard/events` instead of going back one step (e.g., Approved Coaches → Event dashboard).

**Root cause**
- Back controls were implemented as normal links to fixed routes, not history navigation.

**Fix (reusable component)**
- Added a reusable client component that uses `router.back()` with a fallback when there’s no history (opened in a new tab):
  - `src/components/app/history-back.tsx`

**Fix (made it consistent everywhere)**
- Added a single global back button to the dashboard shell so it appears on every dashboard page (organizer + coach).
- Removed page-specific back controls that could conflict or jump to fixed routes.
- Also updated login to use a one-step back with fallback to home.

**Where**
- Global dashboard back: `src/app/dashboard/layout.tsx`
- Removed per-event back (duplicate): `src/app/dashboard/events/[id]/layout.tsx`
- Removed coach local back (duplicate): `src/components/coach/coach-dashboard.tsx`
- Login back uses history: `src/app/login/page.tsx`

**Why**
- This matches user expectation for a “Back” affordance.
- It prevents accidental jumps to list pages when the user wanted to go back one screen.

---

## 11) Notes / Known state

- `npm run build` succeeds.
- If `npm run dev` still exits with code 1, the next step is to capture the full terminal output (stack trace / error message) so we can address the root cause. Build passing usually means the issue is dev-only (often environment, runtime fetch, or a route that only executes in dev).

---

# Session 4 — Dashboard UX / Navigation Parity (Desktop + Mobile) & Light-Mode Separation

This session focused on reducing dashboard clutter, making coach “event browsing” feel first-class, ensuring mobile navigation parity with the desktop sidebar, and making light mode visually readable (clear separation without harsh borders).

## 0) Goal / UX direction for Session 4

**Primary UX goals**
- Remove redundant navigation items and make the dashboard home more useful.
- Ensure mobile has a real “side panel” experience.
- Keep the back navigation available everywhere, but without consuming valuable content/header space.
- Improve light-mode depth/separation consistently across dashboard pages.

---

## 1) Coach event browsing: move “Browse Events” into dashboard home

**Symptom**
- “Browse Events” existed as a separate dashboard section/page/link, but the user wanted it inside the dashboard home.

**Fix**
- Added a “Browse Events” section to the coach dashboard home rendering public events.
- Removed the separate “Browse Events” nav entry so users don’t have two places for the same thing.

**Where**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/layout.tsx`

**Why**
- Home becomes the default “start here” surface for coaches.
- Fewer duplicate navigation targets reduces confusion.

---

## 2) Coach application UI: Approved/Pending/Rejected still showed “Request to Participate”

**Symptom**
- Even when an application was already approved, the UI still showed the action as if it wasn’t applied.

**Root cause**
- The caller was not providing the application `status` into the `ApplyButton`, so it rendered its default “apply” state.

**Fix**
- Build an `event_id -> status` map from `event_applications` and pass `status={status}` into `ApplyButton`.

**Where**
- `src/app/dashboard/page.tsx`

**Why**
- `ApplyButton` already supports status-driven rendering; the issue was the wrong prop/inputs at the call site.

---

## 3) Back button “takes too much space”: reduce clutter by moving it into the sidebar

**Symptom**
- The back button was taking too much vertical/header space and competing with page content.

**Fix**
- Kept the global history back behavior, but relocated the back control into the dashboard sidebar (desktop).
- Used a small gating/wrapper component so it renders consistently from the dashboard shell.

**Where**
- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/dashboard-back-gate.tsx`
- `src/components/app/history-back.tsx`

**Why**
- The back action stays available “at any cost,” but does not inflate each page layout.

---

## 4) Settings removed from both organizer + coach navigation

**Symptom**
- Dashboard nav included Settings, but it wasn’t needed.

**Fix**
- Removed Settings UI from the dashboard sidebar/nav.

**Where**
- `src/app/dashboard/layout.tsx`

**Why**
- Reduces noise and keeps nav focused on core tasks.

---

## 5) Mobile dashboard had no side panel: add hamburger + slide-out nav (Sheet)

**Symptom**
- On mobile there was no functional equivalent to the desktop sidebar.

**Fix**
- Added a mobile top bar with a hamburger trigger.
- Implemented a slide-out left “Sheet” drawer and rendered the dashboard navigation inside it.

**Where**
- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/mobile-nav.tsx`

---

# Session 10 — Hero/Auth Redesign + Dashboard UI Normalization + Branding Cleanup

This session focused on aligning the product UI with the redesign references while keeping existing product behavior and data flows intact.

## 1) Landing page redesign mismatch (hero looked disconnected from actual product)

**Symptom**
- Landing page visuals did not match the redesign reference.
- Hero mock content did not reflect real coach/organizer workflows.
- CTA wording needed `Login / Signup` instead of old sign-in wording.

**Root cause**
- Existing landing page used a prior visual pattern and generic hero previews.
- Branding mark used placeholder text blocks (`ED`) instead of the actual favicon asset.

**Fix**
- Reworked landing navbar + hero content and CTA language.
- Added a dedicated coach/organizer preview section that mirrors actual dashboard concepts.
- Updated branding mark in landing header to use the favicon image (`/favicon.ico`) instead of text-based placeholder.

**Where**
- `src/app/page.tsx`
- `src/components/app/landing-ui-preview.tsx`

## 2) Login/Register UI needed to match hero language + clear auth feedback

**Symptom**
- Login/Register screen looked stylistically detached from the updated landing page.
- Auth failures were generic and not user-friendly.

**Root cause**
- Login page and auth action redirects used broad error strings without stable message codes.

**Fix**
- Redesigned `login` + `register` tabs to match the same visual language as the hero.
- Added structured auth status codes in server actions.
- Added explicit inline messages for:
  - invalid credentials,
  - generic login failure,
  - signup failure,
  - Google auth launch failure,
  - post-signup “check email” success guidance.
- Replaced login header placeholder mark with favicon image (`/favicon.ico`).

**Where**
- `src/app/login/page.tsx`
- `src/app/login/actions.ts`

## 3) Dashboard pages felt visually inconsistent (harsh borders / uneven surfaces)

**Symptom**
- Cards, tables, and list containers across dashboard pages had inconsistent border/overlay intensity.
- Interaction feedback varied by page and felt fragmented.

**Root cause**
- Several pages used page-local style combinations instead of shared dashboard surface/list primitives.

**Fix**
- Added shared dashboard component-layer classes for:
  - shell-level surface containers,
  - list separators,
  - empty states,
  - subtle active/press interactions.
- Applied those shared styles across core dashboard pages.

**Where**
- `src/app/globals.css`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/entries/page.tsx`
- `src/app/dashboard/approvals/page.tsx`
- `src/app/dashboard/students/page.tsx`
- `src/app/dashboard/dojos/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/events/[id]/entries/page.tsx`

## 4) List pages needed strict server-side pagination (50 rows/page)

**Symptom**
- Large datasets could over-render in list screens.
- UX required strict page windows (e.g., 1–50, 51–100).

**Root cause**
- Some pages were still fully loading records or mixing server and client pagination patterns.

**Fix**
- Added uniform server-side pagination with page query param and `.range(...)` limits (`50`).
- Updated shared pagination component to show row ranges (`start-end of total`).
- Removed conflicting client-side row pagination from students table so server pagination remains authoritative.

**Where**
- `src/components/ui/pagination-controls.tsx`
- `src/components/students/student-data-table.tsx`
- `src/app/dashboard/students/page.tsx`
- `src/app/dashboard/dojos/page.tsx`
- `src/app/dashboard/entries/page.tsx`
- `src/app/dashboard/approvals/page.tsx`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/events/[id]/entries/page.tsx`

## 5) Organizer home dashboard required actionable active-event visibility

**Symptom**
- Organizer home lacked a direct “your active events” section with full-row navigation.

**Fix**
- Added organizer-only `Your Active Events` block on dashboard home.
- Queried organizer events with active date condition (`end_date >= today`).
- Made each list row fully clickable to the event detail route.

**Where**
- `src/app/dashboard/page.tsx`

## 6) Organizer quick-actions sizing mismatch (needed identical compact cards)

**Symptom**
- Quick action tiles looked oversized/uneven.

**Fix**
- Reduced quick-actions section spacing and tile paddings.
- Locked both quick-action cards to the exact same compact dimensions and icon sizing.

**Where**
- `src/app/dashboard/page.tsx`

## 7) Branding mark cleanup: replace placeholder logos with favicon image

**Symptom**
- UI still showed placeholder logo marks (`ED` blocks / icon substitutes) in multiple headers.

**Fix**
- Replaced placeholder logo marks with the favicon image (`/favicon.ico`) in primary brand touchpoints.
- Removed now-unneeded decorative icon imports used only for placeholder brand marks.

**Where**
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/mobile-nav.tsx`

## Verification notes

- Checked updated files for TypeScript/compile diagnostics after critical patches.
- Confirmed no remaining `ED` or `Prize` placeholder branding strings in `src/**` UI code.

---

# Session 9 — Bulk Student Import UX + Data Normalization

This session fixes a handful of issues discovered while using the dashboard in real workflows: the nav drawer sizing, dojo save failures, DOB import edge cases from Excel, and quality-of-life tools in the bulk student import review screen.

## 1) Dashboard drawer showed oddly on mobile/desktop

**Symptom**
- The slide-out dashboard nav (Sheet) could look clipped or oddly sized depending on viewport/breakpoint.

**Fix**
- Refactored the mobile nav sheet layout to be a stable full-height column layout.
- Adjusted the shared Sheet variants so left/right drawers use full width/height on small screens.

**Where**
- `src/components/dashboard/mobile-nav.tsx`
- `src/components/ui/sheet.tsx`

## 2) Dojo create/update failed with a generic “Failed to save dojo”

**Symptom**
- Dojo creation/update would fail and the UI only showed a generic error.

**Root cause**
- Some workflows hit RLS/foreign key dependencies that require a `public.profiles` row for the logged-in user.

**Fix**
- Ensure a profile row exists (best-effort create on demand) before role checks / downstream inserts.
- Bubble up the underlying Supabase error messages so the UI shows the real cause.

**Where**
- `src/lib/auth/require-role.ts`
- `src/app/dashboard/dojos/actions.ts`
- `src/components/dojos/dojo-dialog.tsx`

## 3) DOB kept showing as a number (e.g. 39291)

**Symptom**
- Date of Birth imported from Excel sometimes appeared as a number in the UI.

**Root cause**
- Excel often stores dates as a serial number; XLSX parsing can surface the raw numeric value.

**Fix**
- Added DOB normalization that converts Excel serials (and a few common text formats) into ISO `YYYY-MM-DD`.
- Applied normalization at ingestion (bulk upload parse), at save (server actions), and at display (tables/forms/age calc).

**Where**
- `src/lib/date.ts`
- `src/components/students/student-bulk-upload.tsx`
- `src/app/dashboard/students/actions/index.ts`
- `src/components/students/student-dialog.tsx`
- `src/components/students/student-data-table.tsx`
- `src/components/entries/entry-row.tsx`

## 4) Bulk upload review needed “quick functions” (delete rows)

**Request**
- Add a checkbox at the end for quick actions like delete.

**Fix**
- Added a rightmost checkbox column (row selection + select-all).
- Added a minimal bulk action: **Delete selected** (removes selected rows from the import list).

**Where**
- `src/components/students/student-bulk-upload.tsx`
- `src/components/ui/sheet.tsx`

**Why**
- Mobile users get the same navigation affordances as desktop, without compressing the UI into an always-visible sidebar.

---

## 6) Build error: “Parsing ecmascript source code failed” (malformed JSX)

**Symptom**
- Next.js dev/build failed with: `Parsing ecmascript source code failed`.

**Root cause**
- Malformed JSX (missing closing tags / incorrect nesting) introduced during iterative UI changes.

**Fix**
- Corrected JSX structure (balanced tags, fixed nesting) in the affected components/pages.

**Where**
- `src/app/dashboard/page.tsx`
- `src/app/login/page.tsx`
- `src/components/dashboard/mobile-nav.tsx`
- `src/components/dashboard/dashboard-back-gate.tsx`

**Why**
- These failures are parse-time errors; the only real fix is restoring valid JSX.

---

## 7) Light mode lacked separation/depth: apply consistent borders + shadows across dashboard

**Symptom**
- Dark mode looked fine, but in light mode cards and containers blended together.

**Root cause**
- Some components relied on theme tokens that were too subtle in light mode.

**Fix**
- Switched key dashboard wrappers/cards to explicit light/dark border utilities (e.g. `border-black/10` + `dark:border-white/10`).
- Added soft gradients + shadows to make card boundaries readable in light mode.

**Where**
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/students/page.tsx`
- `src/app/dashboard/approvals/page.tsx`
- `src/app/dashboard/entries/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/dojos/page.tsx`

**Why**
- Improves readability and perceived quality without adding heavy/harsh borders.

---

# Session 5 — Global Loading Overlay “Everywhere”

This session focused specifically on ensuring the app shows an immediate loading overlay whenever a click results in navigation, including cases that were previously missed (non-sidebar links and programmatic `router.push/replace/back`).

## 0) Goal / UX direction for Session 5

**Primary UX goals**
- If a click causes a route change and the next screen is slow, show a loader instantly.
- Do not rely on every individual button/link remembering to manually trigger a loader.
- Avoid duplicate/stacked loaders (one from dashboard, one global).

---

## 1) Some links still felt “dead”: loader wasn’t guaranteed outside the dashboard sidebar

**Symptom**
- Many buttons/links across the app could navigate, but the loader didn’t always appear immediately.
- The delay felt like the click “didn’t register” for ~2–3 seconds.

**Root cause**
- Loader triggering was not guaranteed globally for all link clicks (it depended on specific components calling `beginNavigation`).

**Fix**
- Added a global click-capture handler inside the app navigation provider that:
  - detects same-origin `<a href>` clicks
  - ignores modified clicks (new tab, ctrl/cmd click), downloads, hash links, external links
  - starts the loader immediately before navigation begins
  - does nothing for same-route clicks
- Added an escape hatch: `data-no-global-loader` on links to opt out.

**Where**
- `src/components/app/navigation-provider.tsx`

**Why**
- This provides a single “at any cost” guarantee for link-driven navigation without needing to touch every page/component.

---

## 2) Non-Link buttons (router.push/replace) didn’t show a loader

**Symptom**
- Filters/pagination/select controls that use `router.push()` / `router.replace()` could still feel slow with no immediate feedback.

**Root cause**
- These navigations are not `<a>` clicks, so the global link-capture handler won’t fire.

**Fix**
- Updated key components that do programmatic navigation to call `beginNavigation()` right before route changes.

**Where**
- `src/components/ui/pagination-controls.tsx`
- `src/components/events/entry-filters.tsx`
- `src/components/entries/event-filter.tsx`
- `src/components/app/history-back.tsx`

**Why**
- Ensures route transitions initiated by controls (not links) still show the same immediate loading feedback.

---

## 3) Avoid duplicate overlays: dashboard-specific loader vs app-wide loader

**Symptom**
- With both a dashboard navigation provider and an app navigation provider, it’s easy to end up with two loaders competing or inconsistent behavior.

**Fix**
- Standardized on the app-wide navigation provider for loader behavior.
- Dashboard navigation links were aligned to use the same global provider.

**Where**
- `src/app/layout.tsx` (App-wide provider host)
- `src/app/dashboard/layout.tsx` (removed the dashboard-only loader wrapper)
- `src/components/dashboard/nav-link.tsx`

**Why**
- One source of truth for “loader while navigating” keeps UX consistent and avoids stacked overlays.

---

## Notes / Limitations

- This guarantees loaders for route changes (navigation).
- For slow server actions that do **not** change the URL (e.g. submit → `router.refresh()` on the same route), the correct pattern is still:
  - `PendingButton` / `useFormStatus` for form submissions
  - `NavigationOnPending` to trigger the global overlay during pending server actions

---

# Session 6 — Role-Based Access Control (RBAC) Hardening

This session focuses on fixing “coach sees organizer UI” access leaks and tightening data-layer enforcement so UI and DB permissions match.

## 1) Coach users could access organizer pages and actions

**Symptom**
- Coach accounts could open organizer routes (events, approvals, organizer event entries).
- Coach UI sometimes showed “Organiser” label, causing confusion.

**Root cause**
- Pages and server actions relied on auth presence, not role checks.
- The dashboard layout hardcoded the sidebar label.

**Fix**
- Added a centralized role guard helper (`requireRole`) used by server components and server actions.
- Enforced role checks on organizer-only pages/actions and coach-only pages/actions.
- Updated the sidebar role label to reflect the actual profile role.

**Why this is correct**
- Role gating in the server layer prevents accidental access regardless of client UI state.
- A single guard avoids duplicated role logic across routes.

## 2) RLS policies allowed cross-role access and role escalation

**Symptom**
- Users could potentially interact with tables based on `auth.uid()` only, without role verification.
- `profiles` updates could be abused to change roles if not constrained.

**Root cause**
- Several policies used only ownership checks without role constraints.
- `profiles` update policy did not lock down role changes.

**Fix**
- Added role checks to dojos, students, entries, event_applications, categories, event_days, and events policies.
- Locked `profiles` inserts to `role = 'coach'` and prevented self-role changes on updates.
- Hardened `organizer_entries_view` to require organizer/admin roles.

**Why this is correct**
- It blocks privilege escalation and ensures the DB enforces the same rules as the UI.
- The organizer view now mirrors organizer-only access expectations.

## 3) Update-only Supabase migration workflow

**Symptom**
- Re-running the full schema migration caused “already exists” errors.

**Root cause**
- The initial schema file is not idempotent; it cannot be re-run on an existing DB.

**Fix**
- Added an update-only migration (`supabase/migrations/migration.sql`) that drops/recreates policies and replaces the view.

**Why this is correct**
- Incremental migrations avoid destructive schema resets and are safe to re-run on existing databases.

**Where**
- `src/lib/auth/require-role.ts`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/approvals/page.tsx`
- `src/app/dashboard/events/[id]/layout.tsx`
- `src/app/dashboard/events/[id]/approvals/page.tsx`
- `src/app/dashboard/events/[id]/categories/page.tsx`
- `src/app/dashboard/events/[id]/entries/page.tsx`
- `src/app/dashboard/events/actions/index.ts`
- `src/app/dashboard/approvals/actions/index.ts`
- `src/app/dashboard/events/[id]/categories/actions/index.ts`
- `src/app/dashboard/events/[id]/entries/actions.ts`
- `src/app/dashboard/dojos/page.tsx`
- `src/app/dashboard/students/page.tsx`
- `src/app/dashboard/entries/page.tsx`
- `src/app/dashboard/entries/[eventId]/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`
- `src/app/dashboard/entries/actions/index.ts`
- `src/app/dashboard/dojos/actions.ts`
- `src/app/dashboard/students/actions/index.ts`
- `src/app/dashboard/events-browser/actions/index.ts`
- `supabase/migrations/migration.sql`

---

# Session 7 — Dashboard Loader Unification (Single Loader)

This session focuses on fixing the “two different loading pages” that showed up when switching between dashboard pages in production.

## 1) Dashboard navigation showed two different loaders (prod only / much more visible in prod)

**Symptom**
- When switching between dashboard pages, the user would see the global overlay loader ("Changing stances...") and then a second full-page loader like "Loading dojos..." / "Loading students...".
- This was much more noticeable in production because navigation/data fetching takes longer, so suspense fallbacks render long enough to see.

**Root cause**
- Two loader systems were active inside `/dashboard`:
  - A client-side overlay loader ("Changing stances...") triggered on dashboard navigation.
  - Multiple route-level `loading.tsx` files under `src/app/dashboard/**/loading.tsx` that render page-specific loaders (different titles).
- When a dashboard route suspended during navigation, Next.js rendered the route-level `loading.tsx`, producing a second loader screen with different text.

**Fix**
- Standardized dashboard UX to a single loader during navigation:
  - Use a single route-level loader: `src/app/dashboard/loading.tsx` (one design).
  - Remove/disable dashboard overlay loader triggers so "Changing stances..." does not appear inside `/dashboard`.
  - Removed nested dashboard `loading.tsx` files so the dashboard-level loader is the only suspense fallback.

**Why this is correct**
- It guarantees one consistent loader design during dashboard-to-dashboard transitions.
- It avoids both problems at once:
  - double loaders (overlay + route fallback)
  - blank gaps (overlay hides before server data finishes)
- It keeps login/landing/non-dashboard behavior unchanged.

**Where**
- `src/app/dashboard/loading.tsx`
- `src/components/dashboard/nav-link.tsx`
- `src/components/app/navigation-provider.tsx`
- Deleted nested loaders under `src/app/dashboard/**/loading.tsx` (kept only the dashboard-level loader)

---

# Session 8 — Past Events + Coach Events Page

This session adds automatic “Past Events” grouping once an event date has passed, and refactors the coach dashboard so Home stays focused while a dedicated Events page shows all categories.

## 1) Organizer events needed a “Past Events” section

**Request / Symptom**
- Once an event is done (past the event date), it should be moved under a separate **Past Events** section on the organizer Events page.

**Root cause**
- Organizer events were rendered as a single list ordered by `start_date`, with no grouping logic.

**Fix**
- On `/dashboard/events`, split the organizer’s events into:
  - **Active Events**: `end_date >= today`
  - **Past Events**: `end_date < today`
- Render both sections on the page.

**Why this is correct**
- `events.end_date` is the canonical “event finished” boundary for multi-day events.
- Using an ISO date string (`YYYY-MM-DD`) keeps comparison stable for Postgres `date` values.

**Where**
- `src/app/dashboard/events/page.tsx`

## 2) Coach dashboard needed Home to show only Active + Approved

**Request / Symptom**
- Coach Home should show **Active Events** and **Approved Events**.
- Past events should not clutter Home.

**Root cause**
- Coach Home was effectively acting as a full event browser list.

**Fix**
- Coach Home (`/dashboard`) now shows:
  - **Approved Events** (approved applications) where `end_date >= today`
  - **Active Events** (public events) where `end_date >= today` and not already approved
- Removed past events from the Home lists.

**Where**
- `src/app/dashboard/page.tsx`

## 3) Coach needed a dedicated Events page with Active/Approved/Past sections

**Request / Symptom**
- Create a separate “Events” page under dashboard (similar to Dojos/Students pages).
- That page should show **Active**, **Approved**, and **Past** events in separate sections.

**Fix**
- Reworked `/dashboard/events-browser` into the coach Events page with three sections:
  - **Approved Events** (approved + upcoming)
  - **Active Events** (upcoming, not approved)
  - **Past Events** (end date passed)

**Where**
- `src/app/dashboard/events-browser/page.tsx`

## 4) Navigation updates for coach Events

**Fix**
- Added an **Events** link for coaches to the dashboard navigation (desktop + mobile) pointing to `/dashboard/events-browser`.

**Where**
- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/mobile-nav.tsx`

---

# Session 10 — UI Surface Polish + Demographics Visualization (Today)

This session focused on visual quality and consistency across organizer and coach event flows. The goal was to remove harsh/contrasty outlines, align hover/surface treatment with the Home cards, and improve readability of demographic metrics.

## 1) Harsh borders on cards/tables looked noisy

**Symptom**
- Card and table surfaces had high-contrast white-ish borders that felt sharp and distracting.
- Across pages, border weight/contrast was inconsistent.

**Root cause**
- Mixed border/shadow treatments accumulated across components over multiple iterations.
- Some list/table wrappers used stronger contrast than card surfaces.

**Fix**
- Softened border contrast and normalized container styling to subtle separators.
- Preserved borders (did not remove them entirely), but matched the softer Home-card treatment.

**Why this is correct**
- Maintains structure and separation while reducing visual noise.
- Keeps readability and hierarchy without “hard-line” artifacts.

## 2) Hover/surface behavior was inconsistent vs Home cards

**Symptom**
- Home cards had the preferred “smooth” hover/surface behavior, but coach/organizer event surfaces did not match.

**Fix**
- Applied Home card-style hover and surface treatment to:
  - coach event → My Entries card/list areas
  - organizer events list + manage-event related surfaces
  - student list/table blocks that were still using harsher styling

**Why this is correct**
- Users get one predictable visual language across dashboard modules.
- Reduces context switching cost and makes screens feel part of one system.

## 3) Organizer demographics block needed clearer information density

**Request / Symptom**
- Show Female first.
- Color F pink and M blue.
- Add bars that represent each gender’s entries as a proportion of total entries.

**Fix**
- Reordered demographic display to Female first, Male second.
- Applied pink styling for female and blue styling for male values.
- Added proportional bars using:
  - Female bar width = $\frac{femaleCount}{totalEntries} \times 100$
  - Male bar width = $\frac{maleCount}{totalEntries} \times 100$

**Why this is correct**
- Preserves exact counts while adding immediate visual ratio comprehension.
- Color + order + bars together improve scanability for organizers.

**Where (major touched areas)**
- `src/components/coach/coach-entries-list.tsx`
- `src/components/coach/coach-overview.tsx`
- `src/components/coach/coach-student-register.tsx`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/events/[id]/page.tsx`
- `src/app/globals.css`

---

# Session 11 — Duplicate Event Prevention (Frontend + Backend + Migration)

This session addresses accidental double-creation when users tap/click “Create Event” twice quickly. The fix is intentionally layered so each tier protects the next one.

## Problem statement

**Symptom**
- A rapid double tap on “Create Event” created two event rows.

**Why this can happen**
- UI can dispatch two submits before disabled/loading state is fully observed.
- Even with frontend guard, concurrent requests can still race at backend/database level.

## Architecture of the fix (defense in depth)

1) **Frontend guard**: prevent duplicate submit from the same dialog interaction.
2) **Backend guard**: detect recent same-payload create attempts and reuse existing event.
3) **Database guard**: unique index guarantees duplicates cannot persist under race conditions.

This three-layer model ensures reliability even when one layer is bypassed.

## 1) Frontend: immediate submit lock on Create Event dialog

**What changed**
- In the create dialog submit handler, an in-memory lock (`useRef`) is checked before processing.
- If already submitting, handler exits early.
- Lock is set before awaiting server action and always released in `finally`.
- Submit button remains disabled while `isSubmitting` is true.

**Why**
- Prevents accidental double-click/double-tap from issuing multiple create actions.
- `useRef` lock is synchronous and protects the tiny timing window around state updates.

**Where**
- `src/components/events/create-event-dialog.tsx`

## 2) Backend: dedupe check before insert + race-safe fallback

**What changed**
- Before insert, server action checks for a very recent existing event (same organizer + key fields) and returns that event if found.
- On insert error, if Postgres returns unique violation (`23505`), server fetches matching existing event and returns success with existing ID.

**Key match fields used for dedupe**
- `organizer_id`
- `title` (trimmed in action)
- `event_type`
- `start_date`
- `end_date`
- `location` (trimmed, null-safe handling)

**Why**
- Eliminates duplicate creation from near-simultaneous requests.
- Prevents user-facing failure in race scenarios by converting race collisions into idempotent success.

**Where**
- `src/app/dashboard/events/actions/index.ts`

## 3) Database migration: hard uniqueness guarantee

**What changed**
- Added unique index migration to enforce one logical event per organizer+payload.

**Migration file**
- `supabase/migrations/20260214_prevent_duplicate_events.sql`

**SQL used**
```sql
-- Prevent accidental duplicate event creation for the same organizer.
-- Treats case and NULL/empty location consistently.
CREATE UNIQUE INDEX IF NOT EXISTS events_dedupe_unique_idx ON events (
    organizer_id,
    lower(title),
    event_type,
    start_date,
    end_date,
    lower(coalesce(location, ''))
);
```

**Why this shape**
- `lower(title)` avoids duplicates differing only by text case.
- `lower(coalesce(location, ''))` treats `NULL` and empty location consistently.
- `IF NOT EXISTS` makes migration re-runnable safely.

## 4) How to apply this migration to an existing Supabase project

This repository’s standard setup flow uses Supabase SQL Editor.

### Step A — Pre-check duplicates (recommended)

```sql
select organizer_id, lower(title), event_type, start_date, end_date, lower(coalesce(location,'')), count(*)
from events
group by 1,2,3,4,5,6
having count(*) > 1;
```

If no rows return, proceed to Step B.

### Step B — Run migration SQL

Run contents of `supabase/migrations/20260214_prevent_duplicate_events.sql` in Supabase SQL Editor.

### Step C — Verify index exists

```sql
select indexname
from pg_indexes
where tablename = 'events'
  and indexname = 'events_dedupe_unique_idx';
```

### Step D — If Step B fails due to existing duplicates

Clean duplicates (keep newest per logical event), then rerun Step B:

```sql
delete from events e
using (
  select id from (
    select id, row_number() over (
      partition by organizer_id, lower(title), event_type, start_date, end_date, lower(coalesce(location,''))
      order by created_at desc, id desc
    ) as rn
    from events
  ) t where rn > 1
) d
where e.id = d.id;
```

## 5) Net result

- Double-tap on Create Event no longer creates duplicate rows.
- Concurrency races are handled gracefully.

---

# Session 12 — Safer Event Deletion (Accidental Delete Protection)

This session improves organizer safety around event deletion. The previous flow used a single click + browser confirm, which was easy to trigger unintentionally.

## Problem statement

**Symptom**
- Organizers could accidentally delete an event from a simple destructive button flow.

**Risk**
- Event deletion is high-impact and hard to recover from.
- A single lightweight confirmation (`window.confirm`) is not strong enough protection for destructive actions.

## New deletion pattern (multi-step confirmation)

The delete flow is now intentionally friction-based:

1) Open **3-dot actions menu**.
2) Choose **Delete event**.
3) See destructive warning dialog.
4) Type `delete` in an input field.
5) Final **Delete permanently** button enables only when typed text matches.

This combines intent confirmation + explicit user action before submitting the server action.

## What changed

### 1) Replaced inline delete button with actions menu
- Added a compact 3-dot trigger using existing dropdown primitives.
- Moved delete into a contextual menu item (`Delete event`).

### 2) Replaced `window.confirm` with custom destructive dialog
- Added a dedicated modal with stronger warning copy.
- Shows that deletion is irreversible and may remove related event data.

### 3) Added typed keyword confirmation gate
- User must type `delete` (case-insensitive) to unlock final submit.
- Prevents reflexive confirmation clicks.

### 4) Added event title context inside dialog
- The modal displays the current event title to reduce “wrong record” deletion mistakes.

## Why this is better than the old approach

- **Higher intent assurance:** requires explicit typed input, not just quick click-through.
- **Lower accidental activation:** delete action is no longer a primary visible button.
- **Context-aware safety:** event title in modal helps users verify they are deleting the intended event.
- **No backend contract change needed:** still uses existing server action (`deleteEvent`) with stronger frontend guardrails.

## Where

- `src/components/events/delete-event-form.tsx`
  - Reworked to use dropdown menu + dialog + typed confirmation gate.
- `src/app/dashboard/events/[id]/layout.tsx`
  - Passes `eventTitle` into delete component for contextual confirmation.

## Net result

- Accidental organizer deletions are significantly less likely.
- Intentional deletion remains available but now requires deliberate confirmation behavior.
- Database enforces final correctness even if client/server race paths occur.

---

# Session 13 — Public Landing + Hero/Footer + Navigation/UX Pass (Detailed)

This session focused on the public-facing experience (especially for logged-out users), anchor scrolling behavior, hero/footer polish, dashboard nav toggles, and image delivery optimization.

## 1) Public events should be visible without login

### Symptom
- On landing page, clicking **View event** forced `/login` every time.
- Users could not inspect basic public event details unless authenticated.

### Root cause
- Landing event card CTA was hard-wired to `/login?next=/events/:id`.

### Fix
- Replaced login redirect behavior with in-page event details interaction.
- Public cards always show basic event metadata (title/type/date/location/capacity).
- Description is hidden by default and shown only when explicitly requested.

### Files
- `src/app/page.tsx`
- `src/components/app/public-events-section.tsx` (new)

---

## 2) Split landing events into Upcoming/Past with 3-item preview + view-all

### Requirement
- Separate upcoming and past events.
- Show only 3 items by default in each section.
- Show “view all” only if section has more than 3.

### Fix
- Added two grouped lists:
  - **Upcoming events**
  - **Past events**
- Added section-local toggles:
  - `View all ...` / `Show less`
- Kept default preview at 3 cards per section.

### Files
- `src/components/app/public-events-section.tsx`

---

## 3) Hydration mismatch fix (date rendering)

### Symptom
- React hydration warning on landing events:
  - server/client date text mismatch (locale differences like `2/6/2026` vs `6/2/2026`).

### Root cause
- `toLocaleDateString()` inside a client-rendered path produced locale-dependent output.

### Fix
- Replaced locale-dependent formatting with deterministic formatter (`DD/MM/YYYY`).
- Passed server snapshot (`todayIso`) to client component for stable section grouping at hydration time.

### Files
- `src/components/app/public-events-section.tsx`
- `src/app/page.tsx`

---

## 4) “View event” should open popup modal (not inline slide-down)

### Requirement
- Open selected event in a big popup with blurred background.
- Keep description in popup view.

### Fix
- Replaced inline expansion with dialog modal flow:
  - selected event state
  - centered dialog
  - blurred backdrop
- Added explicit **Description** label in event modal content.

### Supporting change
- Extended shared `DialogContent` to accept `overlayClassName` for controlled overlay styling.

### Files
- `src/components/app/public-events-section.tsx`
- `src/components/ui/dialog.tsx`

---

## 5) Hash links should smooth-scroll on same page (no route-like jump)

### Symptom
- `Events` / `Browse Events` / `Features` felt like redirect/jump behavior.

### Root cause
- Hash targets + link wrappers were mixed; one button wrapped inside anchor created invalid structure.
- Smooth scroll rule was accidentally placed inside `:root` block (ineffective).

### Fix
- Switched landing hash navigation to plain anchors for in-page sections.
- Used valid `Button asChild` anchor markup.
- Moved smooth-scroll CSS to top-level `html { scroll-behavior: smooth; }`.

### Files
- `src/app/page.tsx`
- `src/app/globals.css`

---

## 6) Section targeting fixes + Contact nav

### Symptom
- `Events` sometimes landed where past list was more visible first.

### Fix
- Created explicit section target for upcoming list: `#upcoming-events`.
- Updated top-nav + CTA links to that anchor.
- Added top nav **Contact** link and anchored footer as `#contact`.
- Added scroll offsets (`scroll-mt-24`) to avoid fixed-header overlap.

### Files
- `src/app/page.tsx`
- `src/components/app/public-events-section.tsx`
- `src/components/app/landing-ui-preview.tsx`
- `src/components/app/site-footer.tsx`

---

## 7) Footer redesign pass (spacing, hierarchy, links)

### Requirement
- Footer looked cramped/bland and needed cleaner visual structure.

### Fixes applied iteratively
- Increased spacing and visual rhythm.
- Improved typography hierarchy and grouping.
- Added gradient/surface treatment and border consistency.
- Refined links and contact sections.
- Added contribution callout:
  - **Open for contribution** + GitHub link.
- Added icons:
  - GitHub icon
  - Email icons
- Added `Features` in links section.
- Later adjusted links to vertical stack and removed GitHub from links list (kept contribution callout link).

### Files
- `src/components/app/site-footer.tsx`

---

## 8) Footer image blending

### Requirement
- Use AI-generated image in footer background, blurred and blended.

### Fixes
- Copied asset into public path:
  - `public/footer bg.png`
- Added layered footer background system:
  - background image layer
  - gradient readability overlay
  - foreground content surface
- Tuned opacity/blur/position multiple times based on visual feedback to improve visibility.

### Files
- `public/footer bg.png`
- `src/components/app/site-footer.tsx`

---

## 9) “Mock Dashboard” messaging clarity in hero preview

### Requirement evolution
- Explicitly communicate preview is mock/sample data.
- Copy and placement iterated for readability.

### Finalized copy/layout
- Heading: **Mock Dashboards***
- Subtitle: **This is how it would look once you get started!!**
- Subtle note: **\*This is sample data**
- Subtitle centered under heading; sample-data note positioned to the right between heading block and view switch.

### Files
- `src/components/app/landing-ui-preview.tsx`

---

## 10) Hero image treatment from public asset

### Requirement
- Use hero image from `public` and match blended cinematic look.

### Fix
- Hero now uses full-bleed `next/image` background (`/Hero image.png`) with layered overlays and text-on-image contrast.

### Later tuning
- Reduced overlay darkness after feedback so image remains visible (not over-tinted).

### Files
- `src/app/page.tsx`

---

## 11) Header blend over hero + scroll-based opacity behavior

### Requirement
- Header should blend with hero at top.
- On scroll, header should retain stronger translucent/background-tinted behavior.

### Fix
- Introduced client landing header with scroll state:
  - at top: light blue-tinted translucent glass
  - after scroll threshold: stronger translucent background tint
- Added nav/button interaction polish (hover + active states), excluding theme switch.

### Files
- `src/components/app/landing-header.tsx` (new)
- `src/app/page.tsx`

---

## 12) Dashboard 3-bar toggle behavior (desktop + mobile)

### Requirement
- Add sidebar open/close 3-bar on desktop too.
- Verify mobile already has it.

### Findings
- Mobile already had hamburger (`MobileNav`) and was kept.
- Desktop initially got a separate top menu bar, which was rejected.

### Final fix
- Added sidebar-close hamburger inside desktop side panel itself.
- Added compact reopen hamburger in main area only when sidebar is collapsed.
- Removed separate desktop “Menu” top header row.

### Files
- `src/components/dashboard/responsive-dashboard-frame.tsx` (new)
- `src/app/dashboard/layout.tsx` (switched to responsive frame)

---

## 13) Image configuration optimization (requested as image-only pass)

### Requirement
- Apply image optimization config only (no extra UX changes).

### Fix
- Added Next.js image optimization config:
  - AVIF/WebP output formats
  - tuned `deviceSizes`
  - `imageSizes`
  - `minimumCacheTTL`
- Kept hero `sizes` explicitly responsive.

### Files
- `next.config.ts`
- `src/app/page.tsx`

---

## 14) Vercel production build error on dashboard entries page

### Symptom
- Vercel build failed during `next build` / TypeScript check with:
  - `TS2352: Conversion of type ... to type 'ApprovedEvent[]' may be a mistake...`
- Failure location:
  - `src/app/dashboard/entries/page.tsx` (around approved events mapping)

### Root cause
- Code assumed joined Supabase relation data from `event_applications.events` could be directly cast as `ApprovedEvent[]`.
- In practice, relation payload shape can be `object | object[] | null` depending on select shape/inference.
- The direct cast (`as ApprovedEvent[]`) bypassed safe narrowing and failed strict production type checks.

### Fix
- Removed unsafe direct cast.
- Added a runtime-safe normalization path:
  - flatten relation values whether single object or array
  - filter with explicit type guard `isApprovedEvent(...)`
- Result: `approvedEvents` is now constructed as truly narrowed `ApprovedEvent[]`.

### Why this is correct
- Handles real-world relation shape variance safely.
- Satisfies strict TypeScript checks without weakening types.
- Prevents runtime surprises from malformed/null relation values.

### Files
- `src/app/dashboard/entries/page.tsx`

### Verification
- VS Code diagnostics now report no errors for `src/app/dashboard/entries/page.tsx`.
- This addresses the exact Vercel compile-time blocker shown in deployment logs.

---

## Final status for this session

- Public landing now supports full event discovery without forced login.
- Event details open in modal with blur backdrop.
- Anchors scroll smoothly and land on intended sections.
- Hero/header/footer are visually blended and interaction-polished.
- Footer includes contribution/contact enhancements and blended background image.
- Dashboard desktop + mobile both provide 3-bar navigation toggles.
- Next image pipeline is configured for better mobile delivery.
- Vercel TypeScript build blocker on coach entries is resolved with safe relation normalization.

---

# Session 15 — Student Portal Integration & Landing UI Polish

This session focused on blending the hosted Student Profile Portal into EntryDesk’s public landing experience without breaking existing layout rhythm.

## 1) Integrate Testlist portal into landing flow

### Requirement
- Expose hosted student portal (`testlist.shorinkai.in`) inside EntryDesk landing experience.
- Add link in header/title bar and include clear explanatory content on page.

### Fix
- Added top-nav external link: **Student Portal**.
- Added a dedicated landing section for student-portal context + CTA.

### Files
- `src/components/app/landing-header.tsx`
- `src/app/page.tsx`
- `src/components/app/student-portal-section.tsx` (new)

---

## 2) Section content/layout refinement after visual feedback

### Symptom
- Initial integration left visible empty space and secondary CTA noise.
- “Continue in EntryDesk” CTA was unnecessary in that block.

### Root cause
- Right-side panel was too text-heavy and under-utilized visually.
- Section hierarchy did not match surrounding “showcase” style.

### Fix
- Removed “Continue in EntryDesk” button.
- Added heading + supporting line above section for better narrative flow.
- Replaced static snapshot text block with a compact **mock student profile UI** (identity card, belt badge, stats, competition history snippet).

### Files
- `src/components/app/student-portal-section.tsx`

---

## 3) Visual cleanup: too many border lines + accent overpowering content

### Symptom
- Preview looked overly outlined/“wireframe”.
- Green accent strip visually overpowered content and appeared to override avatar `A` tile.

### Root cause
- Excessive border usage on nested containers/tiles.
- Accent strip intensity + stacking made the avatar overlap feel visually incorrect.

### Fix
- Reduced border noise by switching multiple blocks to soft surfaces/rings.
- Toned accent to a muted gradient and reduced height.
- Fixed avatar overlap using explicit stacking and surface:
  - avatar tile now uses `z-10`
  - solid `bg-card` tile surface
  - adjusted top spacing (`pt-5`) and overlap depth (`-top-5`)

### Why this is correct
- Keeps brand accent while avoiding color dominance.
- Preserves readability and hierarchy in dark mode.
- Eliminates the “accent overriding avatar” visual artifact.

### Files
- `src/components/app/student-portal-section.tsx`

---

## Verification

- Diagnostics check completed for all touched files:
  - `src/app/page.tsx`
  - `src/components/app/landing-header.tsx`
  - `src/components/app/student-portal-section.tsx`
- Result: **No errors found**.


---

# Session 16 — Dashboard Mobile Nav & Responsive Frame Polish (2026-02-18)

This session focused on improving the dashboard mobile navigation experience and refining the responsive dashboard frame for better consistency and accessibility.

## 1) Mobile dashboard nav: accessibility, layout, and role clarity

**Symptom**
- Mobile nav sheet (hamburger menu) lacked clear accessibility structure and role clarity in the header.
- Brand/logo area was visually inconsistent and role label was sometimes unclear.

**Fix**
- Added `SheetTitle` for accessibility (Radix compliance) in the mobile nav sheet.
- Refined the header: EntryDesk logo uses favicon image, role label is always present and capitalized, and role logic is explicit (`Organizer` vs. role).
- Improved avatar fallback: always shows first letter of name or email.
- Polished the management section heading and badge styling for role.
- Improved layout and spacing for all header and footer elements.

**Where**
- `src/components/dashboard/mobile-nav.tsx`

**Why**
- Ensures mobile navigation is accessible, visually consistent, and clearly communicates user role.

---

## 2) Responsive dashboard frame: container and sidebar polish

**Symptom**
- Dashboard frame container used an unnecessary max-width wrapper, causing layout issues on large screens.

**Fix**
- Simplified the main dashboard frame container to remove the `mx-auto max-w-7xl` wrapper, using a full-width flex layout for better responsiveness.

**Where**
- `src/components/dashboard/responsive-dashboard-frame.tsx`

**Why**
- Ensures the dashboard layout is consistent and responsive across all screen sizes, matching the sidebar and content area behavior.

---------------------

# Session 17 — Coach Active/Approved Event Visibility & Routing Fix (2026-02-18)

This session focused on resolving coach dashboard confusion where approved upcoming events disappeared from **Active Events** and did not provide a direct action to manage entries.

## 1) Approved upcoming events missing from Active Events

**Symptom**
- Upcoming events that were already approved showed in **Approved Events** but were removed from **Active Events**.
- This made active participation flow feel broken because an event could be active by date but hidden from the active list.

**Root cause**
- Active-event filters explicitly excluded events whose application status was `approved`.

**Fix**
- Removed the exclusion filter so all upcoming events (`end_date >= today`) remain visible in **Active Events**, including approved ones.

**Where**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`

**Why this is correct**
- “Active” should represent date-based availability, not approval-state exclusion.
- Keeps UX consistent: upcoming events remain discoverable until the event end date.

---

## 2) Approved items in Active Events now route to entries

**Symptom**
- In Active lists, approved events still rendered application-style actions, which was not the correct next step for coaches.

**Fix**
- For approved status in Active Events, replaced apply-action behavior with a direct **Entries** button linking to `/dashboard/entries/{eventId}`.
- Non-approved statuses continue to use the existing apply/pending/rejected action flow.

**Where**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/events-browser/page.tsx`

**Why this is correct**
- Once approved, the coach’s primary action is entry management, not re-application.
- Reduces friction by making the next valid action one click away.

---

## 3) Event lifecycle behavior (auto-vanish after end date)

**Behavior**
- Active/upcoming sections continue to use date gating (`end_date >= today`).
- This means if an event ends in 3 days, it remains visible for those 3 days and automatically disappears after its final date.

**Why this matches intended UX**
- Aligns both **Approved** and **Active** displays with event lifecycle timing.
- Prevents stale events from lingering in active surfaces.

---

## 4) How Google OAuth Is Configured

In the code, there should be a proper redirect callback configured.

The app requests Supabase to redirect to `/auth/callback`.
The app then implements the `/auth/callback` route and exchanges the returned authorization code for a session cookie.

### ⚠️ Important Gotcha

The main **gotcha** is environment correctness.

`NEXT_PUBLIC_BASE_URL` must **exactly match** the real site origin you are using (including scheme and host).

For example:

```
https://yourdomain.com
```

Make sure:

* The protocol matches (`http` vs `https`)
* The domain matches exactly
* There are no extra trailing slashes or mismatched subdomains

---

# Session 20 — Dojo-Scoped Students + Auth Profile Name Helper (2026-02-26)

This session focused on making student management “dojo-aware” end-to-end (deep-links + filtering + preselected forms) and consolidating profile display-name logic for OAuth.

## 1) Dojo cards deep-link to Students with an active filter

**Change**
- Dojo cards now link to `/dashboard/students?dojo={dojoName}`.
- The card is fully clickable while keeping action buttons (edit/delete) usable.

**Where**
- `src/app/dashboard/dojos/page.tsx`

---

## 2) Students page supports `?dojo=` and preselects dojo in create flows

**Change**
- Reads `dojo` from `searchParams`, resolves it to a dojo id, and filters the Supabase students query by `dojo_id`.
- Passes the selected dojo through to:
  - Add Student dialog (defaults the dojo)
  - Bulk upload dialog (defaults the dojo)

**Where**
- `src/app/dashboard/students/page.tsx`
- `src/components/students/student-dialog.tsx`
- `src/components/students/student-bulk-upload.tsx`

---

## 3) Students dojo filter is URL-synced and paging-safe

**Change**
- The dojo filter dropdown is now controlled and synced from the URL (`dojo=`) or server-provided initial filter.
- Changing dojo updates the URL, clears `page`, and triggers the global navigation loader for instant feedback.

**Where**
- `src/components/students/student-data-table.tsx`

---

## 4) Unified profile display-name derivation + safer profile auto-create

**Change**
- Added a shared helper to derive a best-effort `full_name` from Supabase user metadata/identity data (and avoid role-like placeholders).
- When auto-creating `public.profiles`, the insert now includes `role: 'coach'` consistently.
- If an existing profile has a placeholder-ish name (e.g. `coach`, `organizer`, or email local-part), it is updated opportunistically when a better OAuth name becomes available.

**Where**
- `src/lib/auth/profile.ts`
- `src/lib/auth/require-role.ts`
- `src/app/dashboard/events-browser/actions/index.ts`

---

# Session 21 — Skeleton Loading States + Shimmer UI (2026-02-26)

This session focused on improving perceived performance by using skeleton placeholders (instead of blank/spinners) across key dashboard routes.

## 1) Added a `Skeleton` primitive + shimmer animation

**Change**
- Added a reusable `Skeleton` component backed by a `.shimmer` utility class.
- Added `.shimmer` styles + keyframes in global CSS for both light and dark theme.

**Where**
- `src/components/ui/skeleton.tsx`
- `src/app/globals.css`

---

## 2) Dashboard root loading now matches dashboard layout

**Change**
- Replaced the previous dashboard loading component with a structured skeleton: page header, bento-style cards, and list rows.

**Where**
- `src/app/dashboard/loading.tsx`

---

## 3) Added route-level loading skeletons for major dashboard pages

**Change**
- Added dedicated route-level `loading.tsx` skeletons so each section shows an immediate, layout-accurate placeholder while server components stream.

**Where**
- `src/app/dashboard/entries/loading.tsx`
- `src/app/dashboard/events/loading.tsx`
- `src/app/dashboard/events-browser/loading.tsx`
- `src/app/dashboard/students/loading.tsx`

---

# Session 22 — Coach Register UX + Mobile Nav Polish (2026-02-26)

This session focused on tightening the coach registration UX on small screens and polishing the dashboard’s mobile navigation/header layering.

## 1) Coach “Register athletes” dialog is viewport-friendly

**Change**
- Updated the register dialog to use viewport-aware width and max-height, with scrolling enabled so the form stays usable on smaller devices.

**Where**
- `src/components/coach/coach-dashboard.tsx`

---

## 2) Coach register filters/action bar/table are responsive

**Change**
- Filters bar now stacks nicely on mobile and uses full-width inputs/selects.
- Action controls (event day + participation + add) handle narrow screens via horizontal scrolling and tighter button copy.
- Table container now supports horizontal scrolling with a sensible minimum table width.

**Where**
- `src/components/coach/coach-student-register.tsx`

---

## 3) Mobile nav + header layering polish

**Change**
- Reduced mobile drawer width so it doesn’t fully cover the screen on small devices.
- Increased mobile header z-index and refined border/background styles to prevent overlay/clipping issues.

**Where**
- `src/components/dashboard/mobile-nav.tsx`
- `src/components/dashboard/responsive-dashboard-frame.tsx`

---

## 4) Small dashboard copy improvement

**Change**
- Renamed Students metric helper text from “Total registered” → “Total Athletes”.

**Where**
- `src/app/dashboard/page.tsx`

---

# Session 23 — Milestone #1: Organizer Entries + Event Settings + Registration/Chest Numbers (v0.4.3, 2026-03-04)

This session captures the milestone1 branch work (released as `v0.4.3`) around organizer-side entry management, event settings, and database support for registration/chest numbers.

## 1) Organizer: event Entries page (filtering + pagination)

**Change**
- Added a dedicated organizer view at `/dashboard/events/{id}/entries` backed by `organizer_entries_view`.
- Implemented URL-driven filtering (search `q`, `status`, `coach`, `day`) and pagination.
- Normalized flat view rows into the nested shape used by the entries table.

**Where**
- `src/app/dashboard/events/[id]/entries/page.tsx`
- `src/components/events/entry-filters.tsx`

---

## 2) Organizer: per-entry + bulk approve/reject status updates

**Change**
- Added server actions to update entry status with organizer ownership checks.
- Added per-row approve/reject buttons and multi-select bulk actions (“Approve Selected” / “Reject Selected”).

**Where**
- `src/app/dashboard/events/[id]/entries/actions.ts`
- `src/components/events/entries-table.tsx`
- `src/components/events/entry-approval-buttons.tsx`

---

## 3) Organizer: export entries to Excel

**Change**
- Added a server action to export event entries with the active filters applied.
- Added a client export control that generates an Excel file and downloads it with exporting/toast feedback.

**Where**
- `src/app/dashboard/events/[id]/entries/actions.ts`
- `src/components/events/export-entries.tsx`

---

## 4) Event settings page (registration toggle + danger-zone delete)

**Change**
- Added a dedicated settings page for organizers/admins.
- Added settings update action (title/location/registration-open), plus a “Danger Zone” section for deletion.
- Linked the settings surface from the event page.

**Where**
- `src/app/dashboard/events/[id]/settings/page.tsx`
- `src/app/dashboard/events/[id]/actions.ts`
- `src/components/events/event-settings-form.tsx`
- `src/app/dashboard/events/[id]/page.tsx`
- `src/components/ui/accordion.tsx`
- `src/components/ui/switch.tsx`

---

## 5) DB: student registration numbers + entry chest numbers + registration open/close

**Change**
- Added `students.registration_no` with automated generation via trigger/sequence.
- Added `entries.chest_no` and assigned chest numbers when status transitions to `approved`.
- Rebuilt `organizer_entries_view` to surface `chest_no` and student `registration_no`.
- Added `events.is_registration_open` boolean (default `true`) to support opening/closing registration.

**Where**
- `supabase/migrations/20240304_registration_and_chest_no.sql`
- `supabase/migrations/registration open close toggle.sql`

---

## 6) UI propagation for new fields + spam-submit guards

**Change**
- Surfaced student `registration_no` in student lists and coach entry views.
- Surfaced entry `chest_no` in coach and organizer entry tables.
- Added submit locks to reduce accidental double-submit spam in common dialogs.

**Where**
- `src/components/students/student-data-table.tsx`
- `src/app/dashboard/entries/[eventId]/page.tsx`
- `src/components/coach/coach-entries-list.tsx`
- `src/components/students/student-dialog.tsx`
- `src/components/dojos/dojo-dialog.tsx`
- `src/components/categories/category-dialog.tsx`

---

## 7) Docs refresh

**Change**
- Added contribution guidelines and refreshed README feature/setup notes.

**Where**
- `CONTRIBUTING.md`
- `README.md`
