const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { createApp } = require("../server");
const { signToken } = require("../auth");
const { createNotificationService } = require("../notifications");

test("HTTP health and users use injected repositories without direct SQL", async () => {
  const config = { jwtSecret: "synthetic-test-secret-longer-than-32-characters", jwtExpiresIn: "1h" };
  const user = { id: 7, nombre: "Demo", email: "demo@example.test", rol: "paciente", password_hash: await bcrypt.hash("password123", 4) };
  const calls = [];
  const app = createApp({ config, database: { query() { assert.fail("direct SQL"); } },
    databaseHealth: { async check() { calls.push("health"); } },
    users: {
      async findById(id) { assert.equal(id, 7); calls.push("id"); return user; },
      async findByEmail(email) { assert.equal(email, user.email); calls.push("email"); return user; },
      async insert(values) { assert.equal(values.email, user.email); assert.ok(await bcrypt.compare("password123", values.passwordHash)); calls.push("insert"); return user; }
    }, loginNotifications: { schedule(id) { assert.equal(id, 7); } }
  });
  assert.deepEqual((await request(app).get("/api/health")).body, { status: "ok", database: "ok" });
  const registration = await request(app).post("/api/auth/register").send({ nombre: "Demo", email: "DEMO@example.test", rol: "paciente", password: "password123", confirmPassword: "password123" });
  assert.equal(registration.status, 201); assert.equal(registration.body.user.password_hash, undefined);
  assert.equal((await request(app).post("/api/auth/login").send({ email: " DEMO@example.test ", password: "password123" })).status, 200);
  assert.equal((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${signToken(user, config)}`)).status, 200);
  assert.deepEqual(calls, ["health", "insert", "email", "id"]);
});

test("REST service methods delegate queries on the existing transaction client", async () => {
  const calls = [];
  const client = { async query(sql) {
    assert.ok(!/SELECT \* FROM notifications|UPDATE notifications|COUNT\(/.test(sql), sql);
  }, release() {} };
  const row = { id: "9007199254740993", type: "session.login", title: "T", body: "B", created_at: "date", read_at: "read" };
  const service = createNotificationService({ connect: async () => client }, {
    notificationRepository(executor) {
      assert.equal(executor, client);
      return {
        async listBefore(id, options) { assert.equal(id, 7); assert.deepEqual(options, { before: null, limit: 2 }); calls.push("list"); return { rows: [row, { ...row, id: "2" }] }; },
        async markRead(id, noticeId) { assert.equal(id, 7); assert.equal(noticeId, row.id); calls.push("read"); return { rows: [], rowCount: 0 }; },
        async findOwnedById(id, noticeId) { assert.equal(id, 7); assert.equal(noticeId, row.id); calls.push("owned"); return row; },
        async markAllRead(id) { assert.equal(id, 7); calls.push("all"); return { rowCount: 0 }; }
      };
    },
    stateRepository(executor) { assert.equal(executor, client); return {
      async ensure(id) { assert.equal(id, 7); }, async lock(id) { assert.equal(id, 7); },
      async increment() { assert.fail("no-op must not increment revision"); },
      async summary(id) { assert.equal(id, 7); return { revision: "9007199254740994", unreadCount: 0 }; }
    }; }
  });
  const page = await service.list(7, { limit: "1" });
  assert.equal(page.nextCursor, row.id); assert.equal(page.notifications.length, 1);
  assert.equal(page.revision, "9007199254740994");
  assert.equal((await service.markRead(7, row.id)).changed, false);
  assert.equal((await service.markAllRead(7)).updatedCount, 0);
  assert.deepEqual(await service.unreadCount(7), { revision: "9007199254740994", unreadCount: 0 });
  assert.deepEqual(calls, ["list", "read", "owned", "all"]);
});
