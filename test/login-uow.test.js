const test = require("node:test");
const assert = require("node:assert/strict");
const { createNotificationService } = require("../notifications");
const { createLoginNotifications } = require("../login-notifications");

for (const failCommit of [false, true]) {
  test(`secondary publication waits for COMMIT (${failCommit ? "rejection" : "success"})`, async () => {
    const order = [], logs = [];
    let unblock, entered;
    const gate = new Promise((resolve) => { unblock = resolve; });
    const reached = new Promise((resolve) => { entered = resolve; });
    const client = {
      async query(sql) {
        order.push(sql);
        if (sql === "COMMIT") { entered(); await gate; if (failCommit) throw new Error("private SQL"); order.push("committed"); }
      },
      release(discard) { order.push(["release", discard]); }
    };
    let connects = 0;
    const service = createNotificationService({ async connect() { connects++; return client; } }, {
      notificationRepository(executor) {
        assert.equal(executor, client);
        return { async insert(values) { assert.equal(values.userId, 7); order.push("insert"); return { rowCount: 1, rows: [] }; } };
      },
      stateRepository(executor) {
        assert.equal(executor, client);
        return {
          async ensure(id) { assert.equal(id, 7); order.push("ensure"); },
          async lock() { order.push("lock"); }, async increment() { order.push("increment"); },
          async summary() { return { revision: "1", unreadCount: 1 }; }
        };
      }
    });
    const jobs = createLoginNotifications({ service, logger: (entry) => logs.push(entry),
      publish(id, state) { assert.equal(id, 7); assert.equal(state.revision, "1"); order.push("notifications:changed"); }
    });
    jobs.schedule(7);
    await reached;
    try { assert.ok(!order.includes("notifications:changed")); assert.equal(order.some(Array.isArray), false); }
    finally { unblock(); await jobs.close(); }
    assert.equal(connects, 1);
    assert.deepEqual(order.slice(3, 7), ["ensure", "lock", "insert", "increment"]);
    assert.equal(order.filter(Array.isArray).length, 1);
    if (failCommit) {
      assert.deepEqual(order.slice(-2), ["ROLLBACK", ["release", true]]);
      assert.ok(!order.includes("notifications:changed"));
      assert.equal(logs.length, 1); assert.equal(logs[0].stage, "persist");
      assert.ok(!JSON.stringify(logs).includes("private"));
    } else {
      assert.deepEqual(order.slice(-3), ["committed", ["release", false], "notifications:changed"]);
      assert.deepEqual(logs, []);
    }
  });
}
