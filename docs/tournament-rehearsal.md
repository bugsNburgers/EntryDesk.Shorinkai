# EntryDesk tournament rehearsal

09/11/2026. Synthetic data on a local Docker Postgres 16 instance. The app ran
under Next.js development mode and Chrome drove the role-specific screens.

## Retained tournament

| Item | Value |
| --- | --- |
| Container | `entrydesk-tournament-pg` |
| Named volume | `entrydesk-tournament-data` |
| Database | `entrydesk_e2e_1794240394056` |
| Event | EntryDesk Tournament Rehearsal |
| Event ID | `387e95a5-e350-4618-b907-b31261e5129b` |
| Synthetic owner | `rehearsal.organiser@gmail.com` |
| Roster | 3,000 entries, 50 coaches, 150 dojos |
| Final decisions | 2,999 accepted, 1 rejected with a reason |
| Unique credentials | 2,999 chest numbers and 2,999 QR tokens |

I restarted the Docker container and queried the same database. The organiser
email, account state, event ownership, roster and outcomes remained intact.
The event audit contains 3,000 coach forwards, 2,999 acceptances and one
rejection. Earlier rehearsal and database test runs are also retained.

## Checks

- Admin provisions the Gmail account. The organiser can open Events with
  creation disabled and sees the mandatory profile photo step. Invalid file
  type is rejected and a valid JPEG is accepted.
- Admin enables creation. The organiser creates the tournament and its two
  days. Admin disables creation while an organiser form is open. Submitting
  the old form creates no event. The same session still sees the original
  event. Re-enabling restores the Create Event control.
- The small golden path registers a parent entry in the browser, preserves the
  entry snapshot after a profile change, marks Paid, forwards, accepts and
  opens the ID card. Admin-only RingFlow access and workbook content are
  checked in the same path.
- The scale run seeds registrations and coach approvals. All 50 coaches use
  their real app screens to mark 60 entries paid each and send them. The
  organiser rejects one with a reason and bulk-accepts 2,999. An unrelated
  organiser receives HTTP 403 from the ID card endpoint. The owner can read
  it. The public QR shows validity and leaves out the athlete name. Admin
  previews and downloads the Day 1 RingFlow workbook.
- The local browser run took 255 seconds for coach steps in groups of four
  sessions. Browser bulk acceptance took 5.9 seconds. The organiser page now
  renders 50 roster entries at a time while bulk actions still cover all
  eligible entries.

- Additional browser checks passed for coach application approval and decline,
  a coach correction and parent resubmission, withdrawal confirmation and
  cancellation, an audited admin return to coach, rejection of invalid event
  dates, a valid closed admin draft, expired dojo links, unknown QR codes,
  the dojo QR preview, and the outbound share text on desktop and mobile.
- Passed 31 unit tests, 16 database tests and 28 browser checks across the
  tournament and edge runs. The updated correction and withdrawal check was
  rerun separately and passed.

## Limits

The scale run seeds parent registrations and coach approvals in PostgreSQL.
It uses test sessions in place of live Google OAuth. This is a workflow
rehearsal with up to four parallel coach sessions. It does not measure a
deadline rush on Vultr, Neon or Blob, or cover every button and every input.
Actual WhatsApp delivery, live OAuth, all printing and spreadsheet import
variants, destructive actions, and a full mobile tournament remain outside
the automated coverage.

See [.agents/rules/testing.md](../.agents/rules/testing.md) for the reproducible
commands. Each run creates a fresh database and retains it.
