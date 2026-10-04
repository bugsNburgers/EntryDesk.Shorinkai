# API Routes & Server Actions Map

> Complete map of every API endpoint and server action. Use this to avoid creating duplicates.

---

## Next.js API Routes (`src/app/api/`)

| Method | Route | File | Purpose |
|---|---|---|---|
| POST | `/api/auth/otp` | `src/app/api/auth/otp/route.ts` | Send/verify OTP |
| POST | `/api/auth/google-join` | `src/app/api/auth/google-join/route.ts` | Google OAuth join flow |
| POST | `/api/auth/logout` | `src/app/api/auth/logout/route.ts` | Destroy session cookie |
| GET  | `/api/auth/session` | `src/app/api/auth/session/route.ts` | Get current session |
| POST | `/api/email` | `src/app/api/email/route.ts` | Internal email trigger |
| GET  | `/api/id-card/[...params]` | `src/app/api/id-card/route.ts` | Generate ID card PDF |
| GET  | `/api/public-events` | `src/app/api/public-events/route.ts` | Public events listing |
| POST | `/api/upload` | `src/app/api/upload/route.ts` | Photo upload → Vercel Blob |

---

## Dashboard Server Actions

### Students (`src/app/dashboard/students/actions/index.ts`)
- `getStudents(dojoId)` — fetch all students for a dojo
- `createStudent(formData)` — add new student
- `updateStudent(studentId, formData)` — edit student
- `deleteStudent(studentId)` — soft delete (sets is_active = false)
- `bulkUploadStudents(data[])` — CSV/Excel bulk import

### Events (`src/app/dashboard/events/actions/`)
- `createEvent(formData)` — create new event
- `updateEvent(eventId, formData)` — edit event
- `deleteEvent(eventId)` — delete event
- `toggleRegistration(eventId)` — open/close registration
- `getEventWithDetails(eventId)` — full event + categories + days

### Entries (`src/app/dashboard/entries/actions/`)
- `getEntriesForEvent(eventId)` — all entries for an event
- `approveEntry(entryId)` — approve → triggers chest_no assignment
- `rejectEntry(entryId)` — reject entry
- `bulkApprove(entryIds[])` — bulk approve
- `exportEntries(eventId, format)` — xlsx/pdf export

### Approvals (`src/app/dashboard/approvals/actions/`)
- `getPendingApplications()` — event_applications pending
- `approveApplication(applicationId)` — approve coach for event
- `rejectApplication(applicationId)` — reject coach

---

## Parent Portal Server Actions

### `src/app/parent/actions.ts`
- `getParentProfile()` — guardian_account for current session
- `updateParentProfile(formData)` — update name/phone
- `getMyChildren()` — students linked to guardian_account_id
- `addChild(formData)` — register new student via parent
- `updateChild(studentId, formData)` — edit child details
- `getDojoInfo(slug)` — public dojo info for join page

### `src/app/parent/entry-actions.ts` (14KB)
- `getAvailableEvents(dojoId)` — events open for this dojo
- `registerChildForEvent(studentId, eventId, formData)` — create entry
- `withdrawEntry(entryId)` — withdraw/cancel entry
- `getChildEntries(studentId)` — all entries for a child
- `selectEventDay(entryId, dayId)` — pick event day

---

## Auth Lib Functions (`src/lib/auth/`)

| File | Key Exports |
|---|---|
| `session.ts` | `getSession()`, `requireSession()`, `requireParentSession()`, `createSession()`, `destroySession()` |
| `otp.ts` | `generateOTP()`, `sendOTPEmail()`, `verifyOTP()`, `createOTPSession()` |
| `google.ts` | `verifyGoogleToken()`, `findOrCreateGoogleUser()` |
| `require-role.ts` | `requireRole(roles[])` → returns session or redirects |
| `rate-limit.ts` | `checkRateLimit(key, max, windowMs)` |
| `rate-limit-db.ts` | DB-backed rate limit for OTP |
| `add-user.ts` | `addUserToSystem(email, role)` |
| `profile.ts` | `getUserProfile(userId)` |
| `password.ts` | `hashPassword()`, `comparePassword()` |
