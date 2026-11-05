const { connect } = require("./testSchema.cjs");

// Drops the schema the run worked in, and everything that was created in it.
// Set KEEP_TEST_SCHEMA=1 to keep it for a look afterwards (it is removed by the next run once
// this process has exited).
module.exports = async function globalTeardown() {
  const schema = process.env.NC_TEST_SCHEMA;
  if (!schema || process.env.KEEP_TEST_SCHEMA === "1") return;

  const client = await connect(process.env.NC_TEST_ADMIN_URL);
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await client.end();
  }
};
