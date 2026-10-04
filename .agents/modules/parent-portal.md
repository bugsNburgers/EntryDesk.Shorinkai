# Parent Portal Module

> Deep-dive for parent-facing features. Read AGENTS.md first.

---

## Files in This Module

```
src/app/parent/
├── page.tsx                  ← Parent home — shows children + event list (7.9KB)
├── layout.tsx                ← Layout + portal nav (3.2KB)
├── actions.ts                ← Server actions: profile, children, dojo info (9.3KB)
├── entry-actions.ts          ← Server actions: events, entries, withdrawals (14KB)
├── error.tsx
├── loading.tsx
├── not-found.tsx
├── children/                 ← Child profile pages
└── entries/                  ← Entry management pages

src/app/join/
└── [slug]/                   ← Dojo join flow (slug = dojo.join_code)
    └── page.tsx              ← Shows dojo info, OTP login/register

src/components/parent/
├── registration-form.tsx     ← Add new child form (30KB) — full athlete registration
├── edit-athlete-dialog.tsx   ← Edit child details (17KB)
├── child-card-item.tsx       ← Child card UI (7.4KB)
├── child-photo-avatar.tsx    ← Photo display with upload (4.2KB)
├── entry-withdraw-dialog.tsx ← Withdraw from event dialog (15KB)
├── entry-day-selector.tsx    ← Pick event day (8.4KB)
├── entry-actions-client.tsx  ← Entry CTA buttons (5.5KB)
├── status-timeline.tsx       ← Entry status visual timeline (8.6KB)
├── portal-nav.tsx            ← Top nav for parent portal (4.3KB)
└── join-dojo-handler.tsx     ← Client handler for join flow (1.6KB)
```

---

## Parent Session (Separate from Coach/Organiser)

```ts
// Parent auth uses SEPARATE session system
import { requireParentSession } from '@/lib/auth/session';
const session = await requireParentSession();
// session.guardianAccountId, session.email

// NOT the same as requireRole() — that's for coaches/organisers
```

- Parent accounts in `guardian_accounts` table (NOT `users`)
- Auth: email OTP only (no Google, no password)
- Session cookie: separate cookie name from coach/organiser sessions

---

## Join Flow

```
Coach shares link: APP_BASE_URL/join/[dojo.join_code]
  → Parent lands on /join/[slug]
  → Sees dojo name + welcome note
  → Enters email → OTP sent → verifies
  → guardian_accounts row created (or found)
  → Linked to dojo
  → Redirected to /parent
```

Dojo lookup: `dojos.join_code` (not `slug`) — **important distinction**

---

## Entry Lifecycle (Parent View)

```
Parent picks event → registers child → entry.status = 'draft'
  → Coach sees it in parent-entries-table
  → Coach submits to organiser → status = 'submitted'
  → Organiser approves → status = 'approved' → ID card available
  OR
  → Parent withdraws (only while status = 'draft') → entry deleted
```

Parent can see status via `status-timeline.tsx` component.

---

## Key Types

```ts
// From src/types/database.ts
interface GuardianAccount {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  email_verified_at: string | null;
  last_login_at: string | null;
  status: 'active' | 'blocked';
  created_at: string;
  updated_at: string;
}
```

---

## Business Rules

1. **No approval to join**: Parent can join any dojo via the link immediately. No coach approval.
2. **Child edit lock**: After first entry is submitted to organiser, `students.dob_locked = true` → DOB cannot be changed.
3. **Photo requirement**: `compulsory-profile-photo-upload.tsx` gates dashboard until photo is uploaded.
4. **Withdrawal**: Parent can only withdraw entries in `draft` status. Submitted/approved entries need coach intervention.
5. **One email = one guardian_account**: If parent uses same email for multiple dojos, same account is reused.
6. **Blocked accounts**: `guardian_accounts.status = 'blocked'` prevents login. Coach can block from dashboard.

---

## URL Structure

| Path | What |
|---|---|
| `/parent` | Parent home |
| `/parent/children` | List of children |
| `/parent/entries` | Entry management |
| `/join/[slug]` | Dojo join (slug = dojo.join_code) |
