// Read-only checks run at desktop and 375 px: coach photo gate, avatar safety, OTP role guard,
// hydration and horizontal overflow on the pages parents see first.
import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { db, expectNoHorizontalScroll, seed, signInAs, watchErrors } from "./helpers";

let _s: ReturnType<typeof seed> | null = null;
const S = () => (_s ??= seed());

test("a coach without a profile photo is gated, and told why", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, "nophoto-tok");
  await page.goto("/dashboard");
  await expect(page.getByText("Upload Your Profile Photo")).toBeVisible();
  await expect(page.getByText(/Organisers see this photo when approving you/)).toBeVisible();
  await expect(page.locator('img[src="/images/guidelines/photo-good.jpg"]')).toBeVisible();
});

test("organiser approvals: coach photos shown, an unlisted avatar host does not crash the page", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, "org-tok");
  const watch = watchErrors(page);
  const res = await page.goto("/dashboard/approvals");
  expect(res?.status()).toBe(200);
  await expect(page.getByText("Coach Badhost").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/Unhandled Runtime Error|Invalid src prop/i)).toHaveCount(0);
  expect(watch.errors.filter((e) => /Invalid src prop|hostname .* is not configured/i.test(e))).toEqual([]);

  const approved = await page.goto(`/dashboard/events/${S().eventId}/approvals?status=approved`);
  expect(approved?.status()).toBe(200);
  await expect(page.locator(`img[alt="Sensei Kenji"]`).filter({ visible: true }).first()).toBeVisible();
});

test("email-code sign-in: parent gets a session, coach gets 403", async ({ request }) => {
  const sql = db();
  const code = "246810";
  const hash = await bcrypt.hash(code, 10);
  const newParent = `newparent-${Date.now()}-${test.info().project.name}@e2e.local`;
  await sql`INSERT INTO otp_codes (email, code_hash, expires_at) VALUES (${newParent}, ${hash}, NOW() + INTERVAL '10 minutes')`;
  await sql`INSERT INTO otp_codes (email, code_hash, expires_at) VALUES ('coach@e2e.local', ${hash}, NOW() + INTERVAL '10 minutes')`;
  await sql.end();

  const ok = await request.post("/api/auth/otp/verify", { data: { email: newParent, code } });
  expect(ok.status()).toBe(200);
  expect(ok.headers()["set-cookie"] ?? "").toContain("entrydesk_session=");

  const coach = await request.post("/api/auth/otp/verify", { data: { email: "coach@e2e.local", code } });
  expect(coach.status()).toBe(403);
  expect(coach.headers()["set-cookie"] ?? "").not.toContain("entrydesk_session=");
});

test("parent pages render without hydration errors or sideways scroll", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, "parent-tok");
  const watch = watchErrors(page);
  for (const url of [`/athlete/${S().athleteId}/register`, "/athlete", `/athlete/${S().athleteId}`]) {
    const res = await page.goto(url);
    expect(res?.status(), url).toBe(200);
    await page.waitForLoadState("networkidle");
    expect(await expectNoHorizontalScroll(page), `${url} overflows`).toBeLessThanOrEqual(1);
  }
  expect(watch.hydration()).toEqual([]);
});

test("the dojo join page renders on a phone", async ({ page, context }) => {
  await context.clearCookies();
  const res = await page.goto(`/join/${S().dojoSlug}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByText("Kenji Karate Club").first()).toBeVisible();
  expect(await expectNoHorizontalScroll(page)).toBeLessThanOrEqual(1);
});

test("legacy /parent URLs redirect to /athlete", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, "parent-tok");
  await page.goto(`/parent/children/${S().athleteId}`);
  await expect(page).toHaveURL(new RegExp(`/athlete/${S().athleteId}$`));
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/athlete$/);
});

test("split screens render: coach entries list and organiser entries list (with an entry)", async ({ page, context, baseURL }) => {
  // make sure the event has at least one entry regardless of test order
  const sql = db();
  const [c] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = 'coach@e2e.local'`;
  await sql`INSERT INTO entries (event_id, coach_id, student_id, status, participation_type)
            VALUES (${S().eventId}, ${c.id}, ${S().athleteId}, 'pending_coach', 'both')
            ON CONFLICT (student_id, event_id) DO NOTHING`;
  await sql.end();

  const watch = watchErrors(page);
  await signInAs(context, baseURL!, "coach-tok");
  let res = await page.goto(`/dashboard/events/${S().eventId}/entries`);
  expect(res?.status()).toBe(200);
  await expect(page.getByText("Asha Rao").filter({ visible: true }).first()).toBeVisible();

  await signInAs(context, baseURL!, "org-tok");
  res = await page.goto(`/dashboard/events/${S().eventId}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByText("E2E Open 2027").filter({ visible: true }).first()).toBeVisible();
  expect(watch.errors.filter((e) => /is not defined|Cannot read properties|is not a function/i.test(e))).toEqual([]);
});
