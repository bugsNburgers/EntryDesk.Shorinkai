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
- **Category is not chosen by the parent** (UI mentions it, the form has no category field; list shows "Open"/"-"). `lib/category.ts`
  can calculate one from age/weight/rank — wiring this at submit/approval time is an open item.
- `declared_weight_kg` is set from the athlete profile; participation_type is a comma list (`both`, `kata`, `kumite`, `+team_kata`, `+team_kumite`).
- Chest numbers: per-event MAX+1 in a BEFORE UPDATE trigger (race-prone under concurrent approvals; see known-issues).
- Organiser exports: `exportEventEntries` (xlsx via `xlsx`), print views under `…/print`.

## Big components (open carefully, they are huge)
`components/coach/coach-entries-list.tsx` (~90 KB), `components/events/organiser-entries-list.tsx` (~88 KB),
`components/coach/coach-add-student-dialog.tsx` (~50 KB), `components/id-card/id-card-preview.tsx` (~49 KB).
Grep for the handler/label you need instead of reading them whole.
