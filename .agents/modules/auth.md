# Auth System

> Deep-dive for authentication flows. Read AGENTS.md first.

---

## Files

```
src/lib/auth/
├── session.ts          ← Session management (7.3KB) — core session functions
├── otp.ts              ← OTP generation + verification (9.2KB)
├── google.ts           ← Google OAuth (5.9KB)
├── require-role.ts     ← Role gate helper (627B)
├── rate-limit.ts       ← In-memory rate limiter (767B)
├── rate-limit-db.ts    ← DB-backed rate limiter for OTP (3.5KB)
├── password.ts         ← bcrypt helpers (685B)
├── profile.ts          ← User profile fetch (1.3KB)
└── add-user.ts         ← Create user in system (1.2KB)

src/app/api/auth/
├── otp/route.ts        ← POST: send OTP / verify OTP
├── google-join/route.ts← POST: Google OAuth callback
├── logout/route.ts     ← POST: destroy session
└── session/route.ts    ← GET: current session info
```

---

## Two Separate Auth Systems

| | Coach/Organiser | Parent |
|---|---|---|
| Table | `users` | `guardian_accounts` |
| Methods | Email OTP + Google OAuth | Email OTP only |
| Role field | `users.role` ('coach','organizer','admin') | N/A |
| Session function | `requireRole(['coach'])` | `requireParentSession()` |
| Cookie | `session_token` | `parent_session_token` (different name) |
| Redirect on fail | `/login` | `/join/[slug]` or `/login` |

---

## OTP Flow

```
1. POST /api/auth/otp { email, action: 'send' }
   → rate-limit-db check
   → generate 6-digit code
   → store hash in DB (or Redis equivalent)
   → send via Resend email
   → return { sent: true }

2. POST /api/auth/otp { email, otp, action: 'verify' }
   → verify hash
   → find or create user / guardian_account
   → createSession() → store in sessions table
   → set HttpOnly cookie
   → return { success: true, role }
```

---

## Google OAuth Flow

```
1. User clicks Google button → redirected to Google
2. Google → POST /api/auth/google-join { credential }
3. verifyGoogleToken(credential) → gets email, name, google_id
4. findOrCreateGoogleUser() → upsert in users table
5. createSession() → HttpOnly cookie
6. Redirect to /dashboard
```

---

## Session Structure

```ts
// Stored in sessions table, referenced via HttpOnly cookie
interface Session {
  userId: string;      // users.id
  email: string;
  role: 'coach' | 'organizer' | 'admin';
  sessionToken: string;
  expiresAt: Date;
}

// For parent sessions
interface ParentSession {
  guardianAccountId: string;   // guardian_accounts.id
  email: string;
  sessionToken: string;
  expiresAt: Date;
}
```

---

## Usage in Server Actions / Route Handlers

```ts
// For coach/organiser pages
import { requireRole } from '@/lib/auth/require-role';
const session = await requireRole(['coach', 'organizer']);
// Redirects to /login if not authenticated or wrong role

// For parent pages
import { requireParentSession } from '@/lib/auth/session';
const session = await requireParentSession();
// Redirects to /login if not authenticated

// For any authenticated user (any role)
import { requireRole } from '@/lib/auth/require-role';
const session = await requireRole(['coach', 'organizer', 'admin']);
```

---

## Rate Limiting

- **In-memory** (`rate-limit.ts`): for general API routes, resets on server restart
- **DB-backed** (`rate-limit-db.ts`): for OTP sends specifically, persists across restarts
- OTP limit: max 3 sends per email per 15 minutes

---

## Turnstile (Bot Protection)

- Used on login + join forms
- Client: `@marsidev/react-turnstile`
- Server: verify token via Cloudflare API in route handler
- Env var: `TURNSTILE_SECRET_KEY`

---

## Profile Photo (Required)

- After first login, `compulsory-profile-photo-upload.tsx` blocks dashboard until photo uploaded
- Check: `users.avatar_url IS NULL` → show upload gate
- Upload goes to Vercel Blob via `/api/upload`
- Applies to coach/organiser. Parent uses `guardian_accounts` avatar separately.
