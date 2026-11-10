import { afterAll, describe, expect, it } from "vitest";
import { addStudent, connect, seedBasics } from "./helpers";

const sql = connect();
afterAll(() => sql.end());

type View = { name: string; dob: string; rank: string; weight: string; gender: string };
const view = async (entryId: string) =>
  (
    await sql<View[]>`
      SELECT COALESCE(e.snap_name, s.name) AS name,
             COALESCE(e.snap_dob, s.date_of_birth)::text AS dob,
             COALESCE(e.snap_rank, s.rank) AS rank,
             COALESCE(e.declared_weight_kg, s.weight)::text AS weight,
             COALESCE(e.snap_gender, s.gender) AS gender
      FROM entries e JOIN students s ON s.id = e.student_id WHERE e.id = ${entryId}`
  )[0];

describe("per-event entry snapshot (migration 003)", () => {
  it("profile edits after submission do not change the entry; a later entry gets the new values", async () => {
    const { dojo, parent, coach, event, organizer } = await seedBasics(sql);
    const s = await addStudent(sql, dojo.id, parent.id, { dob: "2015-06-20", weight: 31.5, rank: "green", name: "Asha Rao" });
    const [e1] = await sql<{ id: string }[]>`
      INSERT INTO entries (event_id, coach_id, student_id, status)
      VALUES (${event.id}, ${coach.id}, ${s.id}, 'pending_coach') RETURNING id`;

    await sql`UPDATE students SET date_of_birth = '2014-01-01', weight = 40, rank = 'blue', name = 'Asha Rao-Iyer' WHERE id = ${s.id}`;
    expect(await view(e1.id)).toMatchObject({ name: "Asha Rao", dob: "2015-06-20", rank: "green", weight: "31.5" });

    // forwarding and approving keep the snapshot
    await sql`UPDATE entries SET status = 'submitted' WHERE id = ${e1.id}`;
    await sql`UPDATE entries SET status = 'approved' WHERE id = ${e1.id}`;
    expect(await view(e1.id)).toMatchObject({ name: "Asha Rao", dob: "2015-06-20", rank: "green", weight: "31.5" });

    const [event2] = await sql<{ id: string }[]>`
      INSERT INTO events (organizer_id, title, event_type, start_date, end_date, location)
      VALUES (${organizer.id}, 'Second Cup', 'tournament', '2027-05-01', '2027-05-01', 'Pune') RETURNING id`;
    const [e2] = await sql<{ id: string }[]>`
      INSERT INTO entries (event_id, coach_id, student_id, status)
      VALUES (${event2.id}, ${coach.id}, ${s.id}, 'pending_coach') RETURNING id`;
    expect(await view(e2.id)).toMatchObject({ name: "Asha Rao-Iyer", dob: "2014-01-01", rank: "blue", weight: "40" });
  });

  it("re-registration after withdraw and draft -> submitted take a fresh snapshot", async () => {
    const { dojo, parent, coach, event } = await seedBasics(sql);
    const s = await addStudent(sql, dojo.id, parent.id, { weight: 30 });
    const [e] = await sql<{ id: string }[]>`
      INSERT INTO entries (event_id, coach_id, student_id, status)
      VALUES (${event.id}, ${coach.id}, ${s.id}, 'pending_coach') RETURNING id`;
    await sql`UPDATE entries SET status = 'withdrawn' WHERE id = ${e.id}`;
    await sql`UPDATE students SET weight = 33, rank = 'blue' WHERE id = ${s.id}`;
    await sql`UPDATE entries SET status = 'pending_coach' WHERE id = ${e.id}`;
    expect(await view(e.id)).toMatchObject({ weight: "33", rank: "blue" });

    const s2 = await addStudent(sql, dojo.id, null, { weight: 25, name: "Coach Kid" });
    const [d] = await sql<{ id: string }[]>`
      INSERT INTO entries (event_id, coach_id, student_id, status)
      VALUES (${event.id}, ${coach.id}, ${s2.id}, 'draft') RETURNING id`;
    await sql`UPDATE students SET weight = 27 WHERE id = ${s2.id}`;
    await sql`UPDATE entries SET status = 'submitted' WHERE id = ${d.id}`;
    expect(await view(d.id)).toMatchObject({ weight: "27" });
  });

  it("an explicit snapshot written by the app is kept (the trigger does not overwrite it)", async () => {
    const { dojo, parent, coach, event } = await seedBasics(sql);
    const s = await addStudent(sql, dojo.id, parent.id, { weight: 30 });
    const [e] = await sql<{ id: string }[]>`
      INSERT INTO entries (event_id, coach_id, student_id, status, snap_name, snap_gender, snap_dob, snap_rank,
                           declared_weight_kg, snap_taken_at)
      VALUES (${event.id}, ${coach.id}, ${s.id}, 'pending_coach', 'Typed Name', 'female', '2015-01-01', 'orange', 29, NOW())
      RETURNING id`;
    expect(await view(e.id)).toMatchObject({ name: "Typed Name", rank: "orange", weight: "29" });
  });
});
