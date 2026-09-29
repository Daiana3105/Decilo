const test = require("node:test");
const assert = require("node:assert/strict");
const { createUnitOfWork } = require("../unit-of-work");

function fixture(failures = {}) {
  const calls = [];
  const client = {
    async query(sql) { calls.push(sql); if (sql in failures) throw failures[sql]; },
    async release(discard) { calls.push(["release", discard]); if ("release" in failures) throw failures.release; }
  };
  const pool = {
    async connect() { calls.push("connect"); if ("connect" in failures) throw failures.connect; return client; },
    query() { assert.fail("pool.query must not be used"); }
  };
  return { calls, client, uow: createUnitOfWork(pool) };
}

test("UoW commits on one client, waits for callback and releases once", async () => {
  const f = fixture();
  const result = await f.uow.run(async (client) => {
    assert.equal(client, f.client);
    await client.query("WRITE"); return { value: 1 };
  });
  assert.deepEqual(result, { value: 1 });
  assert.deepEqual(f.calls, ["connect", "BEGIN", "SET LOCAL statement_timeout = '5s'", "SET LOCAL lock_timeout = '2s'", "WRITE", "COMMIT", ["release", false]]);
});

for (const stage of ["BEGIN", "SET LOCAL statement_timeout = '5s'", "SET LOCAL lock_timeout = '2s'", "WRITE", "COMMIT"]) {
  test(`UoW rolls back and releases after ${stage} failure`, async () => {
    const error = new Error(stage), f = fixture({ [stage]: error });
    await assert.rejects(f.uow.run((client) => client.query("WRITE")), (actual) => actual === error);
    assert.deepEqual(f.calls.slice(-2), ["ROLLBACK", ["release", stage === "BEGIN" || stage === "COMMIT"]]);
    assert.equal(f.calls.filter((call) => Array.isArray(call)).length, 1);
    if (stage !== "COMMIT") assert.ok(!f.calls.includes("COMMIT"));
  });
}

for (const cleanup of ["rollback", "release", "both"]) {
  test(`UoW preserves callback error when ${cleanup} fails`, async () => {
    const original = new Error("original"), failures = {};
    if (cleanup !== "release") failures.ROLLBACK = new Error("rollback");
    if (cleanup !== "rollback") failures.release = new Error("release");
    const f = fixture(failures);
    await assert.rejects(f.uow.run(() => { throw original; }), (error) => error === original);
    assert.deepEqual(f.calls.slice(-2), ["ROLLBACK", ["release", cleanup !== "release"]]);
  });
}

test("UoW reports release failure after commit without rollback or retry", async () => {
  const error = new Error("release"), f = fixture({ release: error });
  await assert.rejects(f.uow.run(async () => 1), (actual) => actual === error);
  assert.deepEqual(f.calls.slice(-2), ["COMMIT", ["release", false]]);
  assert.ok(!f.calls.includes("ROLLBACK"));
});

test("UoW does not release or run callback when acquisition fails", async () => {
  const error = new Error("connect"), f = fixture({ connect: error });
  await assert.rejects(f.uow.run(() => assert.fail()), (actual) => actual === error);
  assert.deepEqual(f.calls, ["connect"]);
});

test("UoW keeps read snapshots and rejects non-boolean options before acquisition", async () => {
  const f = fixture();
  await f.uow.run(async () => {}, { readOnly: true });
  assert.equal(f.calls[1], "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const invalid = fixture();
  await assert.rejects(invalid.uow.run(() => {}, { readOnly: "false" }), TypeError);
  assert.deepEqual(invalid.calls, []);
});

test("UoW awaits COMMIT before resolving or releasing", async () => {
  let unblock, entered;
  const gate = new Promise((resolve) => { unblock = resolve; });
  const pendingCommit = new Promise((resolve) => { entered = resolve; });
  const f = fixture(), query = f.client.query;
  f.client.query = async (sql) => { await query(sql); if (sql === "COMMIT") { entered(); await gate; } };
  let resolved = false;
  const run = f.uow.run(async () => 42).then((value) => { resolved = true; return value; });
  await pendingCommit;
  assert.equal(resolved, false); assert.equal(f.calls.some(Array.isArray), false);
  unblock(); assert.equal(await run, 42);
  assert.deepEqual(f.calls.at(-1), ["release", false]);
});

test("UoW waits for BEGIN to finish before invoking work", async () => {
  let unblock, entered;
  const gate = new Promise((resolve) => { unblock = resolve; });
  const pendingBegin = new Promise((resolve) => { entered = resolve; });
  const f = fixture(), query = f.client.query;
  f.client.query = async (sql) => { await query(sql); if (sql === "BEGIN") { entered(); await gate; } };
  let worked = false;
  const run = f.uow.run(async () => { worked = true; return 42; });
  await pendingBegin;
  try {
    assert.equal(worked, false);
    assert.deepEqual(f.calls, ["connect", "BEGIN"]);
  } finally { unblock(); }
  assert.equal(await run, 42);
});

test("UoW preserves COMMIT rejection when rollback and release also reject", async () => {
  const original = new Error("commit"), f = fixture({
    COMMIT: original, ROLLBACK: new Error("rollback"), release: new Error("release")
  });
  await assert.rejects(f.uow.run((client) => client.query("WRITE")), (error) => error === original);
  assert.deepEqual(f.calls, ["connect", "BEGIN", "SET LOCAL statement_timeout = '5s'",
    "SET LOCAL lock_timeout = '2s'", "WRITE", "COMMIT", "ROLLBACK", ["release", true]]);
});

test("concurrent units keep distinct clients and release each once", async () => {
  const first = fixture(), second = fixture();
  let acquisitions = 0;
  const uow = createUnitOfWork({ connect: async () => acquisitions++ === 0 ? first.client : second.client });
  await Promise.all([uow.run((c) => c.query("FIRST")), uow.run((c) => c.query("SECOND"))]);
  assert.equal(acquisitions, 2);
  assert.ok(first.calls.includes("FIRST") && !first.calls.includes("SECOND"));
  assert.ok(second.calls.includes("SECOND") && !second.calls.includes("FIRST"));
  for (const f of [first, second]) assert.deepEqual(f.calls.filter(Array.isArray), [["release", false]]);
});
