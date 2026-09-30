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
const { createNotificationService } = require("../notifications");

test("createLogin rolls back notice and revision for new and existing state and releases its single client", async () => {
  const fixture = await isolatedDatabase();
  const pool = new Pool({ ...fixture.databaseConfig, max: 1, connectionTimeoutMillis: 1000 });
  const service = createNotificationService(pool);
  try {
    const user = await createUserRepository(fixture.database).insert({ nombre: "Login", email: "login-uow@example.test", passwordHash: "synthetic", rol: "paciente" });
    const observer = createNotificationStateRepository(fixture.database);
    for (const existing of [false, true]) {
      if (existing) await service.createLogin(user.id);
      const before = await observer.summary(user.id);
      await fixture.database.query(`CREATE FUNCTION reject_login_revision() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'forced revision failure'; END $$;
        CREATE TRIGGER reject_login_revision BEFORE UPDATE ON notification_state
        FOR EACH ROW EXECUTE FUNCTION reject_login_revision()`);
      try {
        await assert.rejects(service.createLogin(user.id), { code: "P0001" });
        assert.deepEqual(await observer.summary(user.id), before);
        const notices = await createNotificationRepository(fixture.database).listBefore(user.id, { limit: 20 });
        assert.equal(notices.rowCount, existing ? 1 : 0);
        assert.equal((await fixture.database.query("SELECT * FROM notification_state WHERE user_id = $1", [user.id])).rowCount, existing ? 1 : 0);
        assert.equal((await pool.query("SELECT 1 AS ok")).rows[0].ok, 1);
      } finally {
        await fixture.database.query("DROP TRIGGER reject_login_revision ON notification_state; DROP FUNCTION reject_login_revision()");
      }
    }
    const event = randomUUID();
    assert.equal((await service.createLogin(user.id, event)).changed, true);
    assert.equal((await service.createLogin(user.id, event)).changed, false);
    assert.deepEqual(await observer.summary(user.id), { unreadCount: 2, revision: "2" });
  } finally {
    try { await pool.end(); } finally { await fixture.close(); }
  }
});

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
