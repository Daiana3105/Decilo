const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createController } = require("../notifications-client");

const tick = () => new Promise((resolve) => setImmediate(resolve));
const snapshot = (rev, count = Number(rev), ids = [rev], cursor = null) => ({ revision: rev, unreadCount: count,
  notifications: ids.map((id) => ({ id, title: "Notice", body: "Body", createdAt: "2026-09-22T12:00:00Z", readAt: null })), nextCursor: cursor });
function harness() {
  const requests = [], sockets = [], timers = new Map();
  const documentTarget = new EventTarget(); documentTarget.visibilityState = "visible";
  const windowTarget = new EventTarget(); let unauthorized = 0, counter = 0;
  const controller = createController({ documentTarget, windowTarget,
    onUnauthorized: () => unauthorized++, setTimer: (fn, ms) => { const id = ++counter; timers.set(id, { fn, ms }); return id; },
    clearTimer: (id) => timers.delete(id),
    fetchImpl: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, reject,
      respond: (body, status = 200) => resolve({ status, ok: status === 200, json: async () => body }) })),
    socketFactory: (_url, options) => {
      const socket = new EventEmitter(); socket.options = options;
      socket.connect = () => { socket.active = true; }; socket.disconnect = () => { socket.active = false; socket.disconnected = true; };
      sockets.push(socket); return socket;
    }
  });
  return { controller, requests, sockets, timers, documentTarget, windowTarget,
    unauthorized: () => unauthorized,
    start: (id = "1") => controller.start({ userId: id, token: `token-${id}` }),
    async answer(body, status = 200) { requests.at(-1).respond(body, status); await tick(); },
    async retry() { const entry = [...timers.entries()].find(([, t]) => t.ms < 10000); assert.ok(entry); timers.delete(entry[0]); entry[1].fn(); await tick(); }
  };
}

test("session starts REST without waiting for socket; lifecycle signals coalesce and listeners are stable", async () => {
  const h = harness(); h.start(); h.start(); await tick();
  assert.equal(h.sockets.length, 1); assert.equal(h.requests.length, 1);
  assert.equal(h.sockets[0].options.auth.token, "token-1"); assert.equal(h.sockets[0].options.query, undefined);
  await h.answer(snapshot("1", 27)); assert.equal(h.controller.getState().unreadCount, 27);
  for (const name of ["connect", "notifications:ready"]) h.sockets[0].emit(name);
  h.documentTarget.dispatchEvent(new Event("visibilitychange")); h.windowTarget.dispatchEvent(new Event("online"));
  await tick(); assert.equal(h.requests.length, 2); await h.answer(snapshot("1", 27));
  assert.equal(h.timers.size, 0); // no periodic REST polling
  h.controller.stop(); h.documentTarget.dispatchEvent(new Event("visibilitychange"));
  h.windowTarget.dispatchEvent(new Event("online")); await tick();
  assert.equal(h.requests.length, 2); assert.equal(h.sockets[0].eventNames().length, 0);
  assert.equal(h.sockets[0].disconnected, true); assert.equal(h.controller.getState().unreadCount, null);
});

test("newer socket revision rejects an in-flight old snapshot and repeated events do not duplicate fetches", async () => {
  const h = harness(); h.start(); await tick();
  h.sockets[0].emit("notifications:changed", { revision: "12", unreadCount: 999 });
  await h.answer(snapshot("11", 11)); assert.equal(h.controller.getState().unreadCount, null);
  await h.retry(); await h.answer(snapshot("12", 8));
  for (let i = 0; i < 5; i++) h.sockets[0].emit("notifications:changed", { revision: "12", unreadCount: 999 });
  await tick(); assert.equal(h.requests.length, 2); assert.equal(h.controller.getState().unreadCount, 8);
  h.controller.stop();
});

test("pagination deduplicates IDs and invalidates pages when revision changes", async () => {
  const h = harness(); h.start(); await tick(); await h.answer(snapshot("1", 30, ["3", "2"], "2"));
  h.controller.loadMore(); h.controller.loadMore(); await tick();
  assert.match(h.requests.at(-1).url, /before=2/);
  await h.answer(snapshot("1", 30, ["2", "1"], "1"));
  assert.deepEqual(h.controller.getState().notifications.map((n) => n.id), ["3", "2", "1"]);
  h.controller.loadMore(); await tick(); await h.answer(snapshot("2", 0, ["1"]));
  assert.equal(h.controller.getState().revision, "1"); assert.doesNotMatch(h.requests.at(-1).url, /before=/);
  await h.answer(snapshot("2", 0, ["4", "3"]));
  assert.deepEqual(h.controller.getState().notifications.map((n) => n.id), ["4", "3"]);
  h.controller.stop();
});

test("reads serialize with refresh and only the following snapshot changes the count", async () => {
  const h = harness(); h.start(); await tick(); await h.answer(snapshot("1", 40));
  h.controller.markRead("1"); h.controller.markRead("all"); await tick();
  assert.equal(h.requests.at(-1).options.method, "POST"); assert.match(h.requests.at(-1).url, /\/1\/read$/);
  await h.answer({ revision: "2", unreadCount: 39 });
  assert.equal(h.controller.getState().unreadCount, 40);
  await h.answer(snapshot("2", 39)); assert.equal(h.controller.getState().unreadCount, 39);
  h.controller.markRead("all"); await tick(); assert.match(h.requests.at(-1).url, /read-all$/);
  h.sockets[0].emit("notifications:changed", { revision: "4" });
  await h.answer({ revision: "3", unreadCount: 0 }); await h.answer(snapshot("4", 1));
  assert.equal(h.controller.getState().unreadCount, 1); h.controller.stop();
});

test("late responses from previous identities never apply, even when fetch ignores abort", async () => {
  const h = harness(); h.start(); await tick(); const old = h.requests[0];
  h.start("2"); await tick(); assert.equal(old.options.signal.aborted, true);
  await h.answer(snapshot("1", 0, [])); old.respond(snapshot("99", 99)); await tick();
  assert.equal(h.controller.getState().userId, "2"); assert.equal(h.controller.getState().unreadCount, 0);
  assert.equal(h.sockets[0].eventNames().length, 0); h.controller.stop();
});

test("failed reads keep last count with bounded retries; 401 clears state without retry", async () => {
  const h = harness(); h.start(); await tick(); await h.answer(snapshot("1", 5));
  h.controller.refresh(); await tick(); await h.answer({}, 503);
  for (let i = 0; i < 2; i++) { await h.retry(); await h.answer({}, 503); }
  assert.equal(h.timers.size, 0); assert.equal(h.controller.getState().unreadCount, 5);
  assert.equal(h.controller.getState().stale, true); assert.ok(h.controller.getState().error);
  h.controller.refresh(); await tick(); await h.answer({}, 401);
  assert.equal(h.unauthorized(), 1); assert.equal(h.controller.getState().userId, null); assert.equal(h.timers.size, 0);
});

test("socket rejects expired identity without reconnect loops; hidden tab waits until visible", async () => {
  const h = harness(); h.start(); await tick(); await h.answer(snapshot("0", 0, []));
  h.documentTarget.visibilityState = "hidden"; h.documentTarget.dispatchEvent(new Event("visibilitychange"));
  await tick(); assert.equal(h.requests.length, 1);
  h.documentTarget.visibilityState = "visible"; h.documentTarget.dispatchEvent(new Event("visibilitychange"));
  await tick(); await h.answer(snapshot("2", 2)); assert.equal(h.controller.getState().unreadCount, 2);
  h.sockets[0].emit("connect_error", new Error("AUTH_INVALID"));
  assert.equal(h.unauthorized(), 1); assert.equal(h.sockets[0].disconnected, true);
});
