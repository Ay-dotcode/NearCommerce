import { db } from "@/config/database";
import { pendingMigrations } from "@/db/migrationPlan";
import fs from "fs";
import path from "path";

// Brings the database up to date: runs every file in src/db/migrations that has not run yet,
// in order, and remembers which ones ran in a `schema_migrations` table. Safe to run on every
// deploy. (Use `db:clear` instead to wipe a development database and start over.)
//
// A database that was set up by hand (tables exist, but no record of migrations) is treated as
// already up to date: its current files are recorded without being run again.
async function migrate() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sql"));

  try {
    const existing = await db.query(
      "SELECT to_regclass('public.schema_migrations') AS t, to_regclass('public.users') AS users",
    );
    const hasTracking = existing.rows[0].t !== null;
    const hasTables = existing.rows[0].users !== null;

    await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    if (!hasTracking && hasTables) {
      for (const file of files)
        await db.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
          [file],
        );
      console.log(
        `ℹ️  Existing database found: recorded ${files.length} migrations as already applied.`,
      );
      return;
    }

    const applied = (
      await db.query("SELECT filename FROM schema_migrations")
    ).rows.map((row) => row.filename as string);
    const todo = pendingMigrations(files, applied);

    if (todo.length === 0) {
      console.log("✅ Database is up to date.");
      return;
    }
    for (const file of todo) {
      console.log(`📌 Applying migration: ${file}`);
      // Applied as written: some files manage their own transactions.
      await db.query(fs.readFileSync(path.join(dir, file), "utf8"));
      await db.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    }
    console.log(`✅ Applied ${todo.length} migration(s).`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

void migrate();
