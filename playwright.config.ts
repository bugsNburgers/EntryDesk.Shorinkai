import { defineConfig, devices } from "@playwright/test";

// E2E against a dev server on :3100 that talks to a throwaway LOCAL database
// (entrydesk_e2e on the Docker Postgres, recreated by tests/e2e/global-setup.ts).
// Never point this at Neon. Uses the installed Google Chrome (PW_CHANNEL=chromium to use
// Playwright's own build after `npx playwright install chromium`).
const PORT = Number(process.env.E2E_PORT || 3100);
const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL || "postgresql://postgres:test@127.0.0.1:55432/postgres";
const E2E_DB_URL = ADMIN_URL.replace(/\/[^/]*$/, "/entrydesk_e2e");
const channel = process.env.PW_CHANNEL || "chrome";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    channel: channel === "chromium" ? undefined : channel,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: channel === "chromium" ? undefined : channel } },
    {
      name: "mobile-375",
      use: { ...devices["Desktop Chrome"], channel: channel === "chromium" ? undefined : channel, viewport: { width: 375, height: 812 }, isMobile: false, hasTouch: true },
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      DATABASE_URL: E2E_DB_URL,
      NEXT_PUBLIC_BASE_URL: `http://localhost:${PORT}`,
      BLOB_READ_WRITE_TOKEN: "",
      RESEND_API_KEY: "",
      E2E: "1",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
