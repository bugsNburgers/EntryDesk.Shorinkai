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

## Don'ts
- Don't let any code path call `createSession` for a user that wasn't explicitly authenticated as *that* user.
- Don't `UPDATE users SET is_active = TRUE` from a public endpoint (that is the admin approval switch).
- Don't copy the Google profile photo into `avatar_url` (deliberate: ID-card photos must be real headshots).

## Mandatory profile photo
Coach/organiser with `avatar_url IS NULL` are blocked by `compulsory-profile-photo-upload.tsx` until they upload (`/api/upload/profile-photo`).
