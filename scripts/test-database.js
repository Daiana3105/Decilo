const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");
const { createDatabase } = require("../db");

// Only the test runner provisions this capability. Never fall back to DB_* or PG*.
function testConfig(env = process.env) {
  let config;
  try { config = JSON.parse(env.DECILO_TEST_DATABASE || "null"); } catch (_) { /* reject below */ }
  if (!config || config.host !== "127.0.0.1" || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535 ||
      !/^decilo_test_[a-f0-9]{32}$/.test(config.database) || config.user !== "decilo_test" ||
      !/^[a-f0-9]{64}$/.test(config.password) || !/^[a-f0-9]{32}$/.test(config.nonce)) {
    throw new Error("Base de pruebas ausente o insegura. Ejecutá npm test; no se aceptan bases externas.");
  }
  return { host: config.host, port: config.port, database: config.database, user: config.user,
    password: config.password, nonce: config.nonce, connectionTimeoutMillis: 2000, max: 4 };
}

async function verifyDatabase(pool, config) {
  const result = await pool.query("SELECT current_database() AS db, current_user AS usr, nonce FROM public.decilo_test_guard");
  const row = result.rows[0];
  if (result.rowCount !== 1 || row.db !== config.database || row.usr !== config.user || row.nonce !== config.nonce) {
    throw new Error("La base no pertenece a esta ejecución de pruebas");
  }
}

async function isolatedDatabase() {
  const config = testConfig();
  const admin = new Pool(config);
  const schema = `suite_${randomUUID().replaceAll("-", "")}`;
  let database;
  let created = false;
  try {
    await verifyDatabase(admin, config); // Before ANY schema/DDL/data changes.
    await admin.query(`CREATE SCHEMA ${schema}`);
    created = true;
    const databaseConfig = { ...config, options: `-c search_path=${schema}` };
    database = await createDatabase(databaseConfig);
    return {
      database, databaseConfig,
      async reset() {
        await verifyDatabase(admin, config);
        // Schema is generated here, never supplied by env or the user.
        await admin.query(`TRUNCATE TABLE ${schema}.users RESTART IDENTITY CASCADE`);
      },
      async close() {
        await database.end();
        try {
          await verifyDatabase(admin, config);
          await admin.query(`DROP SCHEMA ${schema} CASCADE`);
        } finally { await admin.end(); }
      }
    };
  } catch (error) {
    if (database) await database.end();
    if (created) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    throw error;
  }
}

module.exports = { testConfig, verifyDatabase, isolatedDatabase };
