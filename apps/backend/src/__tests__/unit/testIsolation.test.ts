import { db } from "@/config/database";

// The suite runs in a throwaway schema (see test/globalSetup.cjs), so what the tests create, the
// admin audit log included, can never end up in the real database.
const isolated = process.env.TEST_DB_ISOLATION !== "off";

(isolated ? describe : describe.skip)("test database isolation", () => {
  afterAll(() => db.end());

  it("works in a temporary schema, not in public", async () => {
    const { rows } = await db.query("SELECT current_schema() AS schema");
    expect(rows[0].schema).toMatch(/^nc_jest_\d+_\d+$/);
    expect(rows[0].schema).toBe(process.env.NC_TEST_SCHEMA);
  });

  it("is fully migrated", async () => {
    // (Not asserted to be empty: other test files run in the same schema at the same time.)
    const migrations = await db.query("SELECT COUNT(*)::int AS n FROM schema_migrations");
    expect(migrations.rows[0].n).toBeGreaterThan(0);
    await db.query("SELECT 1 FROM admin_audit_logs LIMIT 1");
  });

  it("does not touch the real tables in public", async () => {
    const { rows } = await db.query(
      "SELECT to_regclass('public.users') AS real, to_regclass('users') AS used",
    );
    // `users` as the tests see it is the schema's own table, never public.users.
    expect(rows[0].used).not.toBe(rows[0].real);
  });
});
