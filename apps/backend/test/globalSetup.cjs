const {
  SCHEMA_PREFIX,
  connect,
  dropStaleSchemas,
  loadDatabaseUrl,
  migrate,
  urlForSchema,
} = require("./testSchema.cjs");

// Set TEST_DB_ISOLATION=off to run the tests directly against DATABASE_URL (the old behaviour).
module.exports = async function globalSetup() {
  if (process.env.TEST_DB_ISOLATION === "off") return;

  const url = loadDatabaseUrl();
  const schema = `${SCHEMA_PREFIX}${process.pid}_${Date.now()}`;
  const client = await connect(url);
  try {
    await dropStaleSchemas(client);
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}", public`);
    await migrate(client);
  } catch (error) {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
    throw new Error(
      `Could not prepare the temporary test schema: ${error.message}\n` +
        "The database user needs permission to create schemas, and the database must already have been migrated once (pnpm db:migrate) so its extensions exist.",
    );
  } finally {
    await client.end();
  }

  // The test workers inherit this, so every connection they open lands in the temporary schema.
  process.env.DATABASE_URL = urlForSchema(url, schema);
  process.env.NC_TEST_SCHEMA = schema;
  process.env.NC_TEST_ADMIN_URL = url;
};
