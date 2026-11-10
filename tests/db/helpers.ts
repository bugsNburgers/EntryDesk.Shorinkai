import postgres from "postgres";
import { inject } from "vitest";

export function testDbUrl(): string {
  return inject("testDatabaseUrl");
}

/** A new connection pool to the per-run test database. */
export function connect(max = 1) {
  return postgres(testDbUrl(), { max, onnotice: () => {} });
}

/** Points app modules (`@/lib/db`) at the test database. Call before importing them. */
export function useTestDbForApp() {
  process.env.DATABASE_URL = testDbUrl();
}

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function seedBasics(sql: postgres.Sql) {
  const u = uniq();
  const [organizer] = await sql<{ id: string }[]>`
    INSERT INTO users (email, full_name, role, avatar_url) VALUES (${`org-${u}@test.local`}, 'Org', 'organizer', '/x.png') RETURNING id`;
  const [coach] = await sql<{ id: string }[]>`
    INSERT INTO users (email, full_name, role, avatar_url) VALUES (${`coach-${u}@test.local`}, 'Coach', 'coach', '/x.png') RETURNING id`;
  const [parent] = await sql<{ id: string }[]>`
    INSERT INTO users (email, full_name, role) VALUES (${`parent-${u}@test.local`}, 'Parent', 'parent') RETURNING id`;
  const [dojo] = await sql<{ id: string }[]>`
    INSERT INTO dojos (coach_id, name, slug, join_code) VALUES (${coach.id}, ${`Dojo ${u}`}, ${`dojo-${u}`}, ${u.slice(-6).padStart(6, "0")}) RETURNING id`;
  const [event] = await sql<{ id: string }[]>`
    INSERT INTO events (organizer_id, title, event_type, start_date, end_date, location, is_registration_open)
    VALUES (${organizer.id}, ${`Cup ${u}`}, 'tournament', '2027-03-14', '2027-03-15', 'Pune', true) RETURNING id`;
  return { organizer, coach, parent, dojo, event };
}

export async function addStudent(
  sql: postgres.Sql,
  dojoId: string,
  parentId: string | null,
  over: Partial<{ name: string; gender: string; dob: string; rank: string; weight: number; school: string }> = {}
) {
  const [s] = await sql<{ id: string; registration_no: string }[]>`
    INSERT INTO students (dojo_id, parent_id, name, gender, date_of_birth, rank, weight, school_or_city)
    VALUES (${dojoId}, ${parentId}, ${over.name ?? "Asha Rao"}, ${over.gender ?? "female"}, ${over.dob ?? "2015-06-20"},
            ${over.rank ?? "green"}, ${over.weight ?? 31.5}, ${over.school ?? "Pune"})
    RETURNING id, registration_no`;
  return s;
}
