const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const request = require("supertest");
const { createApp } = require("../server");
const { createDatabase } = require("../db");

function setup() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "decilo-test-"));
  const database = createDatabase(path.join(directory, "decilo.sqlite"));
  const config = { jwtSecret: "test-secret-that-is-longer-than-32-characters", jwtExpiresIn: "1h" };
  return { database, app: createApp({ config, database }) };
}

test("registers a user with a hash and returns a JWT", async () => {
  const { app, database } = setup();
  const response = await request(app).post("/api/auth/register").send({
    nombre: "Ana Demo",
    email: "ANA@example.com",
    password: "segura123",
    confirmPassword: "segura123",
    rol: "paciente"
  });

  assert.equal(response.status, 201);
  assert.ok(response.body.token);
  assert.deepEqual(response.body.user.rol, "paciente");
  assert.equal(response.body.user.password_hash, undefined);
  const stored = database.prepare("SELECT * FROM users WHERE email = ?").get("ana@example.com");
  assert.ok(stored.password_hash);
  assert.equal(stored.password, undefined);
  database.close();
});

test("rejects invalid registration and duplicate email", async () => {
  const { app, database } = setup();
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
  database.close();
});

test("logs in and exposes only the public identity", async () => {
  const { app, database } = setup();
  const payload = { nombre: "Profesional Demo", email: "prof@example.com", password: "segura123", confirmPassword: "segura123", rol: "profesional" };
  await request(app).post("/api/auth/register").send(payload);
  const response = await request(app).post("/api/auth/login").send({ email: payload.email, password: payload.password });
  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, payload.email);
  assert.equal(response.body.user.password_hash, undefined);
  assert.equal((await request(app).post("/api/auth/login").send({ email: payload.email, password: "incorrecta" })).status, 401);
  database.close();
});

test("validates the session and rejects missing or invalid tokens", async () => {
  const { app, database } = setup();
  const registration = await request(app).post("/api/auth/register").send({ nombre: "Familiar Demo", email: "fam@example.com", password: "segura123", confirmPassword: "segura123", rol: "familiar" });
  assert.equal((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${registration.body.token}`)).status, 200);
  assert.equal((await request(app).get("/api/auth/me")).status, 401);
  assert.equal((await request(app).get("/api/auth/me").set("Authorization", "Bearer invalido")).status, 401);
  database.close();
});

test("reports API and database health", async () => {
  const { app, database } = setup();
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok", database: "ok" });
  database.close();
});
