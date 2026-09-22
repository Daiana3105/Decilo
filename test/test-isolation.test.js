const test = require("node:test");
const assert = require("node:assert/strict");
const { testConfig, verifyDatabase } = require("../scripts/test-database");

test("test database rejects missing config and operational environment before connecting", () => {
  for (const env of [{}, { DB_NAME: "decilo", DB_HOST: "127.0.0.1" },
    { TEST_DB_NAME: "decilo_test", DATABASE_URL: "postgresql://production/db" },
    { DECILO_TEST_DATABASE: "invalid" }]) assert.throws(() => testConfig(env), /ausente o insegura/);
});

test("test database rejects external hosts and operational database names", () => {
  const config = { host: "127.0.0.1", port: 5432, user: "decilo_test", password: "a".repeat(64),
    database: `decilo_test_${"b".repeat(32)}`, nonce: "c".repeat(32) };
  for (const override of [{ host: "production.example" }, { database: "decilo" }, { user: "postgres" }, { port: 0 }]) {
    assert.throws(() => testConfig({ DECILO_TEST_DATABASE: JSON.stringify({ ...config, ...override }) }), /insegura/);
  }
});

test("ownership guard rejects a foreign database even with a test-like name", async () => {
  const pool = { query: async () => ({ rowCount: 1, rows: [{ db: "decilo_test", usr: "decilo_test", nonce: "foreign" }] }) };
  await assert.rejects(verifyDatabase(pool, { database: "decilo_test", user: "decilo_test", nonce: "owned" }), /no pertenece/);
});
