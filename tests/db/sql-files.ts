// Applies schema.sql + migrations/NNN_*.sql to a database, statement by statement
// (CREATE INDEX CONCURRENTLY cannot run inside the implicit transaction of a multi-statement query).
import fs from "node:fs";
import path from "node:path";
import type postgres from "postgres";

const DB_DIR = path.resolve(process.cwd(), "src/lib/db");

/** Splits SQL on top-level semicolons, respecting quotes, $tag$ blocks and comments. */
export function splitSql(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let dollar: string | null = null;
  let quote: string | null = null;
  while (i < text.length) {
    const ch = text[i];
    const rest = text.slice(i);
    if (dollar) {
      if (rest.startsWith(dollar)) {
        cur += dollar;
        i += dollar.length;
        dollar = null;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }
    if (quote) {
      cur += ch;
      i++;
      if (ch === quote) quote = null;
      continue;
    }
    if (rest.startsWith("--")) {
      const nl = text.indexOf("\n", i);
      i = nl === -1 ? text.length : nl + 1;
      cur += "\n";
      continue;
    }
    if (rest.startsWith("/*")) {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    const tag = rest.match(/^\$[A-Za-z_]*\$/);
    if (tag) {
      dollar = tag[0];
      cur += dollar;
      i += dollar.length;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      i++;
      continue;
    }
    if (ch === ";") {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function migrationFiles(): string[] {
  const dir = path.join(DB_DIR, "migrations");
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

export async function applyAll(sql: postgres.Sql): Promise<void> {
  const files = [path.join(DB_DIR, "schema.sql"), ...migrationFiles()];
  for (const file of files) {
    for (const stmt of splitSql(fs.readFileSync(file, "utf8"))) {
      try {
        await sql.unsafe(stmt);
      } catch (err) {
        throw new Error(`${path.basename(file)}: ${(err as Error).message}\n--- statement ---\n${stmt.slice(0, 400)}`);
      }
    }
  }
}
