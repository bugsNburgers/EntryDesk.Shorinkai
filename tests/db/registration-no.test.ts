import { afterAll, describe, expect, it } from "vitest";
import { addStudent, connect, seedBasics } from "./helpers";

const sql = connect();
afterAll(() => sql.end());

describe("students.registration_no (migration 002)", () => {
  it("stays unique across 9,999 → 10,000 → 10,001", async () => {
    const { dojo, parent } = await seedBasics(sql);
    await sql`SELECT setval('student_reg_seq', 9998)`;
    const a = await addStudent(sql, dojo.id, parent.id, { name: "A" });
    const b = await addStudent(sql, dojo.id, parent.id, { name: "B" });
    const c = await addStudent(sql, dojo.id, parent.id, { name: "C" });
    expect(a.registration_no).toMatch(/^SK\d{2}-9999$/);
    expect(b.registration_no).toMatch(/^SK\d{2}-10000$/);
    expect(c.registration_no).toMatch(/^SK\d{2}-10001$/);
    expect(new Set([a, b, c].map((s) => s.registration_no)).size).toBe(3);
  });

  it("still zero-pads small numbers", async () => {
    const { dojo, parent } = await seedBasics(sql);
    await sql`SELECT setval('student_reg_seq', 41)`;
    const s = await addStudent(sql, dojo.id, parent.id);
    expect(s.registration_no).toMatch(/^SK\d{2}-0042$/);
  });
});
