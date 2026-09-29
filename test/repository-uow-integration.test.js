const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");
const { isolatedDatabase } = require("../scripts/test-database");
const { createUnitOfWork } = require("../unit-of-work");
const { createUserRepository } = require("../repositories/user-repository");
const { createNotificationRepository } = require("../repositories/notification-repository");
const { createNotificationStateRepository } = require("../repositories/notification-state-repository");
const { createDatabaseHealth } = require("../repositories/database-health");

test("base repositories commit and roll back together in isolated PostgreSQL without leaking a client", async () => {
  const fixture = await isolatedDatabase();
  const pool = new Pool({ ...fixture.databaseConfig, max: 1, connectionTimeoutMillis: 1000 });
  const uow = createUnitOfWork(pool);
  try {
    const user = await createUserRepository(fixture.database).insert({ nombre: "UoW", email: "uow@example.test", passwordHash: "synthetic-hash", rol: "paciente" });
    const eventId = randomUUID();
    const insert = async (client, event) => {
      const state = createNotificationStateRepository(client);
      await state.ensure(user.id); await state.lock(user.id);
      const result = await createNotificationRepository(client).insert({ userId: user.id, eventId: event, type: "session.login", title: "Prueba", body: "Prueba" });
      if (result.rowCount) await state.increment(user.id);
      return result;
    };
    await uow.run((client) => insert(client, eventId));
    const observer = createNotificationStateRepository(fixture.database);
    assert.deepEqual(await observer.summary(user.id), { unreadCount: 1, revision: "1" });
    await uow.run((client) => insert(client, eventId));
    assert.deepEqual(await observer.summary(user.id), { unreadCount: 1, revision: "1" });
    // PostgreSQL rejects the second statement; the preceding insert must disappear.
    await assert.rejects(uow.run(async (client) => {
      await createNotificationRepository(client).insert({ userId: user.id, eventId: randomUUID(), type: "session.login", title: "Rollback", body: "Rollback" });
      await client.query("UPDATE notification_state SET revision = -1 WHERE user_id = $1", [user.id]);
    }), { code: "23514" });
    assert.deepEqual(await observer.summary(user.id), { unreadCount: 1, revision: "1" });
    assert.equal((await createNotificationRepository(fixture.database).listBefore(user.id, { limit: 20 })).rows.length, 1);
    // With max=1 this bounded acquisition fails if either path leaked its client.
    await uow.run(async (client) => {
      assert.equal((await createDatabaseHealth(client).check()).rows[0].ok, 1);
      assert.equal((await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only, "on");
      assert.equal((await client.query("SHOW transaction_isolation")).rows[0].transaction_isolation, "repeatable read");
    }, { readOnly: true });
  } finally {
    await pool.end();
    await fixture.close();
  }
});
