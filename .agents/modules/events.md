# Events & Entries Module

> Deep-dive for events management and entry approval flows. Read AGENTS.md first.

---

## Files in This Module

```
src/app/dashboard/events/
├── page.tsx                         ← Events list (14KB) — organiser + coach views
├── actions/                         ← Server actions for events
├── loading.tsx
└── [id]/                            ← Single event management page
    └── actions/

src/app/dashboard/entries/
├── page.tsx                         ← Redirect (128B)
├── loading.tsx
├── actions/                         ← Entry server actions
└── [eventId]/                       ← Entries for specific event

src/app/dashboard/approvals/
├── page.tsx                         ← Pending coach applications (9.5KB)
└── actions/

src/components/events/
├── organiser-entries-list.tsx       ← HUGE (88KB) — organiser entry management
├── entries-table.tsx                ← Entry table component (10KB)
├── create-event-dialog.tsx          ← New event form (9KB)
├── event-settings-form.tsx          ← Edit event settings (13KB)
├── event-sharing-section.tsx        ← Coach link sharing (6.7KB)
├── entry-approval-buttons.tsx       ← Approve/reject buttons (2.7KB)
├── entry-filters.tsx                ← Filter bar (7.8KB)
├── export-entries.tsx               ← Export to xlsx/pdf (1.7KB)
├── registration-deadline.tsx        ← Deadline display (3KB)
├── coach-events-browser.tsx         ← Coach browsing open events (24KB)
├── delete-event-form.tsx            ← Delete confirmation (4KB)
└── apply-button.tsx                 ← Coach applies to event (2KB)

src/components/coach/
├── coach-entries-list.tsx           ← HUGE (90KB) — coach entry review for parent entries
├── coach-add-student-dialog.tsx     ← Coach manually adds student (50KB)
├── coach-student-register.tsx       ← Coach registers existing student (16.7KB)
├── coach-overview.tsx               ← Dashboard overview stats (12KB)
├── coach-dashboard.tsx              ← Dashboard shell (4.6KB)
├── parent-entries-table.tsx         ← Coach reviews parent-submitted entries (33KB)
├── parent-entries-filters.tsx       ← Filter bar for parent entries (7.9KB)

src/components/approvals/
└── approval-buttons.tsx             ← Organiser approves/rejects coach applications (2.9KB)
```

---

## Entry Status Flow

```
draft → submitted → approved
                 → rejected
```

| DB Value | UI Label | Who Sets It |
|---|---|---|
| `draft` | "Pending Coach Review" | Auto on parent submission (if coach-check ON) |
| `submitted` | "Sent to Organiser" | Coach manually submits to organiser |
| `approved` | "Approved" | Organiser approves → triggers chest_no |
| `rejected` | "Rejected" | Organiser rejects |

**Always use `@/lib/status` helpers for labels/colors — never raw strings in UI.**

---

## Event Application Flow

```
Coach applies → event_applications.status = 'pending'
Organiser approves → status = 'approved'
Coach can now submit entries to this event
```

---

## Key Types

```ts
// From src/types/database.ts
interface Event {
  id: string;
  organizer_id: string;
  title: string;
  event_type: 'tournament' | 'seminar' | 'test';
  level: 'club' | 'district' | 'state' | 'national' | 'international';
  start_date: string;
  end_date: string;
  location: string | null;
  is_public: boolean;
  is_registration_open: boolean;
  registration_close_date: string | null;
}

interface Entry {
  id: string;
  event_id: string;
  coach_id: string;
  student_id: string;
  category_id: string | null;
  event_day_id: string | null;
  participation_type: 'kata' | 'kumite' | 'both' | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  chest_no: number | null;   // set by DB trigger on approval
  generic_checked: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## Important Business Rules

1. **Chest numbers** are auto-assigned by DB trigger when entry status → 'approved'. Never manually set.
2. **`generic_checked`**: flag for generic check-in (not category-specific). Default false.
3. **Coach check mode**: `dojos.join_link_enabled` equivalent exists for entries. If ON, parent entries go to `draft` first (coach reviews). If OFF, straight to `submitted`.
4. **Registration close**: both `registration_close_date` (date) and `temporary_registration_closes_at` (timestamptz). Temporary takes precedence if set.
5. **Public events**: `is_public = true` means listed at `/api/public-events` for unauthenticated viewers.
6. **Collaborators**: `event_collaborators` allows additional organiser-role users to manage an event.

---

## Exports

- Format: xlsx (via `xlsx` package) and PDF (jsPDF + html2canvas)
- Export component: `src/components/events/export-entries.tsx`
- Bulk team card print: `src/components/id-card/team-cards-print-client.tsx`
