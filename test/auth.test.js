const assert = require("node:assert/strict");
const test = require("node:test");
const request = require("supertest");
const { createApp } = require("../server");
const { createDatabase } = require("../db");

const databaseConfig = {
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 55432),
  user: process.env.TEST_DB_USER || process.env.DB_USER || "decilo",
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || "decilo_dev_password",
  database: process.env.TEST_DB_NAME || process.env.DB_NAME || "decilo",
  max: 4
};
const config = {
  jwtSecret: "test-secret-that-is-longer-than-32-characters",
  jwtExpiresIn: "1h",
  corsOrigins: ["https://decilo.example", "http://localhost:8080"]
};

let database;
let app;

test.before(async () => {
  database = await createDatabase(databaseConfig);
  app = createApp({ config, database });
});

test.beforeEach(async () => {
  await database.query("TRUNCATE TABLE users RESTART IDENTITY");
});

test.after(async () => {
  await database.end();
});

test("registers a user with a hash and returns a JWT", async () => {
  const response = await request(app).post("/api/auth/register").send({
    nombre: "Ana Demo",
    email: "ANA@example.com",
    password: "segura123",
    confirmPassword: "segura123",
    rol: "paciente"
  });

  assert.equal(response.status, 201);
  assert.ok(response.body.token);
  assert.equal(response.body.user.rol, "paciente");
  assert.equal(response.body.user.password_hash, undefined);
  const stored = (await database.query("SELECT * FROM users WHERE email = $1", ["ana@example.com"])).rows[0];
  assert.ok(stored.password_hash);
  assert.ok(stored.created_at);
  assert.equal(stored.password, undefined);
});

test("rejects invalid registration and duplicate email", async () => {
  const invalid = await request(app).post("/api/auth/register").send({ email: "no", password: "short", confirmPassword: "different", rol: "otro" });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.body.fields.email);
  assert.ok(invalid.body.fields.password);
  assert.ok(invalid.body.fields.confirmPassword);
  assert.ok(invalid.body.fields.rol);

  const payload = { nombre: "Ana Demo", email: "ana@example.com", password: "segura123", confirmPassword: "segura123", rol: "familiar" };
  assert.equal((await request(app).post("/api/auth/register").send(payload)).status, 201);
  const duplicate = await request(app).post("/api/auth/register").send(payload);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error, "EMAIL_IN_USE");
});

test("logs in and exposes only the public identity", async () => {
  const payload = { nombre: "Profesional Demo", email: "prof@example.com", password: "segura123", confirmPassword: "segura123", rol: "profesional" };
  await request(app).post("/api/auth/register").send(payload);
  const response = await request(app).post("/api/auth/login").send({ email: payload.email, password: payload.password });
  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, payload.email);
  assert.equal(response.body.user.password_hash, undefined);
  assert.equal((await request(app).post("/api/auth/login").send({ email: payload.email, password: "incorrecta" })).status, 401);
});

test("supports the three authenticated roles", async () => {
  for (const rol of ["profesional", "paciente", "familiar"]) {
    const response = await request(app).post("/api/auth/register").send({
      nombre: `${rol} Demo`,
      email: `${rol}@example.com`,
      password: "segura123",
      confirmPassword: "segura123",
      rol
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.user.rol, rol);
  }
});

test("validates the session and rejects missing or invalid tokens", async () => {
  const registration = await request(app).post("/api/auth/register").send({ nombre: "Familiar Demo", email: "fam@example.com", password: "segura123", confirmPassword: "segura123", rol: "familiar" });
  assert.equal((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${registration.body.token}`)).status, 200);
  assert.equal((await request(app).get("/api/auth/me")).status, 401);
  assert.equal((await request(app).get("/api/auth/me").set("Authorization", "Bearer invalido")).status, 401);
});

test("reports API and database health", async () => {
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok", database: "ok" });
});

test("reports database health failure", async () => {
  const unavailableApp = createApp({ config, database: { query: async () => { throw new Error("database unavailable"); } } });
  const response = await request(unavailableApp).get("/api/health");
  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { status: "error", database: "unavailable" });
});

test("allows configured CORS origins and rejects arbitrary origins", async () => {
  const allowed = await request(app).options("/api/health").set("Origin", "https://decilo.example");
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers["access-control-allow-origin"], "https://decilo.example");

  const denied = await request(app).get("/api/health").set("Origin", "https://untrusted.example");
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error, "CORS_ORIGIN_DENIED");
  assert.equal(denied.headers["access-control-allow-origin"], undefined);
});
