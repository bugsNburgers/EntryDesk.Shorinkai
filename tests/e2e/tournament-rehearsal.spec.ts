import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { db, signInAs } from "./helpers";

test("organiser provisioning, permission changes and tournament rehearsal", async ({ page, context, baseURL }) => {
  test.skip(test.info().project.name !== "desktop", "The rehearsal writes persistent fixtures");
  test.setTimeout(480_000);
  const sql = db();
  const email = "rehearsal.organiser@gmail.com";
  const title = "EntryDesk Tournament Rehearsal";

  try {
    await signInAs(context, baseURL!, "admin-tok");
    await page.goto("/admin");
    const createLogin = page.locator("form").filter({ has: page.getByRole("heading", { name: "Create an organiser or coach login" }) });
    await createLogin.getByLabel("Name", { exact: true }).fill("Rehearsal Organiser");
    await createLogin.getByLabel("Gmail address").fill(email);
    await createLogin.getByRole("button", { name: "Create login" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Login created" })).toBeVisible();

    const [organizer] = await sql<{ id: string; is_active: boolean; can_create_events: boolean }[]>`
      SELECT id, is_active, can_create_events FROM users WHERE email = ${email}
    `;
    expect(organizer).toMatchObject({ is_active: true, can_create_events: false });
    // Google is external. Seed a local session for the exact Gmail account created by the UI.
    await sql`INSERT INTO sessions (user_id, session_token, expires_at)
      VALUES (${organizer.id}, encode(digest('rehearsal-org-tok', 'sha256'), 'hex'), NOW() + interval '7 days')`;

    const org = await context.browser()!.newContext({ baseURL });
    try {
      await signInAs(org, baseURL!, "rehearsal-org-tok");
      const orgPage = await org.newPage();
      await orgPage.goto("/dashboard/events");
      await expect(orgPage.getByRole("heading", { name: "Upload Your Profile Photo" })).toBeVisible();
      const invalidPhoto = await org.request.post("/api/upload/profile-photo", {
        multipart: { file: { name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("invalid") } },
      });
      expect(invalidPhoto.status()).toBe(400);
      const validPhoto = await org.request.post("/api/upload/profile-photo", {
        multipart: { file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: readFileSync("public/images/guidelines/photo-good.jpg") } },
      });
      expect(validPhoto.status()).toBe(200);
      await orgPage.reload();
      await expect(orgPage.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
      await expect(orgPage.getByRole("button", { name: "Create Event", exact: true })).toHaveCount(0);

      const toggle = (name: string) => page.locator("form").filter({ has: page.getByRole("button", { name, exact: true }) }).filter({
        has: page.locator(`input[name=id][value="${organizer.id}"]`),
      });
      const setPermission = async (name: string) => {
        const form = toggle(name);
        await form.getByLabel("Reason for access change").fill("Tournament rehearsal");
        await form.getByRole("button", { name, exact: true }).click();
      };
      await setPermission("Enable event creation");
      await expect(toggle("Disable event creation")).toBeVisible();
      await orgPage.reload();
      await orgPage.getByRole("button", { name: "Create Event", exact: true }).first().click();
      const dialog = orgPage.getByRole("dialog");
      await dialog.getByLabel("Title", { exact: true }).fill(title);
      await dialog.getByLabel("Type", { exact: true }).click();
      await orgPage.getByRole("option", { name: "Tournament", exact: true }).click();
      await dialog.getByLabel("Level", { exact: true }).click();
      await orgPage.getByRole("option", { name: "District Level", exact: true }).click();
      await dialog.getByLabel("Start Date").fill("2027-04-18");
      await dialog.getByLabel("End Date").fill("2027-04-19");
      await dialog.getByLabel("Registration Closes").fill("2027-04-17");
      await dialog.getByRole("button", { name: "Create Event", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(orgPage.getByText(title, { exact: true })).toBeVisible();
      const [event] = await sql<{ id: string }[]>`SELECT id FROM events WHERE title = ${title} AND organizer_id = ${organizer.id}`;
      expect(event.id).toBeTruthy();
      expect(await sql`SELECT id FROM event_days WHERE event_id = ${event.id}`).toHaveLength(2);

      // Keep a stale creation dialog open. Revocation must also reject its server submission.
      await orgPage.getByRole("button", { name: "Create Event", exact: true }).first().click();
      await dialog.getByLabel("Title", { exact: true }).fill("Blocked rehearsal event");
      await dialog.getByLabel("Start Date").fill("2027-04-20");
      await dialog.getByLabel("End Date").fill("2027-04-20");
      await dialog.getByLabel("Registration Closes").fill("2027-04-19");
      await setPermission("Disable event creation");
      await expect(toggle("Enable event creation")).toBeVisible();
      orgPage.once("dialog", (alert) => alert.dismiss());
      const blockedResponse = orgPage.waitForResponse((response) => response.request().method() === "POST" &&
        Boolean(response.request().headers()["next-action"]));
      await dialog.getByRole("button", { name: "Create Event", exact: true }).click();
      await blockedResponse;
      await expect(dialog).toBeVisible();
      expect(await sql`SELECT id FROM events WHERE title = 'Blocked rehearsal event'`).toHaveLength(0);
      await orgPage.reload();
      await expect(orgPage.getByText(title, { exact: true })).toBeVisible();
      await expect(orgPage.getByRole("button", { name: "Create Event", exact: true })).toHaveCount(0);
      expect(await sql`SELECT id FROM sessions WHERE user_id = ${organizer.id}`).toHaveLength(1);
      await setPermission("Enable event creation");
      await expect(toggle("Disable event creation")).toBeVisible();
      await orgPage.reload();
      await expect(orgPage.getByRole("button", { name: "Create Event", exact: true }).first()).toBeVisible();

      const started = performance.now();
      await sql`
        INSERT INTO users (email, full_name, role, avatar_url)
        SELECT 'coach' || n || '@rehearsal.test', 'Rehearsal Coach ' || n, 'coach', '/icons/add-athlete-128.svg'
        FROM generate_series(1, 50) n
      `;
      await sql`
        INSERT INTO dojos (coach_id, name, slug, join_code)
        SELECT u.id, 'Rehearsal Dojo ' || n || '-' || d, 'rehearsal-dojo-' || n || '-' || d,
          'r' || lpad((3*(n-1)+d)::text, 5, '0')
        FROM generate_series(1, 50) n CROSS JOIN generate_series(1, 3) d
        JOIN users u ON u.email = 'coach' || n || '@rehearsal.test'
      `;
      await sql`
        INSERT INTO students (dojo_id, name, gender, date_of_birth, rank, weight, photo_url)
        SELECT d.id, 'Rehearsal Athlete ' || d.join_code || '-' || n,
          CASE WHEN n % 2 = 0 THEN 'female' ELSE 'male' END, DATE '2014-06-15', 'green', 35,
          '/icons/add-athlete-128.svg'
        FROM dojos d CROSS JOIN generate_series(1, 20) n WHERE d.slug LIKE 'rehearsal-dojo-%'
      `;
      await sql`
        INSERT INTO event_applications (event_id, coach_id, status)
        SELECT ${event.id}, id, 'approved' FROM users WHERE email LIKE 'coach%@rehearsal.test'
      `;
      await sql`
        INSERT INTO entries (event_id, coach_id, student_id, event_day_id, participation_type, status, declared_weight_kg)
        SELECT ${event.id}, d.coach_id, s.id, ed.id, 'both', 'pending_coach', s.weight
        FROM students s JOIN dojos d ON d.id = s.dojo_id
        JOIN event_days ed ON ed.event_id = ${event.id} AND ed.date =
          CASE WHEN s.gender = 'female' THEN DATE '2027-04-18' ELSE DATE '2027-04-19' END
        WHERE d.slug LIKE 'rehearsal-dojo-%'
      `;
      const [scale] = await sql`
        SELECT COUNT(*)::int AS athletes, COUNT(DISTINCT e.coach_id)::int AS coaches,
          COUNT(DISTINCT s.dojo_id)::int AS dojos FROM entries e JOIN students s ON s.id = e.student_id WHERE e.event_id = ${event.id}
      `;
      expect(scale).toEqual({ athletes: 3000, coaches: 50, dojos: 150 });
      console.log(`Seeded rehearsal in ${Math.round(performance.now() - started)} ms, event ${event.id}`);

      // Registrations are seeded at scale. All 50 coaches use the app to mark
      // their 60 entries paid and send them, in groups of four browser sessions.
      const coaches = await sql<{ id: string; email: string }[]>`
        SELECT id, email FROM users WHERE email LIKE 'coach%@rehearsal.test' ORDER BY email
      `;
      await sql`
        INSERT INTO sessions (user_id, session_token, expires_at)
        SELECT id, encode(digest(email, 'sha256'), 'hex'), NOW() + interval '7 days'
        FROM users WHERE email LIKE 'coach%@rehearsal.test'
      `;
      const coachStart = performance.now();
      const runCoach = async (coach: { id: string; email: string }) => {
        const coachContext = await context.browser()!.newContext({ baseURL });
        try {
          await signInAs(coachContext, baseURL!, coach.email);
          const coachPage = await coachContext.newPage();
          await coachPage.goto(`/dashboard/events/${event.id}/entries?status=pending_coach`);
          await expect(coachPage.getByRole("button", { name: "Mark entries as paid to send them" }).filter({ visible: true })).toBeDisabled();
          await coachPage.getByRole("button", { name: "Mark all as paid", exact: true }).filter({ visible: true }).click();
          await expect.poll(async () => (await sql`
            SELECT count(*)::int AS n FROM entries WHERE event_id = ${event.id} AND coach_id = ${coach.id} AND generic_checked
          `)[0].n).toBe(60);
          await coachPage.getByRole("button", { name: "Send all 60 paid to organiser", exact: true }).filter({ visible: true }).click();
          await expect.poll(async () => (await sql`
            SELECT count(*)::int AS n FROM entries WHERE event_id = ${event.id} AND coach_id = ${coach.id} AND status = 'submitted'
          `)[0].n).toBe(60);
        } finally {
          await coachContext.close();
        }
      };
      for (let i = 0; i < coaches.length; i += 4) {
        const results = await Promise.allSettled(coaches.slice(i, i + 4).map(runCoach));
        const failed = results.find((result) => result.status === "rejected");
        if (failed?.status === "rejected") throw failed.reason;
      }
      console.log(`50 coaches forwarded 3000 entries in ${Math.round(performance.now() - coachStart)} ms`);
      await orgPage.goto(`/dashboard/events/${event.id}/entries?status=submitted`);
      const row = orgPage.locator("tr").filter({ hasText: /Rehearsal Athlete/ }).first();
      await row.getByRole("button", { name: "Don't accept", exact: true }).click();
      await orgPage.getByPlaceholder("Why? The coach and parent will see this.").fill("Rehearsal eligibility rejection");
      await orgPage.getByRole("dialog").getByRole("button", { name: "Don't accept", exact: true }).click();
      await expect.poll(async () => (await sql`SELECT count(*)::int AS n FROM entries WHERE event_id = ${event.id}
        AND status = 'rejected' AND rejection_reason = 'Rehearsal eligibility rejection'`)[0].n).toBe(1);
      const approvalStart = performance.now();
      await orgPage.getByRole("button", { name: "Accept all 2999", exact: true }).filter({ visible: true }).click();
      await expect.poll(async () => (await sql`SELECT count(*)::int AS n FROM entries WHERE event_id = ${event.id} AND status = 'approved'`)[0].n,
        { timeout: 60_000 }).toBe(2999);
      console.log(`Browser bulk acceptance observed in ${Math.round(performance.now() - approvalStart)} ms`);
      const [checks] = await sql`
        SELECT COUNT(*)::int AS accepted, COUNT(DISTINCT chest_no)::int AS unique_chest_numbers,
          COUNT(DISTINCT qr_token)::int AS unique_qr_tokens FROM entries WHERE event_id = ${event.id} AND status = 'approved'
      `;
      expect(checks).toEqual({ accepted: 2999, unique_chest_numbers: 2999, unique_qr_tokens: 2999 });

      const [pass] = await sql<{ id: string; qr_token: string }[]>`
        SELECT id, qr_token FROM entries WHERE event_id = ${event.id} AND status = 'approved' LIMIT 1
      `;
      const unrelatedOrganizer = await context.browser()!.newContext({ baseURL });
      try {
        await signInAs(unrelatedOrganizer, baseURL!, "org-tok");
        expect((await unrelatedOrganizer.request.get(`/api/id-card/${pass.id}`)).status()).toBe(403);
      } finally {
        await unrelatedOrganizer.close();
      }
      expect((await org.request.get(`/api/id-card/${pass.id}`)).status()).toBe(200);
      await orgPage.goto(`/v/${pass.qr_token}`);
      await expect(orgPage.getByText("Valid Entry", { exact: true })).toBeVisible();
      await expect(orgPage.getByText(/Rehearsal Athlete/)).toHaveCount(0);

      await page.goto(`/admin?q=${encodeURIComponent(title)}`);
      await page.getByRole("combobox", { name: "RingFlow event day" }).selectOption({ label: "Day 1" });
      await page.getByRole("button", { name: "Preview RingFlow roster" }).click();
      await expect(page.getByRole("status").filter({ hasText: /(?:1499|1500) accepted entries/ })).toBeVisible();
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download workbook" }).click();
      expect((await download).suggestedFilename()).toBe("RingFlow-roster.xlsx");
    } finally {
      await org.close();
    }
  } finally {
    await sql.end();
  }
});
