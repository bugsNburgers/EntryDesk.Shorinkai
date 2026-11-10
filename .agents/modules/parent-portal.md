# Parent portal & join flow (verified 2026-11-09)

Code: `src/app/join/[slug]/*`, `src/app/athlete/**` (URL = folder), `src/components/parent/*`, `src/app/api/upload/photo`.
Legacy `/parent/*` URLs redirect (src/proxy.ts).

## URLs
| Public URL | File |
|---|---|
| `/join/<dojo.slug>` | `app/join/[slug]/page.tsx` + `join-page-client.tsx` (Google button + email-code fallback). Already-logged-in parents are redirected to `/athlete?joinedDojo=<slug>`; coaches to `/dashboard`. Disabled link → "Link has been disabled". |
| `/athlete` | `app/athlete/page.tsx` — athlete cards + latest entry status |
| `/athlete/new?dojo=<slug>` | `app/athlete/new` — add athlete (photo **required**, consent checkbox) |
| `/athlete/<id>` | `app/athlete/[id]` — profile, entries, edit (`edit-athlete-dialog`) |
| `/athlete/<id>/register` | `app/athlete/[id]/register` + `registration-form.tsx` — pick event, day, kata/kumite/team, weight → `submitParentEntry` (also used to resubmit after the coach asks for a correction) |
| `/athlete/entries/<id>` and `/id-card` | status timeline, withdraw, ID card |
| `/v/<qr_token>` | public check-in verification page |

## Flow & rules
- Joining needs **no coach approval**. The athlete belongs to the dojo whose slug is in the URL/cookie (`createChildAsParent` validates `join_link_enabled`).
- Athlete creation writes `students.parent_id = user.id`, consent timestamp/version, and an audit row (DPDP).
- Parent can edit an athlete any time while `membership_status='active'`. **Existing entries are not affected**: each entry keeps the snapshot it was
  submitted with (`entries.snap_*`); the edit dialog says so. `students.dob_locked` is unused.
- Withdraw: allowed until organiser approval and before the registration deadline; after approval the coach must do it (`coachWithdrawEntry`).
- Photos: client-compressed (`lib/image-compression.ts`), ≤200 KB, stored in Vercel Blob; DB keeps only the URL. In production a missing
  `BLOB_READ_WRITE_TOKEN` makes uploads fail (500) instead of storing a `data:` URI. Render photos with `SafeAvatar`.
- A parent with several children sees them all under one login; one email = one `users` row.

## Gotchas
- Registration form hydration: date labels must use `toLocaleDateString('en-IN',{timeZone:'UTC',…})` or the form re-renders on the client and an early click does a native GET submit.
- The error banner is at the top of a long form: it now scrolls into view on error.
- The DO/DON'T photo-guideline images are 480×480 JPEGs, 16–31 KB each, plain `<img>` with width/height, first one eager.
