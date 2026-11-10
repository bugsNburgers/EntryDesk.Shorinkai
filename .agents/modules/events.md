# Events & entries (verified 2026-11-09)

Code: `src/app/dashboard/{events,events-browser,entries,parent-entries,approvals}`, `src/components/{events,coach}`, `src/lib/{status,category}.ts`, `src/lib/events/*`.

## Two approval layers
1. **Coach ↔ event**: coach applies (`applyToEvent`) → organiser approves in `/dashboard/approvals` (`updateApplicationStatus`) → `event_applications.status='approved'`.
   Only then can that coach's parents register (checked in `submitParentEntry`).
2. **Entry**: parent registers → coach reviews → organiser approves.

## Entry status machine (DB values; labels from `lib/status.ts`)
```
parent submits ──► pending_coach (event.coach_checks_each_entry = true)  | submitted (false)
pending_coach ──coach Send──► submitted ──organiser ✓──► approved   (chest_no via trigger, qr_token set)
              ──coach Fix───► correction_needed ──parent resubmits──► pending_coach
              ──coach ✕────► coach_declined        submitted ──organiser ✕──► rejected
parent withdraw (not approved, before deadline) ──► withdrawn   (re-registering reuses the same row)
```
`draft` exists in the CHECK constraint but the parent flow never produces it.
Parent-visible labels: Waiting for coach · Waiting for organiser · Please correct and send again · Coach did not send it · Accepted · Not accepted · Withdrawn.

## Key behaviour
- One entry per (athlete, event) — `UNIQUE(student_id, event_id)`.
- Registration blocked when: `is_registration_open=false`, `registration_close_date` passed, event ended, photo required but missing.
- **Per-event snapshot (owner decision)**: the athlete's name/gender/DOB/rank/school + `declared_weight_kg` are frozen on the entry
  (`entries.snap_*`, migration 003) when it is created or re-activated (re-register after withdraw/decline, resubmit after a correction
  request, coach draft → sent). Profile edits only affect entries made later. Coach/organiser can fix typos with
  `correctEntrySnapshot` (pencil button in the organiser entries table and coach parent-entries table; audited). Parents cannot.
- **Category label** (informational; RingFlow categorises itself): `category_snapshot` = `calculateCategory()` with age measured on
  `ageReferenceDate(event.start_date, event.age_cutoff_rule)` (`tournament_day` = start date, `jan_1` = 1 Jan of the start year).
  Written by `submitParentEntry`, `coachAddManualStudentAndEntry`, recomputed when coach drafts are sent and when a snapshot is corrected.
  Lists show `COALESCE(categories.name, category_snapshot->>'displayName')`. Parents never pick a category; organiser `categories` rows stay optional.
- participation_type is a comma list (`both`, `kata`, `kumite`, `+team_kata`, `+team_kumite`).
- **Chest numbers**: assigned on first approval as per-event MAX+1 under `pg_advisory_xact_lock`, unique index `idx_entries_event_chest`.
  Numbers are never reassigned automatically: rejected/withdrawn entries keep their number, re-approval keeps the old one. Only an organiser
  editing numbers by hand (`updateEntryChestNo`, friendly error on duplicates, audited `entry.chest_no_changed`) can free or move one.
- Organiser exports: `exportEventEntries` (generic xlsx), **Export for RingFlow** (`exportEventForRingFlow` → `lib/export/ringflow.ts`), print views under `…/print`.

## RingFlow export (official-roster format)
First sheet, exact headers: `Number, School, School Code, SPORTS ID, Name, category, age, sex, belt, day, weight, kata, kumite, Team Kata, Team Kumite`.
Approved entries with a chest number only, ordered by chest number. Number = chest_no · School = dojo name · School Code = dojo `join_code` ·
SPORTS ID = `registration_no` · Name/age/sex/belt/weight from the snapshot · age = whole years on the event's reference date ·
sex `male→M`, `female→F`, other → blank · belt: rank slug → `White/Yellow/Orange/Green/Blue/Purple/Brown/Black` (kyu/dan grades collapse) ·
day = event day name · kata/kumite/Team flags `Yes/No` from participation_type (blank when unknown, RingFlow then infers).
`tests/unit/ringflow-export.test.ts` runs the exported .xlsx through a verbatim copy of RingFlow's `prepareOfficialRows` (and checks the copy
still matches RingFlow's source when that repo is present).

## Big components (split 2026-11-09; behaviour unchanged)
`coach/coach-entries-list.tsx` → `coach-entries-list-parts/` (hook `use-coach-entries-list.ts`, toolbar, desktop-table, mobile-list, footer, reject-dialog, shared).
`events/organiser-entries-list.tsx` → `organiser-entries-list-parts/` (+ chest-no-dialog, entry-detail-dialog).
`coach/coach-add-student-dialog.tsx` → `coach-add-student-dialog-parts/` (header, athlete/discipline/guardian sections, success-screen, footer).
`id-card/id-card-preview.tsx` re-exports `id-card-parts/{card-data,phone-pass,a4-sheet}.tsx` (moved byte-for-byte; **print output must stay
pixel-identical — fixed colours there are intentional**). The parent files keep their names/exports, so imports did not change.
