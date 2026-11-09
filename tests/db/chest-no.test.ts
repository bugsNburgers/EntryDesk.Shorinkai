import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { addStudent, connect, seedBasics, testDbUrl } from "./helpers";

const sql = connect();
afterAll(() => sql.end());

async function submittedEntries(n: number) {
  const { dojo, parent, coach, event } = await seedBasics(sql);
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const s = await addStudent(sql, dojo.id, parent.id, { name: `Athlete ${i}` });
    const [e] = await sql<{ id: string }[]>`
      INSERT INTO entries (event_id, coach_id, student_id, status) VALUES (${event.id}, ${coach.id}, ${s.id}, 'submitted') RETURNING id`;
    ids.push(e.id);
  }
  return { event, ids };
}

describe("chest numbers (migration 004)", () => {
  it("20 approvals from 4 concurrent connections get 20 distinct numbers", async () => {
    const { event, ids } = await submittedEntries(20);
    const pools = Array.from({ length: 4 }, () => postgres(testDbUrl(), { max: 1, onnotice: () => {} }));
    try {
      // Each connection approves its 5 entries one by one, each in its own transaction,
      // holding the transaction open briefly so the connections overlap.
      await Promise.all(
        pools.map((p, k) =>
          (async () => {
            for (const id of ids.slice(k * 5, k * 5 + 5)) {
              await p.begin(async (tx) => {
                await tx`UPDATE entries SET status = 'approved' WHERE id = ${id}`;
                await tx`SELECT pg_sleep(0.01)`;
              });
            }
          })()
        )
      );
    } finally {
      await Promise.all(pools.map((p) => p.end()));
    }
    const rows = await sql<{ chest_no: number }[]>`SELECT chest_no FROM entries WHERE event_id = ${event.id} ORDER BY chest_no`;
    expect(rows.map((r) => r.chest_no)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("a bulk approve in one statement numbers 1..n", async () => {
    const { event, ids } = await submittedEntries(10);
    await sql`UPDATE entries SET status = 'approved' WHERE id = ANY(${ids}::uuid[])`;
    const rows = await sql<{ chest_no: number }[]>`SELECT chest_no FROM entries WHERE event_id = ${event.id} ORDER BY chest_no`;
    expect(rows.map((r) => r.chest_no)).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
  });

  it("a manual duplicate is refused with unique_violation on idx_entries_event_chest", async () => {
    const { ids } = await submittedEntries(2);
    await sql`UPDATE entries SET status = 'approved' WHERE id = ANY(${ids}::uuid[])`;
    const err = await sql`UPDATE entries SET chest_no = 1 WHERE id = ${ids[1]} AND chest_no <> 1`.catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("23505");
    expect(err.constraint_name).toBe("idx_entries_event_chest");
  });

  it("numbers are not reassigned: a rejected entry keeps its number and re-approval reuses it", async () => {
    const { event, ids } = await submittedEntries(3);
    await sql`UPDATE entries SET status = 'approved' WHERE id = ${ids[0]}`;
    await sql`UPDATE entries SET status = 'rejected' WHERE id = ${ids[0]}`;
    await sql`UPDATE entries SET status = 'approved' WHERE id = ${ids[1]}`;
    await sql`UPDATE entries SET status = 'approved' WHERE id = ${ids[0]}`;
    const rows = await sql<{ id: string; chest_no: number }[]>`
      SELECT id, chest_no FROM entries WHERE event_id = ${event.id} AND chest_no IS NOT NULL`;
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.chest_no]));
    expect(byId[ids[0]]).toBe(1);
    expect(byId[ids[1]]).toBe(2);
  });
});
