// Creates and retains a fresh e2e database on the LOCAL Docker Postgres and seeds users + sessions.
// The dev server (playwright.config.ts webServer) connects lazily, so recreating the DB here
// before the first request is safe.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { applyAll } from "../db/sql-files";

const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL || "postgresql://postgres:test@127.0.0.1:55432/postgres";
export const SEED_FILE = path.resolve(process.cwd(), "tests/e2e/.seed.json");

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export default async function globalSetup() {
  const host = new URL(ADMIN_URL).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) throw new Error(`Refusing non-local DB host ${host}`);

  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  const dbName = process.env.ENTRYDESK_E2E_DATABASE;
  if (!dbName || !/^entrydesk_e2e_[a-z0-9_]+$/.test(dbName) || dbName.length > 63) throw new Error("Invalid E2E database name");
  console.log(`Retaining rehearsal database: ${dbName}`);
  try {
    await admin`CREATE DATABASE ${admin(dbName)}`;
  } finally {
    await admin.end();
  }

  const sql = postgres(ADMIN_URL.replace(/\/[^/]*$/, `/${dbName}`), { max: 1, onnotice: () => {} });
  try {
    await applyAll(sql);

    const user = async (email: string, name: string, role: string, avatar: string | null, active = true) =>
      (
        await sql<{ id: string }[]>`
          INSERT INTO users (email, full_name, role, avatar_url, is_active)
          VALUES (${email}, ${name}, ${role}, ${avatar}, ${active}) RETURNING id`
      )[0].id;
    const session = async (userId: string, token: string) => {
      await sql`INSERT INTO sessions (user_id, session_token, expires_at)
                VALUES (${userId}, ${sha256(token)}, NOW() + INTERVAL '7 days')`;
    };

    const organizer = await user("organiser@e2e.local", "Olga Organiser", "organizer", "/icons/add-athlete-128.svg");
    const coach = await user("coach@e2e.local", "Sensei Kenji", "coach", "/icons/add-athlete-128.svg");
    const badCoach = await user("badavatar@e2e.local", "Coach Badhost", "coach", "https://unlisted-host.example.com/me.jpg");
    const noPhotoCoach = await user("nophoto@e2e.local", "Coach Nophoto", "coach", null);
    const parent = await user("parent@e2e.local", "Priya Parent", "parent", null);
    const platformAdmin = await user("admin@e2e.local", "Platform Admin", "admin", null);
    await session(platformAdmin, "admin-tok");
    await session(organizer, "org-tok");
    await session(coach, "coach-tok");
    await session(noPhotoCoach, "nophoto-tok");
    await session(parent, "parent-tok");

    const [dojo] = await sql<{ id: string; slug: string }[]>`
      INSERT INTO dojos (coach_id, name, city, slug, join_code)
      VALUES (${coach}, 'Kenji Karate Club', 'Pune', 'kenji-karate-e2e', 'e2e001') RETURNING id, slug`;
    const [event] = await sql<{ id: string }[]>`
      INSERT INTO events (organizer_id, title, event_type, start_date, end_date, location, is_registration_open, age_cutoff_rule)
      VALUES (${organizer}, 'E2E Open 2027', 'tournament', '2027-03-14', '2027-03-15', 'Pune', true, 'tournament_day')
      RETURNING id`;
    await sql`INSERT INTO event_days (event_id, date, name) VALUES (${event.id}, '2027-03-14', 'Day 1'), (${event.id}, '2027-03-15', 'Day 2')`;
    await sql`INSERT INTO event_applications (event_id, coach_id, status) VALUES (${event.id}, ${coach}, 'approved')`;
    await sql`INSERT INTO event_applications (event_id, coach_id, status) VALUES (${event.id}, ${badCoach}, 'pending')`;

    const [athlete] = await sql<{ id: string }[]>`
      INSERT INTO students (dojo_id, parent_id, name, gender, date_of_birth, rank, weight, school_or_city, photo_url,
                            consent_given_at, consent_version, consent_given_by)
      VALUES (${dojo.id}, ${parent}, 'Asha Rao', 'female', '2015-06-20', 'green', 31.5, 'Pune', '/icons/add-athlete-128.svg',
              NOW(), 'v1.0', ${parent})
      RETURNING id`;

    fs.writeFileSync(
      SEED_FILE,
      JSON.stringify({ eventId: event.id, athleteId: athlete.id, dojoSlug: dojo.slug, parentId: parent, coachId: coach }, null, 2)
    );
  } finally {
    await sql.end();
  }
}
