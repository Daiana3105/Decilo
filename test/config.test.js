const assert = require("node:assert/strict");
const test = require("node:test");
const { loadConfig } = require("../config");

test("prioritizes DATABASE_URL and PORT from the environment", () => {
  const config = loadConfig({
    JWT_SECRET: "test-secret-that-is-longer-than-32-characters",
    DATABASE_URL: "postgresql://render-user:placeholder-password@render.example/decilo",
    DB_HOST: "ignored-host",
    DB_PORT: "5432",
    DB_USER: "ignored-user",
    DB_PASSWORD: "ignored-password",
    DB_NAME: "ignored-db",
    PORT: "4310",
    FRONTEND_PUBLIC_URL: "https://decilo.example"
  });

  assert.equal(config.port, 4310);
  assert.equal(config.database.connectionString, "postgresql://render-user:placeholder-password@render.example/decilo");
  assert.deepEqual(config.corsOrigins, ["https://decilo.example", "http://localhost:8080", "http://127.0.0.1:8080"]);
});

test("requires local PostgreSQL variables when DATABASE_URL is absent", () => {
  assert.throws(
    () => loadConfig({ JWT_SECRET: "test-secret-that-is-longer-than-32-characters" }),
    /Configuración PostgreSQL incompleta/
  );
});
