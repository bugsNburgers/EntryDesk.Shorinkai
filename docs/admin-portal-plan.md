# Admin portal — draft plan

*Drafted 09/11/2026. Status: planning, nothing built yet.*

## Why

Coaches, parents and many organisers are not used to software. When something goes wrong (a missing photo, a
wrong weight, an entry stuck with a coach, a coach who can't sign in), today nobody can see it except by opening the
database. The admin portal is one place where **you** can see everything, fix things for people, and send the final
roster to RingFlow.

## Who uses it

Only `users.role = 'admin'`. This role already exists, but today an admin just sees the organiser dashboard. The portal
gets its own URL, `/admin`, so it can never be reached by a coach or organiser. Every page checks `role === 'admin'` on
the server.

## What it already has to build on

| Exists today | Where |
|---|---|
| `admin` role, whitelisting via `is_active` | `users` table, `src/lib/auth/add-user.ts`, `scripts/create-user.mjs` |
| Audit log of sensitive actions | `audit_log` table, `src/lib/audit.ts` |
| RingFlow roster mapping (pure function) | `src/lib/export/ringflow.ts` (kept; only the organiser's button is removed) |
| Status words, allowed status changes | `src/lib/status.ts` |

## Pages (in build order)

### 1. Today — "what needs attention" (home page)
A list of problems, not charts. Each row has a button that fixes it or opens the right page.
- Entries stuck **With coach** for more than 3 days, and the deadline is near → "Remind coach" (WhatsApp / email)
- Entries **With organiser** for more than 3 days → "Remind organiser"
- Athletes with no photo, or a photo flagged as bad
- Coaches/organisers who tried to sign in but are not activated (unknown Google emails stored inactive)
- Events whose last day to enter is within 7 days, with how many entries are still not accepted
- Failed emails (once Resend is set up)

### 2. People
One searchable list of every user: parents, coaches, organisers, admins.
- Add a coach or organiser (replaces running `scripts/create-user.mjs` by hand)
- Activate / deactivate, change role, reset password, resend sign-in email
- Open a person → their children / dojos / events / entries, and the audit history
- **"See as this person"** (read-only): view exactly what a coach or parent sees, to help them on a phone call.
  Read-only on purpose. It never lets you click their buttons as them.

### 3. Dojos and coaches
Every dojo with its coach, join link, number of athletes and families. Move a dojo to another coach, regenerate the
join link, merge duplicate dojos.

### 4. Athletes
Search all athletes across all dojos (name, registration number, dojo, parent phone). Fix name, date of birth, belt,
weight, photo. Merge duplicates (the same child added twice by two parents).

### 5. Events
Every event from every organiser, with its stage counts (With coach · With organiser · Accepted · Needs a fix · Not
accepted). Open as organiser view. Close or reopen entries, extend the last day.

### 6. Entries (all events)
One table across all events, with the same filter boxes as the organiser page. Admin can move an entry to any allowed
stage (still checked by `assertTransitionAllowed`), with a required reason that goes to the audit log.

### 7. Export to RingFlow
Pick an event, pick days, see a preview (how many athletes, any with missing age/weight/sex), then download the `.xlsx`
using the existing `toRingFlowRows`. Shows warnings before download, not after. Later: send directly to RingFlow if it
gets an import API.

### 8. Activity log
The `audit_log` table, readable: who did what, when (DD/MM/YYYY HH:MM), filter by person, event or entry.

## Rules

- Every admin change writes to `audit_log` with the admin's id and a reason.
- No deleting from the admin portal in version 1. Deactivate or withdraw instead (the DB is live).
- Same design rules as the main app: the same status words, DD/MM/YYYY dates, labelled buttons, and it works on a phone
  (you may be at a venue).
- Laptop first for the big tables, but every page must still work at phone width.

## Phases

| Phase | Contents | Rough size |
|---|---|---|
| 1 | `/admin` shell + role guard, People (add/activate coaches & organisers), RingFlow export | ~1 week |
| 2 | Today page (stuck entries, missing photos, inactive sign-ins), Activity log | ~1 week |
| 3 | Athletes and Dojos tools (edit, merge), Events overview | ~1–2 weeks |
| 4 | "See as this person", reminders over WhatsApp/email, all-events entries table | ~1–2 weeks |

## Questions to decide

1. Will more than one person be admin? If so, do some admins only see some events or regions?
2. Should admins be able to edit an athlete's data **without** the parent knowing, or should the parent get a message?
3. Reminders: WhatsApp (needs WhatsApp Business API, costs money) or email only to start?
4. RingFlow: is a downloaded `.xlsx` enough, or do you want EntryDesk to push straight into RingFlow?
5. Should organisers keep any export at all (e.g. plain Excel), or does all exporting move to admin?

## Implementation update

The first release is in the working tree. Visit /admin as an active admin. The
portal can create Gmail logins, turn coach access on or off, toggle organiser event creation, create private event
drafts for organisers, search people and athletes, inspect assigned staff entries,
return a submitted entry to its coach with an audited reason, and preview and
download a RingFlow workbook for all days or one event day.

Staff support currently shows assigned entries in an admin screen. Full role
previews, broader data correction tools, private storage for existing athlete
photos and the Vultr/Neon staging capacity rehearsal are still pending.
