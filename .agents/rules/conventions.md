# Coding Conventions & Patterns

> Load this when you need to write or modify code. Contains the non-obvious rules.

---

## Database Access

```ts
// ✅ CORRECT — always use tagged template
import sql from '@/lib/db';
const rows = await sql`SELECT * FROM students WHERE dojo_id = ${dojoId}`;

// ❌ WRONG — never raw strings, never string concatenation
const rows = await sql(`SELECT * FROM students WHERE dojo_id = '${dojoId}'`);
```

- Connection: `src/lib/db/index.ts` exports default `sql` (postgres npm package)
- All queries return typed arrays. Use `database.ts` types.
- Transactions: `` sql.begin(async sql => { ... }) ``

---

## Authentication & Session

```ts
// In server actions / route handlers — ALWAYS at the top
import { requireRole } from '@/lib/auth/require-role';
const session = await requireRole(['coach']); // throws redirect if not authed
// session.userId, session.role, session.email available

// For parent portal
import { requireParentSession } from '@/lib/auth/session';
const parentSession = await requireParentSession(); // throws redirect
```

- Sessions are stored in `sessions` table + HttpOnly cookie
- Parent sessions are SEPARATE — `guardian_accounts` table, separate cookie
- OTP auth: `src/lib/auth/otp.ts` — sends 6-digit code via Resend
- Google OAuth: `src/lib/auth/google.ts`
- Rate limiting: `src/lib/auth/rate-limit.ts` (in-memory) + `src/lib/auth/rate-limit-db.ts` (DB-backed)

---

## Server Actions

```ts
// Pattern: co-locate actions.ts next to the page that uses them
// src/app/dashboard/students/actions/index.ts
'use server';
import { requireRole } from '@/lib/auth/require-role';
import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createStudent(formData: FormData) {
  const session = await requireRole(['coach']);
  // ... validate with zod from @/lib/validation
  // ... insert with sql``
  revalidatePath('/dashboard/students');
}
```

---

## TypeScript Types

```ts
// ✅ Import from central types file — NEVER redefine
import type { Student, Entry, Event, User } from '@/types/database';

// types/database.ts has:
// Student, Dojo, Event, Entry, Category, EventDay
// EventApplication, GuardianAccount, DojoCoCo, EventCollaborator
```

---

## Forms

```ts
// Always: react-hook-form + zod v4
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Shared zod schemas live in src/lib/validation.ts — check there first
import { studentSchema } from '@/lib/validation';
```

---

## Status Values

```ts
// ✅ Use status helpers — never show raw DB values in UI
import { getEntryStatusLabel, getEntryStatusColor } from '@/lib/status';
// DB values: 'draft' | 'submitted' | 'approved' | 'rejected'
// UI labels: 'Pending Review' | 'Submitted' | 'Approved' | 'Rejected'
```

---

## Environment Variables

```
DATABASE_URL           Neon Postgres connection string
APP_BASE_URL           Base URL for links/QR codes (no trailing slash)
RESEND_API_KEY         Email sending
VERCEL_BLOB_TOKEN      Photo/file storage
GOOGLE_CLIENT_ID       OAuth
GOOGLE_CLIENT_SECRET   OAuth
JWT_SECRET             Session signing
TURNSTILE_SECRET_KEY   Bot protection
```

Never hardcode domain. Always `process.env.APP_BASE_URL`.

---

## File Upload / Photos

- Use `@/lib/image-compression` before upload
- Upload via `src/app/api/upload/` route → Vercel Blob
- Photo URL stored in `students.photo_url` or `guardian_accounts.avatar_url`

---

## Email

```ts
// Always use pre-built notification functions
import { sendEntryApprovedEmail } from '@/lib/email/notifications';
// Never call Resend directly from page/action code
// Templates live in src/lib/email/templates/
```

---

## Migrations

1. Create `src/lib/db/migrations/NNN_description.sql`
2. Run it manually on Neon or via `scripts/` helper
3. Update `src/types/database.ts` to match new columns
4. NEVER edit `src/lib/db/schema.sql` for incremental changes

---

## Component Conventions

- Server Components by default (no `'use client'` unless needed)
- `'use client'` only for: event handlers, hooks, browser APIs
- Large client components in `src/components/<module>/` folder
- UI primitives from `src/components/ui/` (shadcn-based)
- Loading states: use `loading.tsx` co-located with pages
- Error boundaries: use `error.tsx` co-located with pages

---

## Tailwind v4 Notes

- Config is in `postcss.config.mjs` — no `tailwind.config.js`
- Custom tokens defined in `src/app/globals.css` via CSS variables
- Use `cn()` from `@/lib/utils` for conditional classes (clsx + tailwind-merge)
