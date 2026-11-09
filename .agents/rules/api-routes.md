# API routes & server actions (generated from code, 2026-11-09)

All server actions start with `requireRole(...)` from `@/lib/auth/require-role` (re-export of `lib/auth/session.ts`).

## Route handlers (`src/app/api`, `src/app/auth`)
| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/otp | send email code (Turnstile if `TURNSTILE_SECRET_KEY`; 5/email + 10/IP per 15 min; 30 s cooldown). Returns `devCode` only when email is unconfigured AND not production |
| POST | /api/auth/otp/verify | verify code → parent session. **Parents only**; 403 for coach/organiser/admin/inactive emails |
| POST | /api/auth/google-join | Google ID token → auto-creates parent, sets `parent_dojo_slug` cookie |
| POST | /api/auth/logout · GET /api/auth/session | logout · current session |
| GET | /auth/callback · POST/GET /auth/signout | OAuth callback · sign out |
| POST/DELETE | /api/upload/photo | athlete photo (≤200 KB jpg/png/webp) → Vercel Blob. Without `BLOB_READ_WRITE_TOKEN`: data-URI fallback in dev, **500 in production** (`lib/storage/photo-fallback.ts`) |
| POST | /api/upload/profile-photo | coach/organiser profile photo (same Blob/fallback rules) |
| GET | /api/id-card/[entryId] | ID card PDF |
| GET | /api/public-events | public event list (landing page) |
| GET | /api/email/preview | email template preview (dev) |
| GET | /v/[token] (page) | QR check-in verification, public |

## Server actions by file
- `login/actions.ts`: login (password), verifyGoogleLogin (whitelist only), logout
- `athlete/actions.ts`: createChildAsParent, updateChildAsParent (profile edits never change existing entries)
- `athlete/entry-actions.ts`: submitParentEntry (writes snapshot + category; allows re-submit after withdrawn/coach_declined/correction_needed), withdrawParentEntry, updateParentEntryDay
- `dashboard/parent-entries/actions.ts` (coach review): coachForwardEntry, coachBulkForwardEntries, coachRequestCorrection, coachDeclineEntry, coachWithdrawEntry
- `dashboard/events/[id]/entries/actions.ts` (organiser): updateEntryStatus, bulkUpdateEntryStatus, updateEntryChestNo (returns `{error}` on duplicate number, audited), exportEventEntries, **exportEventForRingFlow** (RingFlow official-roster rows)
- `dashboard/events/actions/index.ts`: createEvent · `events/[id]/actions.ts`: deleteEvent, updateEventSettings
- `dashboard/events/[id]/categories/actions/index.ts`: createCategory, updateCategory, deleteCategory
- `dashboard/events/[id]/settings/collaborators.ts`: add/remove/updateEventCollaborator
- `dashboard/events-browser/actions/index.ts`: applyToEvent · `dashboard/approvals/actions/index.ts`: updateApplicationStatus
- `dashboard/dojos/actions.ts`: createDojo, updateDojo, toggleDojoJoinLink, regenerateDojoJoinCode, deleteDojo · `collaborators.ts`: add/remove/updateDojoCollaborator
- `dashboard/students/actions/index.ts`: createStudent, updateStudent, deleteStudent, updateStudentGenericChecked
- `dashboard/entries/actions/index.ts` (coach-managed entries): upsertEntry, submitEntries, bulkCreateEntries, bulkSubmitEntries, deleteEntry, bulkDeleteEntries, updateEntryGenericChecked, bulkUpdateEntryGenericChecked, coachAddManualStudentAndEntry
- `dashboard/entries/snapshot-actions.ts`: correctEntrySnapshot (coach/organiser/admin fix an entry's snapshot; audited `entry.snapshot_corrected`; recomputes category). Parents cannot.
- `contact/actions.ts`: submitContactForm, getContactSubmissions

## Lib helpers worth reusing
`lib/status.ts` (labels/colours), `lib/validation.ts` (zod), `lib/events/registration.ts` (isRegistrationClosed, toIsoDate),
`lib/category.ts` (calculateCategory, ageReferenceDate(start, age_cutoff_rule), ageOn), `lib/entries/snapshot.ts` (snapshotColumns, categoryForEvent, refreshCategorySnapshots, jsonb),
`lib/export/ringflow.ts` (toRingFlowRows, RINGFLOW_HEADERS, mapSex/mapBelt/mapParticipation), `lib/audit.ts` (audit log; `AUDIT_ACTIONS`),
`lib/auth/rate-limit.ts` (DB-backed), `lib/email/notifications.ts`, `lib/qr.ts`, `lib/image-compression.ts`.
