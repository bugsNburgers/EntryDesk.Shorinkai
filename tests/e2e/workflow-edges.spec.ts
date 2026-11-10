import { expect, test } from "@playwright/test";
import { db, seed, signInAs } from "./helpers";

test("expired links and unknown public QR codes expose no athlete data", async ({ request }) => {
  const join = await request.post("/api/auth/google-join", {
    data: { dojoSlug: "unknown-rehearsal-dojo", idToken: "invalid-rehearsal-token" },
  });
  expect(join.status()).toBe(403);
  expect(join.headers()["set-cookie"] ?? "").not.toContain("entrydesk_session=");
  const qr = await request.get("/v/00000000000000000000000000000000");
  expect(await qr.text()).toContain("This credential is unavailable or has been revoked.");
});

test("coach applications are approved and declined by the organiser", async ({ page, context, baseURL }) => {
  test.skip(test.info().project.name !== "desktop", "Creates independent retained fixtures");
  const sql = db();
  try {
    const [owner] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = 'organiser@e2e.local'`;
    const [event] = await sql<{ id: string }[]>`
      INSERT INTO events (organizer_id, title, event_type, start_date, end_date, is_public, is_registration_open)
      VALUES (${owner.id}, 'Approval Edge Tournament', 'tournament', '2027-06-15', '2027-06-15', TRUE, TRUE)
      RETURNING id
    `;
    await signInAs(context, baseURL!, "coach-tok");
    await page.goto("/dashboard/events");
    await page.getByRole("button", { name: "Request to Participate", exact: true }).filter({ visible: true }).first().click();
    await expect.poll(async () => (await sql`SELECT status FROM event_applications
      WHERE event_id = ${event.id} AND coach_id = ${seed().coachId}`)[0]?.status).toBe("pending");

    await sql`
      INSERT INTO event_applications (event_id, coach_id, status)
      SELECT ${event.id}, id, 'pending' FROM users WHERE email = 'badavatar@e2e.local'
    `;
    await signInAs(context, baseURL!, "org-tok");
    await page.goto(`/dashboard/events/${event.id}/approvals`);
    await page.getByRole("row").filter({ hasText: "Sensei Kenji" }).getByRole("button", { name: "Approve", exact: true }).click();
    await page.getByRole("row").filter({ hasText: "Coach Badhost" }).getByRole("button", { name: "Decline", exact: true }).click();
    await expect.poll(async () => (await sql`SELECT status FROM event_applications
      WHERE event_id = ${event.id} ORDER BY status`).map((application) => application.status)).toEqual(["approved", "rejected"]);
  } finally {
    await sql.end();
  }
});

test("coach sends a correction and admin returns an entry with an audit reason", async ({ page, context, baseURL }) => {
  test.skip(test.info().project.name !== "desktop", "Creates independent retained fixtures");
  const sql = db();
  const { eventId, athleteId, coachId, parentId } = seed();
  try {
    const [dojo] = await sql<{ id: string }[]>`SELECT dojo_id AS id FROM students WHERE id = ${athleteId}`;
    const students = await sql<{ id: string; name: string }[]>`
      INSERT INTO students (dojo_id, parent_id, name, gender, date_of_birth, rank, weight, photo_url)
      VALUES
        (${dojo.id}, ${parentId}, 'Edge Correction Athlete', 'female', '2015-06-20', 'green', 33, '/icons/add-athlete-128.svg'),
        (${dojo.id}, ${parentId}, 'Edge Override Athlete', 'female', '2015-06-20', 'green', 34, '/icons/add-athlete-128.svg')
      RETURNING id, name
    `;
    const [correction, override] = students;
    const entries = await sql<{ id: string; student_id: string }[]>`
      INSERT INTO entries (event_id, coach_id, student_id, status, generic_checked)
      VALUES (${eventId}, ${coachId}, ${correction.id}, 'pending_coach', FALSE),
             (${eventId}, ${coachId}, ${override.id}, 'submitted', TRUE)
      RETURNING id, student_id
    `;
    const correctionId = entries.find((entry) => entry.student_id === correction.id)!.id;
    const overrideId = entries.find((entry) => entry.student_id === override.id)!.id;

    await signInAs(context, baseURL!, "org-tok");
    await page.goto(`/dashboard/events/${eventId}?status=all`);
    await expect(page.getByText(override.name, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(correction.name, { exact: true })).toHaveCount(0);

    await signInAs(context, baseURL!, "coach-tok");
    await page.goto(`/dashboard/events/${eventId}/entries?status=pending_coach`);
    const row = page.getByRole("row").filter({ hasText: correction.name });
    await expect(row.getByRole("button", { name: "Send to organiser" })).toBeDisabled();
    await row.getByRole("button", { name: "Send back", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("textarea").fill("Confirm the competition weight");
    await dialog.getByRole("button", { name: "Send back", exact: true }).click();
    await expect.poll(async () => (await sql`SELECT status, coach_notes FROM entries WHERE id = ${correctionId}`)[0])
      .toMatchObject({ status: "correction_needed", coach_notes: "Confirm the competition weight" });

    await signInAs(context, baseURL!, "parent-tok");
    await page.goto(`/athlete/entries/${correctionId}`);
    await expect(page.getByText("Confirm the competition weight").first()).toBeVisible();
    await page.getByRole("link", { name: "Fix and send again" }).click();
    const tournament = page.getByRole("radio", { name: /E2E Open 2027/ });
    if (!(await tournament.isChecked())) await tournament.check();
    const changeWeight = page.getByRole("radio", { name: /No, change/ });
    if (await changeWeight.count()) await changeWeight.check();
    await page.locator("#weight").fill("34");
    await page.getByRole("button", { name: "Send to coach", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/athlete/entries/${correctionId}`));
    await expect.poll(async () => (await sql`
      SELECT status, declared_weight_kg::text AS weight FROM entries WHERE id = ${correctionId}
    `)[0]).toMatchObject({ status: "pending_coach", weight: "34" });

    await page.getByRole("button", { name: "Cancel this entry", exact: true }).click();
    await page.getByRole("button", { name: "No, keep it", exact: true }).click();
    expect((await sql`SELECT status FROM entries WHERE id = ${correctionId}`)[0].status).toBe("pending_coach");
    await page.getByRole("button", { name: "Cancel this entry", exact: true }).click();
    await page.getByPlaceholder("e.g. Not well, cannot come").fill("Family cannot attend");
    await page.getByRole("button", { name: "Yes, cancel the entry", exact: true }).click();
    await expect.poll(async () => (await sql`SELECT status FROM entries WHERE id = ${correctionId}`)[0]?.status).toBe("withdrawn");

    await signInAs(context, baseURL!, "admin-tok");
    await page.goto(`/admin/support?staff=${coachId}`);
    const returnForm = page.locator("form").filter({ has: page.locator(`input[name=entry_id][value="${overrideId}"]`) });
    await returnForm.getByLabel("Reason for returning entry").fill("Verify receipt again");
    await returnForm.getByRole("button", { name: "Return to coach as admin" }).click();
    await expect.poll(async () => (await sql`SELECT status, coach_notes FROM entries WHERE id = ${overrideId}`)[0])
      .toMatchObject({ status: "pending_coach", coach_notes: "Verify receipt again" });
    expect((await sql`SELECT details->>'reason' AS reason FROM audit_log
      WHERE entity_id = ${overrideId} AND action = 'entry.returned_to_coach'`)[0].reason).toBe("Verify receipt again");
  } finally {
    await sql.end();
  }
});

test("admin can create a closed draft for an organiser whose own creation is disabled", async ({ page, context, baseURL }) => {
  test.skip(test.info().project.name !== "desktop", "Creates a retained event draft");
  const sql = db();
  try {
    const [owner] = await sql<{ id: string; can_create_events: boolean }[]>`
      SELECT id, can_create_events FROM users WHERE email = 'organiser@e2e.local'
    `;
    expect(owner.can_create_events).toBe(false);
    await signInAs(context, baseURL!, "admin-tok");
    await page.goto("/admin");
    const form = page.locator("form").filter({ has: page.getByRole("heading", { name: "Create event", exact: true }) });
    await form.getByLabel("Organiser").selectOption(owner.id);
    await form.getByLabel("Title").fill("Admin Draft Edge Tournament");
    await form.getByLabel("Start date").fill("2027-06-16");
    await form.getByLabel("End date").fill("2027-06-15");
    await form.getByRole("button", { name: "Create event draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Could not create the event" })).toBeVisible();
    expect(await sql`SELECT id FROM events WHERE title = 'Admin Draft Edge Tournament'`).toHaveLength(0);
    await form.getByLabel("Organiser").selectOption(owner.id);
    await form.getByLabel("Title").fill("Admin Draft Edge Tournament");
    await form.getByLabel("Start date").fill("2027-06-16");
    await form.getByLabel("End date").fill("2027-06-17");
    await form.getByRole("button", { name: "Create event draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "The event draft is ready" })).toBeVisible();
    const [draft] = await sql<{ id: string; organizer_id: string; is_public: boolean; is_registration_open: boolean }[]>`
      SELECT id, organizer_id, is_public, is_registration_open FROM events WHERE title = 'Admin Draft Edge Tournament'
    `;
    expect(draft).toMatchObject({ organizer_id: owner.id, is_public: false, is_registration_open: false });
    expect(await sql`SELECT id FROM event_days WHERE event_id = ${draft.id}`).toHaveLength(2);
    expect(await sql`SELECT id FROM audit_log WHERE entity_id = ${draft.id} AND action = 'event.created'`).toHaveLength(1);

    await signInAs(context, baseURL!, "org-tok");
    await page.goto("/dashboard/events");
    await expect(page.getByText("Admin Draft Edge Tournament", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Event", exact: true })).toHaveCount(0);
  } finally {
    await sql.end();
  }
});

test("coach shares the dojo link and opens its QR preview", async ({ page, context, baseURL }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => { document.documentElement.dataset.rehearsalShare = data.text; },
    });
  });
  await signInAs(context, baseURL!, "coach-tok");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Send on WhatsApp", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-rehearsal-share", new RegExp(`/join/${seed().dojoSlug}`));
  await page.getByRole("button", { name: "Show QR", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("img", { name: /QR/i })).toBeVisible();
});
