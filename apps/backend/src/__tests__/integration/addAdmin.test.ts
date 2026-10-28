import { db } from "@/config/database";
import { addAdmin } from "@/db/addAdmin";
import bcrypt from "bcrypt";

const RUN = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
const email = (label: string) => `${label}_${RUN}@addadmin.test`;
const row = async (e: string) =>
  (await db.query("SELECT * FROM users WHERE email = $1", [e])).rows[0];

describe("pnpm add-admin", () => {
  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email LIKE $1", [
      `%_${RUN}@addadmin.test`,
    ]);
    await db.end();
  });

  it("creates a verified, root SYSTEM_ADMIN with a hashed password", async () => {
    const result = await addAdmin(db, {
      email: email("new"),
      password: "ChooseAGoodOne1",
    });
    expect(result.created).toBe(true);

    const user = await row(email("new"));
    expect(user).toMatchObject({
      role: "SYSTEM_ADMIN",
      is_root_admin: true,
      is_suspended: false,
      full_name: "System Admin",
    });
    expect(user.email_verified_at).not.toBeNull();
    expect(user.password_hash).not.toContain("ChooseAGoodOne1");
    expect(await bcrypt.compare("ChooseAGoodOne1", user.password_hash)).toBe(
      true,
    );
  });

  it("normalises the email and uses the given name", async () => {
    await addAdmin(db, {
      email: `  ${email("Mixed").toUpperCase()} `,
      password: "ChooseAGoodOne1",
      fullName: "Joseph Owner",
    });
    expect((await row(email("mixed"))).full_name).toBe("Joseph Owner");
  });

  it("promotes an existing account, keeps its name, sets the new password and signs it out", async () => {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, 'old-hash', 'Existing Shopper', 'CUSTOMER') RETURNING id`,
      [email("existing")],
    );
    await db.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 day')`,
      [rows[0].id, `hash-${RUN}`.padEnd(64, "0").slice(0, 64)],
    );

    const result = await addAdmin(db, {
      email: email("existing"),
      password: "BrandNewPass1",
    });
    expect(result.created).toBe(false);

    const user = await row(email("existing"));
    expect(user).toMatchObject({
      id: rows[0].id,
      role: "SYSTEM_ADMIN",
      is_root_admin: true,
      full_name: "Existing Shopper",
    });
    expect(await bcrypt.compare("BrandNewPass1", user.password_hash)).toBe(true);
    const sessions = await db.query(
      "SELECT 1 FROM user_sessions WHERE user_id = $1",
      [rows[0].id],
    );
    expect(sessions.rows).toHaveLength(0);
  });

  it("rejects a bad email or a short password and creates nothing", async () => {
    await expect(
      addAdmin(db, { email: "nope", password: "ChooseAGoodOne1" }),
    ).rejects.toThrow(/email/i);
    await expect(
      addAdmin(db, { email: email("short"), password: "short" }),
    ).rejects.toThrow(/8 characters/);
    expect(await row(email("short"))).toBeUndefined();
  });
});
