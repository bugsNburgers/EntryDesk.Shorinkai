import path from "node:path";
import { defineConfig } from "vitest/config";

// DB-level tests against the LOCAL Docker Postgres (never Neon). Each run creates a fresh
// database, applies schema.sql + every migration, and drops it afterwards.
// TEST_DATABASE_ADMIN_URL defaults to postgresql://postgres:test@127.0.0.1:55432/postgres
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/db/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
