const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { isolatedDatabase } = require("../scripts/test-database");
const { initializeDatabase, createDatabase } = require("../db");
const { createNotificationService } = require("../notifications");
const { createApp } = require("../server");
const { signToken } = require("../auth");

const config = { jwtSecret: "test-secret-that-is-longer-than-32-characters", jwtExpiresIn: "1h", corsOrigins: ["http://localhost:8080"] };
let fixture, db, service, app, a, b;
const payload = { nombre: "Cuenta de prueba", email: "a@example.test", password: "prueba-segura", confirmPassword: "prueba-segura", rol: "paciente" };
function bearer(user) { return `Bearer ${signToken(user, config)}`; }
async function user(email, rol = "paciente") {
  return (await db.query("INSERT INTO users (nombre, email, password_hash, rol) VALUES ($1,$2,$3,$4) RETURNING *",
    ["Cuenta de prueba", email, await bcrypt.hash(payload.password, 4), rol])).rows[0];
}
function get(path, account = a) { return request(app).get(path).set("Authorization", bearer(account)); }
function post(path, account = a) { return request(app).post(path).set("Authorization", bearer(account)); }

test.before(async () => {
  fixture = await isolatedDatabase(); db = fixture.database;
  service = createNotificationService(db);
  app = createApp({ config, database: db });
});
test.beforeEach(async () => {
  await app.locals.loginNotifications.drain(); await fixture.reset();
  a = await user("a@example.test"); b = await user("b@example.test", "familiar");
});
test.after(async () => { await app?.locals.loginNotifications.close(); await fixture?.close(); });

test("initializes old accounts safely and repeatedly without retroactive notices", async () => {
  await db.query("DROP TABLE notifications, notification_state");
  await initializeDatabase(db);
  await initializeDatabase(db);
  assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM users")).rows[0].n, 2);
  assert.deepEqual(await service.unreadCount(a.id), { unreadCount: 0, revision: "0" });
  assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM notification_state")).rows[0].n, 2);
  const indexes = (await db.query("SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'notifications'")).rows.map((row) => row.indexname);
  assert.ok(indexes.includes("notifications_user_id_desc"));
  assert.ok(indexes.includes("notifications_unread_user"));
  await assert.rejects(db.query("INSERT INTO notification_state VALUES ($1, -1)", [b.id + 100]), { code: "23514" });
  await assert.rejects(service.createLogin(2147483647), { code: "23503" });
});

test("persists one notice per event, survives a new pool and keeps read timestamps", async () => {
  const eventId = randomUUID();
  const first = await service.createLogin(a.id, eventId);
  const repeated = await service.createLogin(a.id, eventId);
  assert.equal(first.changed, true); assert.equal(repeated.changed, false);
  assert.equal(repeated.revision, "1"); assert.equal(repeated.unreadCount, 1);
  assert.equal(first.notification.title, "Se inició sesión en tu cuenta");
  const read = await service.markRead(a.id, first.notification.id);
  const otherPool = await createDatabase(fixture.databaseConfig);
  try {
    const page = await createNotificationService(otherPool).list(a.id);
    assert.equal(page.unreadCount, 0); assert.equal(page.revision, "2");
    assert.equal(page.notifications[0].readAt.toISOString(), read.notification.readAt.toISOString());
  } finally { await otherPool.end(); }
});

test("paginates 25 notices without leaking another user's count or rows", async () => {
  for (let i = 0; i < 25; i++) await service.createLogin(a.id);
  await service.createLogin(b.id);
  const first = await get(`/api/notifications?userId=${b.id}`);
  assert.equal(first.status, 200); assert.equal(first.headers["cache-control"], "no-store");
  assert.equal(first.body.notifications.length, 20); assert.equal(first.body.unreadCount, 25);
  assert.equal(first.body.revision, "25");
  const next = await get(`/api/notifications?before=${first.body.nextCursor}`);
  assert.equal(next.body.notifications.length, 5); assert.equal(next.body.nextCursor, null);
  assert.equal(next.body.unreadCount, 25);
  const ids = [...first.body.notifications, ...next.body.notifications].map((row) => row.id);
  assert.equal(new Set(ids).size, 25);
  assert.deepEqual(ids, [...ids].sort((x, y) => BigInt(x) > BigInt(y) ? -1 : 1));
  assert.deepEqual((await get("/api/notifications/unread-count", b)).body, { unreadCount: 1, revision: "1" });
  for (const row of first.body.notifications) assert.deepEqual(Object.keys(row).sort(), ["body", "createdAt", "id", "readAt", "title", "type"]);
});

test("empty list and global unread summary use revision zero", async () => {
  assert.deepEqual((await get("/api/notifications")).body, { notifications: [], nextCursor: null, unreadCount: 0, revision: "0" });
  assert.deepEqual((await get("/api/notifications/unread-count")).body, { unreadCount: 0, revision: "0" });
});

test("validates limits, duplicate query parameters, cursors and bigint overflow", async () => {
  for (const query of ["limit=0", "limit=101", "limit=-1", "limit=x", "limit=1&limit=2", "before=0", "before=-1", "before=1.5", "before=9223372036854775808", "before=1%20OR%201=1"]) {
    assert.equal((await get(`/api/notifications?${query}`)).status, 400, query);
  }
  for (const id of ["0", "-1", "invalid", "9223372036854775808"]) assert.equal((await post(`/api/notifications/${id}/read`)).status, 400);
});

test("all notification endpoints reject invalid identities and JWTs", async () => {
  const signed = (claims, options = {}) => jwt.sign(claims, config.jwtSecret, options);
  const tokens = [null, "invalid", signed({ sub: String(a.id) }, { expiresIn: -1 }),
    signed({ sub: "invalid" }, { expiresIn: 60 }), signed({ sub: 1 }, { expiresIn: 60 }),
    signed({ sub: "2147483648" }, { expiresIn: 60 }), signed({ sub: "2147483647" }, { expiresIn: 60 }),
    signed({ sub: String(a.id) }), signed({ sub: String(a.id) }, { algorithm: "HS384", expiresIn: 60 }),
    jwt.sign({ sub: String(a.id) }, "other-secret", { expiresIn: 60 })];
  for (const token of tokens) {
    for (const [method, path] of [["get", "/api/notifications"], ["get", "/api/notifications/unread-count"],
      ["post", "/api/notifications/1/read"], ["post", "/api/notifications/read-all"]]) {
      let call = request(app)[method](path);
      if (token) call = call.set("Authorization", `Bearer ${token}`);
      assert.equal((await call).status, 401, path);
    }
  }
});

test("foreign and missing IDs return the same 404 and ignore supplied recipient/role", async () => {
  const foreign = await service.createLogin(b.id);
  const denied = await post(`/api/notifications/${foreign.notification.id}/read`).send({ userId: b.id, rol: "profesional" });
  const missing = await post("/api/notifications/9223372036854775807/read");
  assert.equal(denied.status, 404); assert.deepEqual(denied.body, missing.body);
  await post("/api/notifications/read-all").send({ userId: b.id });
  assert.equal((await service.unreadCount(b.id)).unreadCount, 1);
  assert.equal((await request(app).post("/api/notifications").set("Authorization", bearer(a))).status, 404);
});

test("concurrent individual reads change revision and timestamp only once", async () => {
  const notice = await service.createLogin(a.id);
  const responses = await Promise.all(Array.from({ length: 5 }, () => post(`/api/notifications/${notice.notification.id}/read`)));
  for (const response of responses) {
    assert.equal(response.status, 200); assert.equal(response.body.revision, "2");
    assert.equal(response.body.unreadCount, 0);
    assert.equal(response.body.notification.readAt, responses[0].body.notification.readAt);
  }
});

test("read-all covers unloaded pages and a subsequent creation remains unread", async () => {
  for (let i = 0; i < 23; i++) await service.createLogin(a.id);
  const first = await post("/api/notifications/read-all");
  assert.deepEqual(first.body, { updatedCount: 23, unreadCount: 0, revision: "24" });
  assert.deepEqual((await post("/api/notifications/read-all")).body, { updatedCount: 0, unreadCount: 0, revision: "24" });
  await service.createLogin(a.id);
  assert.deepEqual((await get("/api/notifications/unread-count")).body, { unreadCount: 1, revision: "25" });
});

test("concurrent writes and snapshots stay consistent for the same user", async () => {
  const operations = Array.from({ length: 12 }, (_, i) => i % 2 ? service.list(a.id, { limit: "100" }) : service.createLogin(a.id));
  const results = await Promise.all(operations);
  for (const snapshot of results.filter((row) => row.notifications)) {
    assert.equal(snapshot.unreadCount, snapshot.notifications.filter((row) => !row.readAt).length);
    assert.equal(BigInt(snapshot.revision), BigInt(snapshot.notifications.length));
  }
  const concurrent = await Promise.all([service.markAllRead(a.id), service.createLogin(a.id)]);
  const newest = concurrent.sort((x, y) => BigInt(x.revision) > BigInt(y.revision) ? -1 : 1)[0];
  assert.deepEqual(await service.unreadCount(a.id), { unreadCount: newest.unreadCount, revision: newest.revision });
});

test("rollback leaves no partial notice or revision and releases the client", async () => {
  await db.query(`CREATE FUNCTION reject_revision() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'forced failure'; END $$;
    CREATE TRIGGER reject_revision BEFORE UPDATE ON notification_state FOR EACH ROW EXECUTE FUNCTION reject_revision()`);
  try {
    await assert.rejects(service.createLogin(a.id));
    assert.deepEqual(await service.unreadCount(a.id), { unreadCount: 0, revision: "0" });
    assert.equal((await service.list(a.id)).notifications.length, 0);
  } finally { await db.query("DROP TRIGGER reject_revision ON notification_state; DROP FUNCTION reject_revision()"); }
  assert.equal((await service.createLogin(a.id)).revision, "1");
});

test("bigint IDs and revisions remain exact strings", async () => {
  await db.query("ALTER TABLE notifications ALTER COLUMN id RESTART WITH 9007199254740993");
  await db.query("INSERT INTO notification_state VALUES ($1, 9007199254740993)", [a.id]);
  const created = await service.createLogin(a.id);
  assert.equal(created.notification.id, "9007199254740993"); assert.equal(created.revision, "9007199254740994");
  assert.equal((await post(`/api/notifications/${created.notification.id}/read`)).body.revision, "9007199254740995");
});

test("login is the only trigger and works for all three roles", async () => {
  for (const rol of ["profesional", "paciente", "familiar"]) {
    const email = `${rol}@example.test`;
    const registration = await request(app).post("/api/auth/register").send({ ...payload, email, rol });
    assert.equal(registration.status, 201);
    const id = registration.body.user.id;
    assert.equal((await service.list(id)).notifications.length, 0);
    const failed = await request(app).post("/api/auth/login").send({ email, password: "wrong" });
    assert.equal(failed.status, 401);
    // The server derives role from the account even if a browser selected another one.
    const login = await request(app).post("/api/auth/login").send({ email, password: payload.password, rol: "other" });
    assert.equal(login.status, 200); assert.equal(login.body.user.rol, rol);
    await app.locals.loginNotifications.drain();
    const state = await service.list(id); assert.equal(state.notifications.length, 1);
    await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    await service.markAllRead(id);
    assert.equal((await service.list(id)).notifications.length, 1);
  }
});

test("secondary persistence/emission/logger/scheduling failures never invalidate login", async () => {
  for (const stage of ["persist", "emit", "logger", "schedule"]) {
    const logs = [];
    const secretError = new Error("secret password JWT database-url");
    const failing = createApp({ config, database: db,
      notificationService: stage === "persist" || stage === "logger" ? { createLogin: async () => { throw secretError; } } : service,
      publish: () => { if (stage === "emit") throw secretError; },
      logger: (entry) => { logs.push(entry); if (stage === "logger") throw secretError; },
      loginNotifications: stage === "schedule" ? { schedule: () => { throw secretError; } } : undefined
    });
    const login = await request(failing).post("/api/auth/login").send(payload);
    assert.equal(login.status, 200); assert.ok(login.body.token);
    assert.equal(jwt.verify(login.body.token, config.jwtSecret).sub, String(a.id));
    await failing.locals.loginNotifications.drain?.();
    assert.equal(logs.length, 1);
    assert.equal(JSON.stringify(logs).includes("secret"), false);
    assert.deepEqual(Object.keys(logs[0]).sort(), ["code", "correlationId", "stage"]);
  }
  // Only the emission failure persisted a notice.
  assert.equal((await service.list(a.id)).notifications.length, 1);
});

test("login returns while secondary persistence is still blocked", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const slow = createApp({ config, database: db, notificationService: { createLogin: async () => { await gate; return { changed: false }; } } });
  try {
    const response = await request(slow).post("/api/auth/login").send(payload).timeout(2000);
    assert.equal(response.status, 200); assert.ok(response.body.token);
    assert.equal((await service.list(a.id)).notifications.length, 0);
  } finally { release(); await slow.locals.loginNotifications.close(); }
});

test("notification dependency failures return sanitized 503 only on notification routes", async () => {
  const unavailable = createApp({ config, database: db, logger: () => {}, notificationService: {
    list: async () => { throw new Error("private SQL password"); }
  } });
  const response = await request(unavailable).get("/api/notifications").set("Authorization", bearer(a));
  assert.equal(response.status, 503); assert.equal(JSON.stringify(response.body).includes("private"), false);
});
