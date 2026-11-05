// Shared by the Jest global setup and teardown.
//
// Every test run works in its own throwaway Postgres schema, created and fully migrated before
// the first test and dropped after the last. All tables (users, stores, products, the admin audit
// log, ...) live in that schema, so a run can never leave anything behind in the real database,
// and never writes to its audit log. The tests reach the schema through the connection string's
// search_path; no code under test is aware of it.
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const SCHEMA_PREFIX = "nc_jest_";
const REPO_ROOT = path.resolve(__dirname, "../../..");
const MIGRATIONS_DIR = path.resolve(__dirname, "../src/db/migrations");

function loadDatabaseUrl() {
  dotenv.config({ path: path.join(REPO_ROOT, ".env") });
  const url = process.env.DATABASE_URL?.trim();
  if (!url)
    throw new Error(
      "DATABASE_URL is missing. Set it in the .env file at the repo root before running the tests.",
    );
  return url;
}

// Same SSL handling as src/config/database.ts.
function connectionString(url) {
  return url.includes("sslmode=require") && !url.includes("uselibpqcompat")
    ? url.replace("sslmode=require", "sslmode=require&uselibpqcompat=true")
    : url;
}

async function connect(url) {
  const client = new Client({ connectionString: connectionString(url) });
  await client.connect();
  return client;
}

// The connection string the tests use: the same database, with the run's schema first on the
// search path (public stays on it for the extensions, such as pgvector).
function urlForSchema(url, schema) {
  const u = new URL(url);
  u.searchParams.set("options", `-c search_path=${schema},public`);
  return u.toString();
}

const pidOf = (schema) => Number(schema.slice(SCHEMA_PREFIX.length).split("_")[0]);

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

// Schemas left behind by a run that was killed before it could clean up.
async function dropStaleSchemas(client) {
  const { rows } = await client.query(
    `SELECT nspname FROM pg_namespace WHERE nspname LIKE $1`,
    [`${SCHEMA_PREFIX.replace(/_/g, "\\_")}%`],
  );
  for (const { nspname } of rows) {
    const pid = pidOf(nspname);
    if (Number.isInteger(pid) && !isAlive(pid))
      await client.query(`DROP SCHEMA IF EXISTS "${nspname}" CASCADE`);
  }
}

async function migrate(client) {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  await client.query(`CREATE TABLE schema_migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  for (const file of files) {
    await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
  }
}

module.exports = {
  SCHEMA_PREFIX,
  loadDatabaseUrl,
  connect,
  urlForSchema,
  dropStaleSchemas,
  migrate,
};
