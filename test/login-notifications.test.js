const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoginNotifications } = require("../login-notifications");

test("secondary work is bounded and rejects overflow without queuing unbounded jobs", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const logs = [];
  let calls = 0;
  const jobs = createLoginNotifications({ maxPending: 2, logger: (entry) => logs.push(entry),
    service: { createLogin: async () => { calls++; await gate; return { changed: false }; } } });
  jobs.schedule(1); jobs.schedule(1); jobs.schedule(1);
  await Promise.resolve();
  assert.equal(calls, 2); assert.equal(logs[0].stage, "capacity");
  release(); await jobs.close(); jobs.schedule(1);
  assert.equal(logs.length, 2); assert.equal(calls, 2);
});

test("secondary publication happens after successful persistence only", async () => {
  const order = [];
  const jobs = createLoginNotifications({ service: { createLogin: async () => { order.push("persisted"); return { changed: true }; } },
    publish: () => order.push("published") });
  jobs.schedule(1); await jobs.drain();
  assert.deepEqual(order, ["persisted", "published"]);
});

test("asynchronous logging failure remains handled after a secondary failure", async () => {
  const jobs = createLoginNotifications({ service: { createLogin: async () => { throw new Error("private"); } },
    logger: async () => { throw new Error("private logger failure"); } });
  jobs.schedule(1);
  await jobs.close();
  // Let rejected microtasks settle; node:test detects unhandled rejections.
  await new Promise((resolve) => setImmediate(resolve));
});
