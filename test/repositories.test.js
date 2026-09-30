const test = require("node:test");
const assert = require("node:assert/strict");
const { createUserRepository } = require("../repositories/user-repository");
const { createNotificationRepository } = require("../repositories/notification-repository");
const { createNotificationStateRepository } = require("../repositories/notification-state-repository");
const { createDatabaseHealth } = require("../repositories/database-health");

test("repositories use only the injected query executor and retain parameters/results", async () => {
  const calls = [], row = { id: "9007199254740993", revision: "9007199254740994", count: "2" };
  const result = { rows: [row], rowCount: 1 };
  const executor = { async query(sql, params) { calls.push({ sql, params }); return result; } };
  const users = createUserRepository(executor), notices = createNotificationRepository(executor);
  const state = createNotificationStateRepository(executor), health = createDatabaseHealth(executor);
  assert.equal(calls.length, 0);
  assert.equal(await users.findById(7), row);
  const hostile = "x' OR true --";
  assert.equal(await users.findByEmail(hostile), row);
  assert.equal(await users.insert({ nombre: "N", email: hostile, passwordHash: "hash", rol: "paciente" }), row);
  assert.equal(await notices.insert({ userId: 7, eventId: "event", type: "session.login", title: hostile, body: "B" }), result);
  assert.equal(await notices.listBefore(7, { before: row.id, limit: 21 }), result);
  assert.equal(await notices.findOwnedById(7, row.id), row);
  assert.equal(await notices.markRead(7, row.id), result);
  assert.equal(await notices.markAllRead(7), result);
  assert.equal(await state.ensure(7), result);
  assert.equal(await state.lock(7), result);
  assert.equal(await state.increment(7), result);
  assert.deepEqual(await state.summary(7), { unreadCount: 2, revision: row.revision });
  assert.equal(await health.check(), result);
  assert.deepEqual(calls.map((c) => c.params), [[7], [hostile], ["N", hostile, "hash", "paciente"],
    [7, "event", "session.login", hostile, "B"], [7, row.id, 21], [7, row.id], [7, row.id], [7], [7], [7], [7], [7], undefined]);
  assert.ok(calls.every(({ sql }) => !sql.includes(hostile)));
  for (const { sql } of calls.slice(4, 8)) assert.match(sql, /WHERE user_id = \$1/);
  assert.match(calls[3].sql, /ON CONFLICT \(user_id, event_id\) DO NOTHING/);
  assert.match(calls[6].sql, /read_at IS NULL/);
  assert.match(calls[9].sql, /FOR UPDATE/);
});

test("repositories preserve absent rows, no-op rowCount and original query failures", async () => {
  const empty = { rows: [], rowCount: 0 };
  const executor = { query: async () => empty };
  assert.equal(await createUserRepository(executor).findById(1), undefined);
  assert.equal(await createNotificationRepository(executor).findOwnedById(1, "2"), undefined);
  assert.equal(await createNotificationRepository(executor).markRead(1, "2"), empty);
  const original = new Error("database failure");
  executor.query = async () => { throw original; };
  for (const operation of [() => createUserRepository(executor).findById(1),
    () => createNotificationRepository(executor).markAllRead(1),
    () => createNotificationStateRepository(executor).summary(1), () => createDatabaseHealth(executor).check()]) {
    await assert.rejects(operation(), (error) => error === original);
  }
});
