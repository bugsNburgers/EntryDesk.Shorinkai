import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests: pure modules only (no database, no Next request context).
// DB-level tests live in tests/db (vitest.db.config.ts); browser tests in tests/e2e (Playwright).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
