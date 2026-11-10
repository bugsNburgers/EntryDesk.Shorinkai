import fs from "node:fs";
// Golden path (testing.md §4): parent registers → coach sends → organiser approves → ID card,
// plus the per-event snapshot and the RingFlow export. Runs once (desktop project): it changes data.
import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";
import { RINGFLOW_HEADERS } from "../../src/lib/export/ringflow";
import { db, seed, signInAs, watchErrors } from "./helpers";

test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "golden path mutates data; desktop project only");
});

let _s: ReturnType<typeof seed> | null = null;
const S = () => (_s ??= seed());
let entryId = "";

test("parent registers an athlete for the event", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, "parent-tok");
  const watch = watchErrors(page);
  await page.goto(`/athlete/${S().athleteId}/register?event=${S().eventId}`);
  await expect(page.getByText("E2E Open 2027").first()).toBeVisible();
  // pick the tournament if it is not preselected, then give the weight
  const tournament = page.getByRole("radio", { name: /E2E Open 2027/ });
  if (!(await tournament.isChecked())) await tournament.check();
  const changeWeight = page.getByRole("radio", { name: /No, change/ });
  if (await changeWeight.count()) await changeWeight.check();
  await page.locator("#weight").fill("32");
  await page.getByRole("button", { name: /Send to coach|Send entry/ }).click();
  await page.waitForURL(/\/athlete\/entries\//);
  entryId = page.url().split("/athlete/entries/")[1].split(/[?#/]/)[0];
  expect(watch.hydration()).toEqual([]);

  const sql = db();
  const [e] = await sql<{ status: string; snap_name: string; declared_weight_kg: string; label: string | null }[]>`
    SELECT status, snap_name, declared_weight_kg::text, category_snapshot->>'displayName' AS label FROM entries WHERE id = ${entryId}`;
  await sql.end();
  expect(e.status).toBe("pending_coach");
  expect(e.snap_name).toBe("Asha Rao");
  expect(Number(e.declared_weight_kg)).toBe(32);
  expect(e.label).toBe("Under 12 · Girls · -35 kg");
});

test("profile edit after submitting does not change the entry", async () => {
  const sql = db();
  await sql`UPDATE students SET weight = 45, date_of_birth = '2012-01-01', name = 'Asha Renamed' WHERE id = ${S().athleteId}`;
  await sql.end();
});

test("coach sends the entry to the organiser", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, "coach-tok");
  // The old queue URL now redirects to the event's entries page, filtered to "With coach".
  await page.goto("/dashboard/parent-entries");
  await page.waitForURL(new RegExp(`/dashboard/events/${S().eventId}/entries`));
  const row = page.locator("tr", { hasText: "Asha Rao" });
  await expect(row).toBeVisible();
  await expect(page.getByText("Asha Renamed")).toHaveCount(0);
  // Fees must be ticked "Paid" before the entry can be sent (desktop project = table row)
  await row.getByRole("checkbox", { name: "Paid" }).check();
  await row.getByRole("button", { name: "Send to organiser" }).click();
  const sql = db();
  await expect.poll(async () => (await sql`SELECT status FROM entries WHERE id = ${entryId}`)[0].status).toBe("submitted");
  await sql.end();
});

test("organiser approves; chest number and QR are issued; the list shows the snapshot", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, "org-tok");
  // /entries redirects to the event page, which is now the organiser's one place for entries
  await page.goto(`/dashboard/events/${S().eventId}/entries?status=submitted`);
  const row = page.locator("tr", { hasText: "Asha Rao" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Under 12 · Girls · -35 kg");
  // the organiser sees the coach's photo next to the coach name
  await expect(row.locator('img[alt="Sensei Kenji"]')).toBeVisible();
  // organiser can correct the submitted details (entries.snap_*) from the row
  await expect(row.getByRole("button", { name: "Fix details" })).toBeVisible();
  await row.getByRole("button", { name: "Accept", exact: true }).click();

  const sql = db();
  await expect
    .poll(async () => (await sql`SELECT status, chest_no, qr_token FROM entries WHERE id = ${entryId}`)[0])
    .toMatchObject({ status: "approved", chest_no: 1 });
  const [e] = await sql`SELECT qr_token FROM entries WHERE id = ${entryId}`;
  await sql.end();
  expect(e.qr_token).toBeTruthy();
});

test("admin previews and exports the event for RingFlow", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, "org-tok");
  await page.goto("/admin", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/);
  await signInAs(context, baseURL!, "admin-tok");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "EntryDesk admin" })).toBeVisible();
  await page.getByRole("button", { name: "Preview RingFlow roster" }).click();
  await expect(page.getByText(/1 accepted entries/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download workbook" }).click(),
  ]);
  const file = await download.path();
  const wb = XLSX.read(fs.readFileSync(file));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const header = (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][])[0];
  expect(header).toEqual([...RINGFLOW_HEADERS]);
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  expect(rows).toHaveLength(1);
  const sql = db();
  const [d] = await sql<{ day: string | null }[]>`
    SELECT ed.name AS day FROM entries e LEFT JOIN event_days ed ON ed.id = e.event_day_id WHERE e.id = ${entryId}`;
  await sql.end();
  expect(rows[0].day ?? "").toBe(d.day ?? "");
  expect(rows[0]).toMatchObject({
    Number: 1, Name: "Asha Rao", sex: "F", belt: "Green", age: 11, weight: 32, kata: "Yes", kumite: "Yes",
    School: "Kenji Karate Club", "School Code": "e2e001",
  });
});

test("parent sees Accepted and can open the ID card", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, "parent-tok");
  const watch = watchErrors(page);
  await page.goto("/athlete");
  await expect(page.getByText(/Accepted/i).first()).toBeVisible();
  const res = await page.goto(`/athlete/entries/${entryId}/id-card`);
  expect(res?.status()).toBe(200);
  await expect(page.getByText("Asha Rao").first()).toBeVisible();
  await expect(page.getByText("Asha Renamed")).toHaveCount(0);
  expect(watch.hydration()).toEqual([]);
});
