// OTP: the cooldown query uses `(n::int * INTERVAL '1 second')` (the old `INTERVAL '${n} seconds'`
// was a bind-param bug), and the verify route must refuse non-parent / inactive accounts.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { connect, useTestDbForApp } from "./helpers";

const sql = connect();
let otp: typeof import("@/lib/auth/otp");
let verifyRoute: typeof import("@/app/api/auth/otp/verify/route");

beforeAll(async () => {
  useTestDbForApp();
  otp = await import("@/lib/auth/otp");
  verifyRoute = await import("@/app/api/auth/otp/verify/route");
});
afterAll(async () => {
  await sql.end();
  const db = (await import("@/lib/db")).default;
  await db.end();
});

let n = 0;
const email = (tag: string) => `${tag}-${Date.now()}-${n++}@test.local`;

async function verify(addr: string, code: string) {
  const req = new NextRequest("http://localhost/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ email: addr, code }),
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${n % 250}` },
  });
  return verifyRoute.POST(req);
}

describe("OTP store (INTERVAL bind-param fix)", () => {
  it("stores a code, enforces the resend cooldown, and verifies it once", async () => {
    const addr = email("parent");
    const first = await otp.generateAndStoreOtp(addr, "127.0.0.1");
    expect(first.code).toMatch(/^\d{6}$/);
    expect(first.cooldownError).toBeUndefined();

    const second = await otp.generateAndStoreOtp(addr, "127.0.0.1");
    expect(second.cooldownError).toMatch(/wait/i);

    const ok = await otp.verifyOtp(addr, first.code);
    expect(ok.success).toBe(true);
    const again = await otp.verifyOtp(addr, first.code);
    expect(again.success).toBe(false);
  });

  it("rejects a wrong code", async () => {
    const addr = email("parent");
    const { code } = await otp.generateAndStoreOtp(addr, "127.0.0.1");
    const wrong = code === "000000" ? "111111" : "000000";
    const res = await otp.verifyOtp(addr, wrong);
    expect(res.success).toBe(false);
  });
});

describe("POST /api/auth/otp/verify role guard", () => {
  for (const role of ["coach", "organizer", "admin"] as const) {
    it(`returns 403 for an active ${role} and creates no session`, async () => {
      const addr = email(role);
      const [u] = await sql<{ id: string }[]>`
        INSERT INTO users (email, full_name, role, is_active) VALUES (${addr}, 'Staff', ${role}, true) RETURNING id`;
      const { code } = await otp.generateAndStoreOtp(addr, "127.0.0.1");
      const res = await verify(addr, code);
      expect(res.status).toBe(403);
      const [{ count }] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM sessions WHERE user_id = ${u.id}`;
      expect(count).toBe(0);
      const [after] = await sql<{ role: string; is_active: boolean }[]>`SELECT role, is_active FROM users WHERE id = ${u.id}`;
      expect(after).toEqual({ role, is_active: true });
    });
  }

  it("returns 403 for an inactive (pending) account and does not activate it", async () => {
    const addr = email("pending");
    const [u] = await sql<{ id: string }[]>`
      INSERT INTO users (email, full_name, role, is_active) VALUES (${addr}, 'Pending', 'coach', false) RETURNING id`;
    const { code } = await otp.generateAndStoreOtp(addr, "127.0.0.1");
    const res = await verify(addr, code);
    expect(res.status).toBe(403);
    const [after] = await sql<{ is_active: boolean }[]>`SELECT is_active FROM users WHERE id = ${u.id}`;
    expect(after.is_active).toBe(false);
  });

  it("returns 400 for a wrong code without creating an account", async () => {
    const addr = email("nobody");
    await otp.generateAndStoreOtp(addr, "127.0.0.1");
    const res = await verify(addr, "000001");
    expect(res.status).toBe(400);
  });
});
