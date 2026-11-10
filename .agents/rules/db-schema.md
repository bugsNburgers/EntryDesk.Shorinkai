# Database schema and migrations

On a fresh database, apply `schema.sql`, then run `npm run db:migrate` from the repo root. On an existing database, run only `npm run db:migrate`. It reads `DATABASE_URL` from the terminal or `.env` and replays numbered migrations in order without a history table. Pass `-- <migration-filename.sql>` when deliberately applying one file. The runner uses transactions except for migration 004's concurrent index statement, which runs on its own. Add future migrations using the next number and verify that applying the full sequence twice preserves existing data.

Migrations: 001 parent portal · 002 registration number overflow · 003 entry snapshot · 004 unique chest numbers · 005 repair double-encoded JSONB · 006 organizer event creation permission (defaults to `false`).
IDs are UUID (`gen_random_uuid()`). Neon runs Postgres 18; local Docker uses 16 (same behaviour).

## users  (ALL roles incl. parents)
id, email (unique, lowercase), password_hash NULL, full_name, role CHECK(coach|organizer|admin|parent) default coach,
avatar_url, google_id UNIQUE, is_active (false = pending approval), created_at, updated_at.  View `profiles`.
Coach/organiser must have `avatar_url` set or the dashboard shows a mandatory photo-upload gate.

## sessions
user_id → users, session_token = **SHA-256 of the cookie value** (cookie `entrydesk_session` holds the raw token),
expires_at (parent 90d, others 7d), user_agent, ip_address.

## dojos
coach_id → users, name, city, slug UNIQUE (join URL `/join/<slug>`), join_code UNIQUE (6 hex), join_link_enabled, welcome_note.

## students  (athletes)
dojo_id, **parent_id → users** (the registering parent; NULL for coach-created), name, gender, date_of_birth, weight, rank,
registration_no UNIQUE (trigger, `SK26-0001`; migration 002 fixes overflow past 9,999), photo_url, phone, school_or_city,
dob_locked (**unused**, superseded by the entry snapshot), consent_given_at/version/by, membership_status (`active|removed`), removed_at/by/reason, is_active
(trigger-managed), generic_checked.

## events
organizer_id, title, description, event_type (tournament|seminar|test), level, start_date, end_date, location, is_public,
is_registration_open, registration_close_date, temporary_registration_closes_at, coach_checks_each_entry (default true),
age_cutoff_rule (`tournament_day|jan_1`), photo_required, max_events_per_athlete.
UNIQUE(organizer_id, lower(title), event_type, start_date, end_date, lower(location)).
Child tables: event_days(event_id,date,name), categories(event_id,name,gender,min/max age/weight/rank).

## event_applications
event_id, coach_id, status (pending|approved|rejected). UNIQUE(event_id, coach_id). A parent can only register for events
whose application for their dojo's coach is `approved` (or the coach is the organiser).

## entries
event_id, coach_id, student_id, category_id NULL, event_day_id NULL, participation_type (`both|kata|kumite|…,team_kata,team_kumite`),
**status** CHECK: `draft | pending_coach | submitted | approved | rejected | correction_needed | coach_declined | withdrawn`,
chest_no (trigger on approval), generic_checked, submitted_by, coach_reviewed_by/at, coach_notes, org_reviewed_by/at,
rejection_reason, qr_token (unique partial), checked_in_at/by, declared_weight_kg, category_snapshot JSONB
(`lib/category.ts` result: ageGroup, genderLabel, weightClass, displayName, ageYears).
**Snapshot (migration 003)**: snap_name, snap_gender, snap_dob, snap_rank, snap_school_or_city, snap_taken_at — the athlete as entered.
Event-context reads use `COALESCE(e.snap_*, s.*)` and `COALESCE(e.declared_weight_kg, s.weight)`.
UNIQUE(student_id, event_id). **UNIQUE(event_id, chest_no) WHERE chest_no IS NOT NULL** (`idx_entries_event_chest`, migration 004).

## Others
event_collaborators / dojo_collaborators (user_id, permission read|write), contacts (public form),
otp_codes (email, bcrypt code_hash, expires_at, attempts, used, ip_address), auth_rate_limits (key, count, reset_at),
audit_log (actor_type, actor_id, action, entity_type, entity_id, details JSONB, ip_address).

## Triggers / functions
| Name | On | Effect | Caveat |
|---|---|---|---|
| tr_generate_student_registration_no | students BEFORE INSERT | `SK<yy>-<seq>` | pad only <10000 (mig. 002) |
| tr_assign_chest_no_on_approval | entries BEFORE UPDATE | chest_no = MAX+1 per event on first →approved (only if NULL) | per-event `pg_advisory_xact_lock` + unique index (mig. 004). Rejected/withdrawn keep their number; re-approval keeps it; only a manual organiser edit frees a number |
| tr_fill_entry_snapshot | entries BEFORE INSERT/UPDATE | fills snap_* (+declared_weight_kg if NULL) on insert; re-takes it on draft/withdrawn/coach_declined/rejected → pending_coach/submitted | skipped when the statement sets snap_taken_at itself (app-written snapshot) |
| evaluate_activity_on_entry | entries AFTER INS/UPD/DEL (per row) | recompute students.is_active for the dojo | per-row; ~1 ms/row at 3k entries, grows with dojo size |
