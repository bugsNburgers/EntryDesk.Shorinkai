# EntryDesk: Parent/Student Portal — Implementation Plan

> Agent instructions: read this whole file first. Then inspect the existing EntryDesk codebase (stack, DB, auth, roles, routes) BEFORE writing code. Extend what exists. Do not rewrite or replace working coach/organiser features. Work phase by phase (section 14), one PR/commit group per phase, migrations only (no manual DB edits), write tests listed in section 15. If the existing stack differs from the assumptions here, adapt the design to the stack and note the deviation in `DECISIONS.md`.

---

## 1. Goal

Today: coaches pre-feed athletes and push them into each tournament. Too much work for coaches.

New: **parents register their own kids** through a coach-specific link. Each parent gets one account (email + OTP, no password) that holds all their kids. They see status and download the ID card from their own page. Coaches only review. Organisers see everything in EntryDesk as before.

Success looks like:
- Coach shares ONE link once. No roster uploads, no per-athlete links.
- Parent registers a kid in under 3 minutes on a phone.
- Nobody is blocked at the start: anyone with the coach's link can sign up and register straight away. The coach then manages the entries that arrive (send to organiser or not) from one screen.
- Parent can always see exactly where their kid's entry stands, in plain words.
- 2000+ athletes per tournament on free-tier hosting without trouble.

Principles:
1. Mobile-first, big buttons, very simple English. Many users are not tech-savvy.
2. No passwords. Ever.
3. Never show internal codes in the UI. Plain words only (section 5).
4. The coach and organiser workload must go down, not up.
5. Everything auditable (who approved/rejected what, when).

---

## 2. Decisions already made

1. **Integrate into the existing EntryDesk.** Same database, same coach and organiser roles, same entries. Add a new role: **Parent (guardian)**. Do NOT build a separate app.
2. **Hosting-independent.** The domain will change. Never hardcode `entrydesk.shorinkai.in`. Use env var `APP_BASE_URL` for all generated links, emails, QR URLs.
3. **Flow:**
   1. Organiser accepts a coach/club into a tournament (already exists).
   2. Coach shares the club link. That is all the coach has to do up front.
   3. Anyone with the link can sign up with email OTP, add their kids, and register them immediately. No approval step before this.
   4. Entries show up on the coach's screen. The coach decides, entry by entry (or in bulk), whether to send it to the organiser.
   5. Organiser accepts. Kid gets ID card.
4. **Statuses use plain human words** (section 5). Internal DB values are never shown in UI, emails, or exports meant for humans.
5. **Per-tournament setting "Coach checks each entry"**: default ON. Entries wait for the coach, who sends them to the organiser (or not). If switched OFF, entries go straight to the organiser and the coach can still pull one back.
6. **No approval to join or register.** A kid is in the club the moment the parent joins through the link. The coach's control is over which entries get sent to the organiser, plus housekeeping afterwards (remove a kid, block a spam signup).

---

## 3. Roles

| Role | Can do |
|---|---|
| Parent | Sign in by email OTP. Add and edit own kids (until coach approves). Register own kids for tournaments. See status. Download ID card. |
| Coach (+ assistant coaches) | Everything existing, plus: review tournament entries and send them to the organiser (or not), see and share club link, see all kids in the club, remove a kid or block a spam signup, add a kid manually for a parent. |
| Organiser | Everything existing, plus: set tournament rules (fee, categories, deadlines, coach-check on/off), accept/reject entries, bulk actions, export, check-in scanning. |
| Volunteer (check-in) | Scan QR and mark arrived. Read only otherwise. (Phase 5) |

A person can hold more than one role under the same email (e.g. a coach who is also a parent). Support role switching if the existing auth allows it.

---

## 4. Data model

Adapt names to the existing schema. Assume Postgres. Use UUID primary keys, `created_at`, `updated_at` everywhere.

```
clubs                    (existing — add:)
  slug                   text unique, immutable once created (see 10.3)
  join_code              text unique, short random (e.g. 4 chars) used in the URL
  join_link_enabled      boolean default true
  welcome_note           text null   -- coach can add a line shown to parents

guardian_accounts        -- the people who log in (parents)
  id, email (unique, lowercase, trimmed), full_name null, phone null,
  email_verified_at, last_login_at, status (active / blocked)

athletes                 (existing — add:)
  guardian_account_id    -- who registered this kid (nullable for legacy rows)
  club_id
  full_name, date_of_birth, gender
  belt (enum), height_cm null, weight_kg null (declared, final at weigh-in)
  photo_url null
  school/city null
  dob_locked boolean     -- true once the first entry has been sent to the organiser
  membership_status      -- Joined / Removed (section 5.1)
  removed_by, removed_at, removed_reason null
  joined_via_link_id     -- which club link was used (to trace spam signups)
  legacy_claimed_from    null -- id of old coach-created record merged in

account_athletes         -- many-to-many so a kid can be seen by both parents
  guardian_account_id, athlete_id, relation (mother/father/guardian)

tournaments              (existing — add:)
  coach_checks_each_entry boolean
  age_cutoff_rule        -- 'on tournament day' | 'on 1 Jan of that year' (configurable)
  registration_opens_at, registration_closes_at (store UTC, display IST)
  fee_amount null, fee_enabled boolean
  max_events_per_athlete int null
  photo_required boolean

tournament_clubs         (existing coach acceptance — keep)
  tournament_id, club_id, status (waiting / accepted / not accepted)

events / categories      (existing or new)
  tournament_id, name (Kata / Kumite / Team Kata...), rules for age, gender, belt, weight

registrations            -- one per athlete per tournament
  id, tournament_id, athlete_id, club_id
  status                 -- see section 5
  submitted_at, coach_reviewed_by, coach_reviewed_at,
  org_reviewed_by, org_reviewed_at, status_reason text null
  declared_weight_kg, category_snapshot jsonb  -- age/weight computed at submit time
  id_card_number         -- generated on acceptance, unique, human-readable
  qr_token               -- random, unguessable, revocable
  checked_in_at null, checked_in_by null

registration_events      -- one row per event the athlete enters
  registration_id, event_id, category_id
  unique(registration_id, event_id)

payments                 -- Phase 4, optional
  registration_id, amount, method, reference, proof_url, status, verified_by

otp_challenges
  email, code_hash, expires_at, attempts, created_ip

audit_log
  actor_type, actor_id, action, entity_type, entity_id, before jsonb, after jsonb, created_at
```

Indexes: `(tournament_id, status)` on registrations, `(club_id, membership_status)` on athletes, `(guardian_account_id)` on account_athletes, unique `(athlete_id, tournament_id)` on registrations.

---

## 5. Statuses — plain words only

The "label" is what users see. The "meaning line" is shown under it so nobody has to guess. Internal DB keys can be anything simple but **must never be rendered**. Keep ONE central file mapping key → label → meaning → colour → next-step text, and use it everywhere (portal, emails, coach screens, exports).

### 5.1 Kid's place in the club (no approval needed)

| Label | Meaning line shown to parent | Colour |
|---|---|---|
| In {club} | Your child is added. You can register for tournaments now. | Green |
| Removed from club | This child is no longer in {club}. Please talk to your coach. | Grey |

### 5.2 Tournament entry

| Label | Meaning line | Colour |
|---|---|---|
| Not sent yet | You have started but not sent the entry. Tap Send to finish. | Grey |
| Waiting for coach | Your coach is checking the entry. | Yellow |
| Waiting for organiser | Your coach has checked it. The organiser will decide soon. | Yellow |
| Payment pending | Please pay {amount} to complete your entry. (Only if tournament has a fee.) | Orange |
| Please correct and send again | Something needs fixing: {reason}. Tap to edit and send again. | Orange |
| Accepted | Your child is in the tournament. Your ID card is ready. | Green |
| Coach did not send it | Your coach decided not to send this entry to the organiser. Reason: {reason}. Please talk to your coach. | Red |
| Not accepted | Sorry, this entry was not accepted by the organiser. Reason: {reason}. | Red |
| Withdrawn | This entry was withdrawn. | Grey |
| Tournament cancelled | This tournament was cancelled. | Grey |
| Arrived | Your child has checked in at the venue. | Blue |

Rules:
- Every status with a reason must have a reason text required from whoever sets it (coach/organiser). No empty rejections.
- Each status page shows a small timeline: "Sent on 12 Oct → Coach checked on 13 Oct → Accepted on 14 Oct".
- The "next step" for the parent is always a single obvious button (Edit, Send, Pay, Download ID card).

---

## 6. Flows

### 6.1 Coach: getting the link
1. Coach logs in. **Home page top banner (highlighted, impossible to miss):** "Your link for parents" + the link + two buttons: **Share on WhatsApp** and **Copy link**. Also **Show QR** (for printing on the dojo wall).
2. Share button builds the default message (section 8) and uses the Web Share API (`navigator.share`) on mobile. Fallback: `https://wa.me/?text=<encoded message>`, and a plain Copy button.
3. Coach can edit the message before sending (optional textbox). Default stays clean.
4. Coach sees counts: "Parents joined: 120 · Entries waiting for you: 37".
5. Link can be switched off (e.g. after the season) and regenerated if it leaks (10.3).

### 6.2 Parent: first time
1. Opens `APP_BASE_URL/join/{club-slug}-{join_code}` (e.g. `/join/rao-karate-x7k2`).
2. Page header shows clearly: **"You are registering under: Sensei Rao — Rao Karate Club, Bengaluru"** with the club logo if any. A small link: "Not your coach? Go back." Never a blank login.
3. Enter email → "We sent a 6-digit code to your email" → enter code. (Resend after 30 sec. Show "Check spam folder".)
4. If the email is new, a short form: parent name, phone (optional but encouraged).
5. **Add your child**: name, date of birth, gender, belt, photo (optional unless the tournament requires it). Photo is compressed in the browser to ~100–150 KB before upload.
6. **Add another child** button (very visible) because many parents have 2–3.
7. Done page: "Your child is added to {club}. Next, register for a tournament." Big button **Register for a tournament**. No waiting, no approval.

### 6.3 Parent: returning
1. Opens the generic sign-in `APP_BASE_URL/login` (also reachable from any club page via "Already registered? Sign in").
2. Email → OTP. Session remembered for 90 days on that device.
3. **"Whose page do you want to see?"** — big cards for each kid with name, club, and current tournament status. Tap one → that kid's page.
4. Kid page: details, current tournament entries with status + meaning line + timeline, ID card button when accepted, "Register for a tournament" for open tournaments.
5. "Add another child" always available. If the parent opens a DIFFERENT coach's link while signed in, the new kid joins that club.

### 6.4 Parent: registering for a tournament
1. Any kid in the club can register straight away. Nothing needs to be approved first.
2. List of open tournaments (only those where this kid's club has been accepted by the organiser). If the club isn't accepted yet: "Registration for your club has not opened yet."
3. Pick events. Category is auto-calculated from DOB, gender, belt, declared weight. Show it in words: "You will compete in: Kumite, Boys Under 12, 35 kg." Parent can't pick an ineligible category.
4. Review screen, then **Send entry**. Status becomes "Waiting for coach" (if coach check is on) or "Waiting for organiser".
5. Idempotent: double-tap or refresh must not create two entries.
6. Parent can edit or withdraw until the organiser decides. After "Accepted", changes need a request (see 10.7).

### 6.5 Coach: manage entries
- **Entries tab ("Waiting for you")**: table of entries with photo, name, DOB, belt, events/category, parent name/phone, tournament. Select all or pick some, then **Send to organiser**. Or **Send back to parent** (reason required, becomes "Please correct and send again"). Or **Don't send** (reason required, becomes "Coach did not send it"). Duplicate warnings shown inline (10.4). Coach can undo a decision until the organiser has decided.
- **All kids tab**: everyone who joined through the club link, with search. Housekeeping only, it never blocks parents: remove a kid from the club, **Remove and block** a spam signup, link to an existing record (10.5), merge duplicates.
- When coach check is OFF: entries go straight to the organiser. Coach sees them as read-only with a **Pull back** button.
- Coach can add a kid manually for a parent who can't do it (creates a kid with no guardian; later claimable, 10.5).

### 6.6 Organiser: review
- Existing registrations screen extended: filters (tournament, club, status, event, category), search, pagination (never load 2000 rows at once), bulk Accept, Reject with reason, Send back for correction.
- Counters per status. Export CSV/Excel (for RingFlow import) with human-readable status labels and category names.
- Tournament settings: fee, deadlines, cutoff rule, events, limits, coach-check toggle, photo required.
- Organiser decides on club/coach acceptance (existing). Rejecting a club later puts that club's entries into "Not accepted" with a reason and notifies the coach.

### 6.7 ID card
- Appears when status is **Accepted**. Download as PDF (A6) and PNG. Also shows on screen.
- Contents: photo, name, club, ID number, tournament name/date/venue, events + category, QR code, small line "Show this at the venue".
- QR encodes only a URL with the random `qr_token`, never personal data: `APP_BASE_URL/v/{qr_token}`. That page (public) shows name, photo, club, events, and a green "Valid" or red "Not valid" state. Nothing else.
- Generate client-side where possible (canvas / html-to-image / qrcode lib) to save server cost; the ID number and token are generated server-side on acceptance.
- If organiser later rejects/withdraws, the token is revoked and the card shows "Not valid".

### 6.8 Check-in (Phase 5)
- Volunteer opens the scanner page (PWA, works on phone camera). Scans QR → sees photo/name/category → **Mark arrived**.
- Cache the accepted list on device so scanning works with poor venue network; sync later. Manual search by name/ID number as fallback.
- Warn if already checked in.

---

## 7. Screens and routes (suggested; adapt to existing router)

Public / parent:
- `/join/{club-slug}-{code}` — club landing + sign in
- `/login` — generic sign in
- `/me` — kid picker
- `/me/kids/new`, `/me/kids/{id}`, `/me/kids/{id}/edit`
- `/me/kids/{id}/tournaments`, `/me/entries/{id}` (status + timeline + ID card)
- `/v/{qr_token}` — public ID verification

Coach: Home (link banner) · Entries waiting for you · All kids · All entries · Club settings (link on/off, regenerate, welcome note) · Share message editor.

Organiser: existing screens + Tournament settings + Entries (extended) + Export + Check-in.

Every screen: loading state, empty state with a helpful sentence, error state with a plain message and a retry button.

---

## 8. Default share message (coach taps Share)

Plain, short lines, no jargon. Replace `{...}` at send time.

```
Namaste 🙏
This is {coach_name} from {club_name}.

Please register your child for our karate tournaments using this link:
{link}

How it works:
1. Open the link and enter your email. You will get a 6-digit code. No password needed.
2. Add your child's details and photo. If you have more than one child, tap "Add another child".
3. Register your child for the tournament from the same page.
4. I will check the entry and send it to the organiser. You can see the status on the same page.

What the messages mean:
• Waiting for coach – I am checking the details.
• Waiting for organiser – I have checked it. The organiser will decide.
• Please correct and send again – something needs fixing. Open it and follow the note.
• Accepted – your child is in the tournament. 🎉
• Coach did not send it – please talk to me. The reason will be written there.
• Not accepted – the organiser did not accept it. The reason will be written there.

ID card: when your child is Accepted, open their page and tap "Download ID card". Please bring it (on phone or printed) to the tournament.

Next time, sign in at {login_link} with the same email and choose your child's name.

If you face any problem, call me: {coach_phone}
```

Support editing this template per club and a Hindi/Kannada variant later (keep strings in a translation file from day one).

---

## 9. Permissions (enforce in the database / API, not only the UI)

- Parent: read/write only athletes linked in `account_athletes`; read only their own registrations; cannot change `dob_locked` fields once the first entry has been sent to the organiser; cannot touch statuses except: send, withdraw, edit-and-resend.
- Coach: read/write only athletes and registrations of their own club(s); can remove kids from their club and set coach decisions on entries (send, send back, don't send); cannot set organiser decisions.
- Organiser: read all for own tournaments; set organiser decisions; cannot edit a parent's personal data except via explicit "send back for correction".
- Public: `/v/{token}` only, rate-limited, returns minimal fields.
- If using Supabase: implement with Row Level Security policies and test each with real user JWTs. Never use the service key in client code.
- All status changes go through server-side functions that validate the allowed transition (section 10.9) and write to `audit_log`.

---

## 10. Edge cases (implement and test every one)

### 10.1 Login and OTP
- OTP: 6 digits, expires in 10 min, max 5 wrong attempts then lock for 15 min. Store hashed. Single use.
- Rate limit: max N OTP emails per email per hour and per IP per hour. Show a friendly message, not an error code.
- Email typos (gmial.com): suggest the correct domain; ask to confirm email. Normalise: lowercase, trim.
- OTP email lands in spam or is delayed: "Resend" after 30 sec, and show "Check your spam folder" hint. Use a proper sender domain with SPF/DKIM.
- Email provider free-tier limits (many are ~100–300/day): only send OTP and key status emails. No marketing, no per-status spam. Add a queue with retry. Alert the admin when near the limit. **Do not** send status emails for every micro-step; the portal is the source of truth.
- Shared device: add a visible "Sign out" button. Session is 90 days, rolling, per device.
- Parent loses email access: the coach can trigger "change email" (coach verifies by phone). Log in audit.
- Two parents want access to the same kids: allow adding a second guardian account to a kid (invite by email) via `account_athletes`.
- A coach opens the parent link with their own email: allowed, no conflict (roles are separate).

### 10.2 Parents without email / low-tech
- Coach can add a kid manually (name, DOB, parent phone). The kid has no guardian account.
- Coach-generated **read-only status link** per kid (long random token, revocable) that the coach can send via WhatsApp. Shows status and the ID card only. Cannot edit.
- Later, when the parent does get an email, they can claim the kid (10.5).

### 10.3 Club link
- Link format uses a readable club slug plus a short random code. Readable so parents trust it; random so it can't be guessed or squatted.
- Slug is **immutable** after creation; if the club is renamed, the old link must still work (store slug history and redirect).
- Same coach name or club name for two clubs: slug collision handling by appending the code. Always display city.
- Link leaks and strangers sign up: allowed by design (no approval gate), but their entries only reach the organiser if the coach sends them. Add rate limits. The coach's All kids tab shows who joined and when, with a one-click **Remove and block**. Coach can **switch off** the link or **regenerate** it (old link shows "This link is no longer active. Please ask your coach for the new link.").
- Coach switches off the link: existing parents still log in normally; only new joins are blocked.
- The page must still show the club name when the link is off, plus the message above.

### 10.4 Duplicates
- Same kid added twice by two parents (father and mother separately): detect same club + normalised name + DOB. Show the coach "Possible duplicate" with a merge action; merging keeps one athlete and links both guardians.
- Same parent adds the same kid twice: block with "You already added this child."
- Names: Indian names vary in spelling and order. Use fuzzy matching only as a warning, never auto-merge.
- Unique `(athlete_id, tournament_id)` and `(registration_id, event_id)` in the DB.

### 10.5 Existing (legacy) athletes already in EntryDesk
- Coaches already pre-fed athletes. **Do not delete or duplicate them.**
- When a parent adds a kid whose club + name + DOB roughly matches a legacy athlete without a guardian: show the coach a **"Link to existing record"** option in the All kids tab and on the entry. On confirmation, the legacy row gets `guardian_account_id` and keeps its history; mark `legacy_claimed_from`.
- The old coach-push flow must continue to work during the pilot. Entries created either way end up in the same `registrations` table and statuses.

### 10.6 Club changes
- Kid moves to another club: parent opens the new coach's link and chooses "My child is already registered" to move the kid (no duplicate record); old coach is notified; past registrations stay with the old club for history.
- Kid in two clubs (rare): disallow for the same tournament; allow different clubs on different tournaments only if the organiser enables it. Default: one club at a time.
- Coach is removed or leaves: kids stay, club needs a new coach; organiser can reassign. Assistant coaches share approval rights.
- Club not accepted by organiser for a tournament: parents see "Registration for your club has not opened yet" and can't send entries.

### 10.7 After acceptance
- Parent wants to change something (weight, event): "Request change" button with a note; goes to the organiser as "Please correct and send again" only if the organiser approves reopening. Otherwise, changes are made at weigh-in.
- Withdrawal after acceptance: allowed until a configurable date; ID is revoked; organiser is notified; fee refund is the organiser's offline decision, just record it.
- Organiser rejects after accepting (error): allowed with a mandatory reason; token revoked; parent sees "Not accepted" with reason.
- ID card lost: parent can re-download anytime. Regeneration keeps the same ID number and token.

### 10.8 Eligibility and categories
- Age is computed with the tournament's rule (on tournament day or on 1 Jan). Store the result in `category_snapshot` at submit time, so later edits don't silently change it.
- Weight: parent gives a declared weight; **final weight is decided at weigh-in**. If the weigh-in puts the kid in a different category, the organiser can change the category; log it and show the parent the new category.
- Kid ages out between registration and tournament day: recompute at the cutoff and warn the organiser if the category changed.
- Belt rules per event (e.g. kata by belt, kumite by weight) are configured in tournament settings. No eligible category → show a clear message ("No category matches. Please contact your coach") and notify the coach.
- DOB, gender: editable until the first entry is sent to the organiser, then locked. After that, changing them needs coach or organiser approval and is logged (prevents age-category cheating).
- Max events per athlete and capacity limits per category: enforce at submit with a friendly message. Capacity race: use a DB transaction or constraint; show "Full" and optionally a waiting list.
- Team events (team kata): out of scope for the first release; design `registration_events` so it can be extended with `team_id` later. Note in `DECISIONS.md`.

### 10.9 Status transitions (enforce on the server)
Allowed:
- Kid: In club → Removed (by coach). A removed kid's open entries become Withdrawn.
- Entry: Not sent yet → Waiting for coach (or Waiting for organiser if coach check is off) → Waiting for organiser → Payment pending (if fee) → Accepted; Waiting for coach → Coach did not send it, and back to Waiting for coach if the coach undoes it; any pre-accepted state → Please correct and send again / Not accepted; Please correct → (parent edits) → back to Waiting for coach/organiser; any → Withdrawn; Accepted → Arrived; all → Tournament cancelled.
- Everything else is rejected with an error and no data change.
- Two people changing the same entry at once (coach and organiser): use optimistic concurrency (`updated_at` or version) and show "This changed just now, please refresh".

### 10.10 Deadlines and time
- Store UTC, display IST. Show the closing time prominently ("Closes 20 Oct, 6:00 PM").
- Registration closes: parents can no longer send; entries "Please correct and send again" can still be fixed only if the organiser enables a grace window.
- Organiser extends the deadline: takes effect immediately; no code redeploy.
- Tournament date passes: archive; read-only.

### 10.11 Payments (Phase 4, only if fee enabled)
- Gate "Accepted" behind payment, as other platforms do. Options: UPI + screenshot upload (organiser/coach verifies) first; Razorpay or similar later.
- Payment proof image: compress, size limit, virus/type check.
- Duplicate or fake proof: organiser marks "Payment not found" → status Payment pending with a note.
- Coach pays for the whole club: support a "club payment" (one payment, many entries) in a later phase; record it as one reference linked to multiple registrations.
- Refunds are recorded manually.

### 10.12 Photos and files
- Compress in the browser (max ~150 KB, ~600 px). Accept jpg/png/webp/heic; convert heic. Reject huge files politely.
- Parent without a photo: allowed unless the tournament requires it; the ID card shows a placeholder and organiser can mark it incomplete.
- Storage budget: free tiers are small (~1 GB). Do the math: 2000 × 150 KB ≈ 300 MB per tournament. Reuse the same photo across tournaments (stored on the kid, not on each entry).
- Photos are private: signed URLs, not public buckets. Only `/v/{token}` exposes the photo for a valid ID, small size.

### 10.13 Privacy and children's data
- These are minors' records. Collect only what's needed. No Aadhaar, no school ID numbers.
- India's data-protection law (DPDP Act 2023) has specific rules for children's data, including verifiable parental consent. Add a consent checkbox at kid creation ("I am the parent/guardian and I agree to share my child's details for tournament registration"), store timestamp and version of the text. **Get this checked by someone who knows the law before launch**; this plan is not legal advice.
- Provide "Delete my child's data" request (coach/organiser handles, logged). Anonymise old tournament records rather than leaving personal data forever.
- No kid data in URLs, logs, or analytics. QR contains only a random token.
- Don't show other people's kids anywhere. A parent must never see another parent's data. Test with two accounts.

### 10.14 Scale and free-tier limits
- Realistic load: a deadline-day spike of a few hundred people at once; reads dominate. Keep queries paginated and indexed. No N+1 queries on the coach/organiser lists.
- Database projects on free tiers may pause after inactivity. Add a keep-alive ping and a visible warning in the admin area; upgrade before a big event.
- Cache static assets. Keep bundle size small (many users on slow phones). Test on a low-end Android over 3G throttling.
- Bulk operations (accept 500 entries) must run in a single transaction or a background job with progress; never time out silently.
- Export of 2000+ rows streams or is generated in the background.

### 10.15 UX and language
- Plain English, short sentences. No jargon (no "authenticate", "token", "payload"). Keep all strings in one translation file so Hindi/Kannada can be added.
- Large touch targets, high contrast, works on small screens, no horizontal scroll. Works on Android Chrome and iOS Safari.
- Every error has: what happened, what to do next. Never show raw error messages.
- Don't make parents re-type data they already gave: prefill from the kid's profile.
- Keep forms short; save drafts as they go so a phone call doesn't lose their work.
- Confirm destructive actions (withdraw, remove) with a clear message.

### 10.16 Abuse and failure
- Bots spamming the join form: rate limits, CAPTCHA only if needed (Cloudflare Turnstile is free), OTP gate.
- Fake kids: coach confirmation is the main defence; organiser can bulk-reject; audit log shows who joined via which link.
- Email service down: show the OTP screen with "Having trouble? Ask your coach to help" and let the coach/admin send a one-time sign-in link.
- Coach clicks Confirm on the wrong kid: allow "Undo" for a short window and a way to move back to Waiting for coach.
- Organiser changes tournament rules after entries exist: show a warning listing affected entries and require a confirmation; recompute categories and flag changes.

---

## 11. Notifications

Email (and optionally WhatsApp links later). Keep them few:

| When | To | Content |
|---|---|---|
| Parent signs in | Parent | OTP code |
| Kid confirmed / not confirmed | Parent | New status label + meaning line + button |
| Entry accepted | Parent | Status + "Download ID card" button |
| Entry not accepted / needs correction | Parent | Label + reason + button |
| New kids waiting (digest, max once a day) | Coach | "37 kids are waiting for you" + button |
| Club accepted for tournament | Coach | "You can now share the link / parents can register" |
| Deadline in 2 days | Parent with unsent entries | Gentle reminder (optional) |

Rules: use the same labels as the app, never internal codes; one email per event; unsubscribe/disable option for reminders; no email for "Waiting for…" steps.

---

## 12. Security checklist

- OTP hashed, rate-limited, single use. Sessions are httpOnly, secure cookies.
- All authorization enforced server-side / with row-level rules, tested with real accounts of each role.
- Validate all inputs server-side (lengths, DOB range, enums, file types).
- QR tokens: 128-bit random, revocable, rate-limited lookup.
- No secrets in the frontend. Keys in env vars. `.env.example` provided.
- Audit log for every status change and every coach/organiser action on a kid.
- Backups: daily DB export to storage the owner controls. Test one restore.

---

## 13. Config and environment

```
APP_BASE_URL=            # used for every link, QR, email
EMAIL_PROVIDER_KEY=
EMAIL_FROM=
DATABASE_URL=
STORAGE_BUCKET=
OTP_TTL_MINUTES=10
OTP_MAX_ATTEMPTS=5
SESSION_DAYS=90
```

Moving the site to a new domain must need only a change to `APP_BASE_URL` and DNS. Old club links should keep working via redirect for at least one season.

---

## 14. Phases and acceptance criteria

**Phase 0 — Audit (no feature code)**
- Document the existing stack, schema, auth, roles, and how coaches push athletes today. Write `DECISIONS.md` with the integration plan and any deviations.
- Done when: owner confirms the plan matches the code.

**Phase 1 — Parent accounts and kids**
- Email OTP login, guardian accounts, `account_athletes`, club link + landing page showing coach/club, kid creation with photo, kid picker, coach "Kids waiting" bulk confirm/reject with reasons, duplicate warnings, legacy linking, status labels file.
- Done when: a parent can join via a coach link, add 2 kids with one email, sign out and back in, pick a kid, and see "Waiting for coach"; the coach confirms in bulk; the parent sees "Confirmed by coach". No parent can see another parent's kids (tested).

**Phase 2 — Tournament entries**
- Registration flow with auto category, edit/withdraw, coach check toggle, coach and organiser queues with filters/pagination/bulk actions, reasons, correction loop, deadlines, audit log, status timeline, emails for key events.
- Done when: an entry goes from Not sent yet → Accepted through both reviewers, and every rejected/correction path works; 2000 seeded entries load and filter quickly.

**Phase 3 — Coach home, sharing, ID card**
- Highlighted link banner on the coach home page, Share (WhatsApp/native share) with the default message, Copy, QR, link on/off/regenerate. ID card PDF/PNG with QR; public verification page; revocation.
- Done when: coach can share in two taps; a parent downloads a correct ID card; scanning the QR on another phone shows Valid; withdrawing shows Not valid.

**Phase 4 — Payments (only if the organiser needs it)**
- Fee setting, UPI proof upload, verification screen, Payment pending status, optional club payment.

**Phase 5 — Venue check-in**
- PWA scanner, offline cache, arrived marking, manual search, counts.

**Phase 6 — Hardening**
- Load test, mobile low-end test, backup/restore test, privacy/consent review, keep-alive ping, domain-move dry run.

---

## 15. Test plan

Automated:
- Status transition table: every allowed transition passes, every other fails.
- Permissions: parent A cannot read/write parent B's kids/entries; coach of club X cannot touch club Y; organiser cannot edit parent data directly.
- OTP: expiry, wrong attempts, rate limit, single use, resend.
- Duplicates: same kid twice by one parent, by two parents; legacy match offered.
- Category computation: both cutoff rules, boundary dates, weight boundaries, no eligible category.
- Idempotency: double submit creates one entry.
- Concurrency: coach and organiser act at once → one wins, the other sees a clear message.
- QR: valid, revoked, unknown token, rate limit.
- Link: active, disabled, regenerated, renamed club (old slug redirects).

Manual (on a real low-end Android phone, slow network):
- Full parent journey in under 3 minutes.
- Every screen in empty, loading, and error states.
- Share message arrives correctly on WhatsApp with a clickable link.
- Statuses show in plain words everywhere (portal, emails, coach screens, CSV export). Grep the UI and emails for raw status keys; there must be none.

---

## 16. Assumptions to confirm with the owner (agent: ask before building if unclear)

1. Coach-check default ON for pilot, OFF later — OK?
2. Is a fee/payment needed in the first tournament?
3. Cutoff rule for age: on tournament day or 1 January?
4. Are team events needed now?
5. Languages needed besides English?
6. Which email provider and sender domain will be used?
7. Is RingFlow still used for brackets (CSV export needed) or replaced later?
8. Who can approve a coach/club for a tournament today (organiser only, or federation too)?