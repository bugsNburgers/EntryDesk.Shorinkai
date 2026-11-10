import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import type { BrowserContext, Page } from "@playwright/test";

export type Seed = { eventId: string; athleteId: string; dojoSlug: string; parentId: string; coachId: string };

export function seed(): Seed {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "tests/e2e/.seed.json"), "utf8"));
}

const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL || "postgresql://postgres:test@127.0.0.1:55432/postgres";
export const db = () => postgres(ADMIN_URL.replace(/\/[^/]*$/, `/${process.env.ENTRYDESK_E2E_DATABASE}`), { max: 1, onnotice: () => {} });

export async function signInAs(context: BrowserContext, baseURL: string, token: string) {
  await context.clearCookies();
  await context.addCookies([{ name: "entrydesk_session", value: token, url: baseURL }]);
}

/** Collects console errors and page errors (incl. React hydration mismatches). */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return {
    errors,
    hydration: () => errors.filter((e) => /hydrat|did not match|server rendered/i.test(e)),
  };
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  return overflow;
}
