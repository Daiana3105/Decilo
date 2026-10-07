const assert = require("node:assert/strict");
const test = require("node:test");
const { loadConfig } = require("../config");
test('hosted demo is explicit, marked and never implied by a key or DATABASE_URL', () => {
  const base = { JWT_SECRET: 'synthetic-secret-more-than-32-characters', NODE_ENV:'production', DATABASE_URL:'postgresql://test:test@db.invalid/demo', GEMINI_API_KEY:'synthetic-key', FAMILY_DEMO_ENABLED:'true' };
  const locked=loadConfig(base);
  assert.equal(locked.familyDemo.enabled,false); assert.equal(locked.assistant.enabled,false);
  assert.deepEqual(locked.assistant.allowedUserIds,[]);
  assert.throws(()=>loadConfig({...base,FAMILY_DEMO_PUBLIC_ENABLED:'true'}));
  const ready=loadConfig({...base,FAMILY_DEMO_PUBLIC_ENABLED:'true',FAMILY_DEMO_MARKER:'a'.repeat(32),GEMINI_DEMO_ENABLED:'true',GEMINI_DEMO_USER_IDS:'2, 3'});
  assert.equal(ready.familyDemo.enabled,true); assert.deepEqual(ready.assistant.allowedUserIds,['2','3']);
  assert.throws(()=>loadConfig({...base,GEMINI_DEMO_USER_IDS:'2,not-an-id'}));
});

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
