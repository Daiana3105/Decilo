const test = require("node:test");
const assert = require("node:assert/strict");
const { createNotificationService } = require("../notifications");

for (const method of ["list", "unreadCount", "markRead", "markAllRead"]) {
  test(`${method} uses one UoW client and preserves snapshot/lock ordering`, async () => {
    const order = [];
    const client = { async query(sql) { order.push(sql); }, release(discard) { assert.equal(discard, false); order.push("release"); } };
    const row = { id: "1", read_at: "date" };
    const service = createNotificationService({ async connect() { order.push("connect"); return client; } }, {
      notificationRepository(executor) { assert.equal(executor, client); return {
        async listBefore() { order.push("work"); return { rows: [] }; },
        async markRead() { order.push("work"); return { rows: [row], rowCount: 1 }; },
        async markAllRead() { order.push("work"); return { rowCount: 1 }; }
      }; },
      stateRepository(executor) { assert.equal(executor, client); return {
        async ensure() { order.push("ensure"); }, async lock() { order.push("lock"); },
        async increment() { order.push("increment"); },
        async summary() { order.push("summary"); return { revision: "9007199254740994", unreadCount: 0 }; }
      }; }
    });
    const result = await (method === "markRead" ? service[method](7, "1") : service[method](7));
    const write = method.startsWith("mark");
    assert.equal(result.revision, "9007199254740994");
    assert.deepEqual(order, ["connect", write ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
      "SET LOCAL statement_timeout = '5s'", "SET LOCAL lock_timeout = '2s'",
      ...(write ? ["ensure", "lock"] : []), ...(method !== "unreadCount" ? ["work"] : []),
      ...(write ? ["increment"] : []), "summary", "COMMIT", "release"]);
  });
}

test("missing or foreign markRead rolls back and retains indistinguishable 404", async () => {
  const order = [];
  const client = { async query(sql) { order.push(sql); }, release() { order.push("release"); } };
  const service = createNotificationService({ connect: async () => client }, {
    notificationRepository: () => ({ markRead: async () => ({ rows: [], rowCount: 0 }), findOwnedById: async () => undefined }),
    stateRepository: () => ({ ensure: async () => {}, lock: async () => {}, increment: () => assert.fail(), summary: () => assert.fail() })
  });
  await assert.rejects(service.markRead(7, "1"), { status: 404, code: "NOTIFICATION_NOT_FOUND" });
  assert.deepEqual(order.slice(-2), ["ROLLBACK", "release"]);
  assert.ok(!order.includes("COMMIT"));
});
