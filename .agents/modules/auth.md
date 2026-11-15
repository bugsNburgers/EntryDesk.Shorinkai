# Auth (verified 2026-11-09)

Files: `src/lib/auth/{session,google,otp,rate-limit-db,password,profile,add-user}.ts`, `require-role.ts` (barrel → session.ts),
`src/app/api/auth/*`, `src/app/login/*`, `src/components/auth/*`, `src/proxy.ts`.

## One user table, one cookie
Everyone (parent, coach, organizer, admin) is a row in `users`. Session = HttpOnly cookie `entrydesk_session` (random 32-byte
hex); DB `sessions.session_token` stores its SHA-256. Lifetime: parent 90 d, others 7 d. `getCurrentSession()` is
`cache()`d per request and requires `users.is_active = true`. `requireRole(role|roles, {redirectTo?})` throws "Unauthorized" or redirects.
`proxy.ts` only checks that the cookie *exists* for `/dashboard`, `/parent`, `/athlete`; real validation happens in the page/action.

## Sign-in paths
| Who | Path | Behaviour |
|---|---|---|
| Coach / organiser / admin | `/login` password (`login()`), or Google (`verifyGoogleLogin`) | **Whitelist**: unknown Google email → inserted as inactive `coach` + "awaiting approval"; admin flips `is_active`. |
| Parent | `/join/<slug>` Google → `POST /api/auth/google-join` | auto-creates `parent` (active). Existing active coach signing in here just gets their own session. |
| Parent | `/join/<slug>` email code → `/api/auth/otp` → `/api/auth/otp/verify` | auto-creates `parent`. **Rejects any existing non-parent or inactive email (403).** |
Redirect target: `/athlete` (+ `?joinedDojo=<slug>`), cookie `parent_dojo_slug` (30 d) remembers the dojo.

## Email OTP details
6 digits, bcrypt-hashed in `otp_codes`, 10 min expiry, max attempts then burn, 30 s resend cooldown, rate limits 5/email +
10/IP per 15 min (send) and 20/IP per 15 min (verify), Turnstile required for the first send when `TURNSTILE_SECRET_KEY` is set.
Production **needs `RESEND_API_KEY`** — without it `sendOtpEmail` fails (500) and OTP login does not work.
In dev without a key the code is printed to the server log and returned as `devCode`.

## "Last used" sign-in hint (Cloudflare-style)
Cookie `entrydesk_last_login` = `<method>|<masked email>` (e.g. `google|pr***n@gmail.com`), HttpOnly, SameSite=Lax, 365 d. It is a
cosmetic hint, **not a session**: nothing trusts it. Written (never on failure) right after `createSession` in `login()` (password),
`verifyGoogleLogin()`, `/api/auth/google-join`, `/api/auth/otp/verify`. Logout does NOT clear it (it outlives the 7/90-day session).
Only the middle of the name is hidden (`maskEmail`); the full email is never stored in it.
`/login` renders it server-side (`readLastLogin()`): a returning visitor sees ONLY "Welcome back" + one button for the remembered method
(Google: "Continue with Google / pr***n@gmail.com"; email code: the code box; password: the form) + "Not you? Use a different account".
"Not you?" calls `forgetLastLogin()` (deletes only this cookie) and the full screen appears. Any login error also shows the full screen.
Google "continue as" button = our own visual button + Google's real GIS button overlaid invisibly (only clickable once it has rendered;
otherwise the visual button falls back to `google.accounts.id.prompt()`). `/join/<slug>` only uses the hint to pre-open the email-code box.
Files: `src/lib/auth/last-login-core.ts` (pure, unit-tested), `last-login.ts` (cookies), `src/components/auth/last-used.tsx` (NotYouButton),
`google-sign-in-button.tsx` (`continueAs`). No DB change / no migration.

## Don'ts
- Don't let any code path call `createSession` for a user that wasn't explicitly authenticated as *that* user.
- Don't `UPDATE users SET is_active = TRUE` from a public endpoint (that is the admin approval switch).
- Don't copy the Google profile photo into `avatar_url` (deliberate: ID-card photos must be real headshots).

## Mandatory profile photo
Coach/organiser with `avatar_url IS NULL` are blocked by `compulsory-profile-photo-upload.tsx` until they upload (`/api/upload/profile-photo`).
**Owner decision: this stays mandatory** — organisers must be able to recognise a coach. The gate says so ("Organisers see this photo
when approving you"). The photo is shown (click to enlarge, `SafeAvatar enlargeable`) on `/dashboard/approvals`,
`/dashboard/events/<id>/approvals`, event/dojo collaborator lists and the organiser entries "Coach" column.
OTP codes are hashed with `bcryptjs` (the native `bcrypt` dependency was removed; hashes are compatible).
