// Creates a throwaway database on the local Docker Postgres, applies schema + migrations,
// exposes its URL as TEST_DATABASE_URL (and DATABASE_URL for app modules), drops it at the end.
import postgres from "postgres";
import type { TestProject } from "vitest/node";
import { applyAll } from "./sql-files";

const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL || "postgresql://postgres:test@127.0.0.1:55432/postgres";

function assertLocal(url: string) {
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    throw new Error(`Refusing to run DB tests against non-local host "${host}". Use the Docker DB (testing.md).`);
  }
}

export default async function setup(project: TestProject) {
  assertLocal(ADMIN_URL);
  const dbName = `entrydesk_test_${Date.now()}`;
  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  await admin.unsafe(`CREATE DATABASE ${dbName}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${dbName}`;
  const testUrl = url.toString();

  const sql = postgres(testUrl, { max: 1, onnotice: () => {} });
  try {
    await applyAll(sql);
  } finally {
    await sql.end();
  }
  process.env.TEST_DATABASE_URL = testUrl;
  process.env.DATABASE_URL = testUrl;
  project.provide("testDatabaseUrl", testUrl);

  return async () => {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    await admin.end();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}
