const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { io } = require("socket.io-client");
const { isolatedDatabase } = require("../scripts/test-database");
const { createServer } = require("../server");
const { signToken } = require("../auth");

const baseConfig = { jwtSecret: "test-secret-that-is-longer-than-32-characters", jwtExpiresIn: "1h", corsOrigins: ["http://localhost:8080"] };
let fixture, db, server, url, a, b;
const clients = new Set();
const password = "prueba-segura";

function event(socket, name, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const listener = (value) => { clearTimeout(timer); resolve(value); };
    const timer = setTimeout(() => { socket.off(name, listener); reject(new Error(`Timeout: ${name}`)); }, timeout);
    socket.once(name, listener);
  });
}
function newClient(token, options = {}) {
  const socket = io(url, { autoConnect: false, forceNew: true, reconnection: false, timeout: 1500,
    transports: ["websocket"], auth: { token }, ...options });
  clients.add(socket); return socket;
}
async function connect(user, options = {}) {
  const socket = newClient(signToken(user, baseConfig), options);
  const ready = event(socket, "notifications:ready"); socket.connect(); await ready; return socket;
}
async function start() {
  server = await createServer({ config: { ...baseConfig, database: fixture.databaseConfig }, database: db });
  await new Promise((resolve) => server.httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.httpServer.address().port}`;
}
function get(path, user = a) { return request(url).get(path).set("Authorization", `Bearer ${signToken(user, baseConfig)}`); }
function post(path, user = a) { return request(url).post(path).set("Authorization", `Bearer ${signToken(user, baseConfig)}`); }

test.before(async () => { fixture = await isolatedDatabase(); db = fixture.database; });
test.beforeEach(async () => {
  await fixture.reset();
  const hash = await bcrypt.hash(password, 4);
  a = (await db.query("INSERT INTO users (nombre,email,password_hash,rol) VALUES ('A','a@example.test',$1,'paciente') RETURNING *", [hash])).rows[0];
  b = (await db.query("INSERT INTO users (nombre,email,password_hash,rol) VALUES ('B','b@example.test',$1,'familiar') RETURNING *", [hash])).rows[0];
  await start();
});
test.afterEach(async () => {
  for (const socket of clients) socket.disconnect(); clients.clear();
  await server?.close();
});
test.after(async () => { await fixture?.close(); });

test("shared HTTP server exposes health, JWT REST and authorized polling/WebSocket", async () => {
  assert.equal((await request(url).get("/api/health")).status, 200);
  for (const transports of [["websocket"], ["polling"]]) {
    const socket = await connect(a, { transports, extraHeaders: { Origin: "http://localhost:8080" } });
    assert.equal(socket.connected, true); assert.equal(socket.io.engine.transport.name, transports[0]);
    socket.disconnect();
  }
});

test("Socket.IO rejects missing, forged, expired and malformed JWT identities", async () => {
  const signed = (claims, options = {}) => jwt.sign(claims, baseConfig.jwtSecret, options);
  const tokens = [undefined, "bad-token", signed({ sub: String(a.id) }, { expiresIn: -1 }),
    signed({ sub: "0" }, { expiresIn: 60 }), signed({ sub: "x" }, { expiresIn: 60 }),
    signed({ sub: 1 }, { expiresIn: 60 }), signed({ sub: "2147483648" }, { expiresIn: 60 }),
    signed({ sub: "2147483647" }, { expiresIn: 60 }), signed({ sub: String(a.id) }),
    signed({ sub: String(a.id) }, { expiresIn: 60, algorithm: "HS384" }),
    jwt.sign({ sub: String(a.id) }, "wrong-secret", { expiresIn: 60 })];
  for (const token of tokens) {
    const socket = newClient(token); const rejected = event(socket, "connect_error");
    socket.connect(); assert.equal((await rejected).message, "AUTH_INVALID");
    assert.equal(socket.connected, false); socket.disconnect();
  }
  assert.equal(server.io.sockets.sockets.size, 0);
});

test("untrusted browser origins are denied for polling and WebSocket", async () => {
  for (const transports of [["polling"], ["websocket"]]) {
    const socket = newClient(signToken(a, baseConfig), { transports, extraHeaders: { Origin: "https://untrusted.example" } });
    const rejected = event(socket, "connect_error"); socket.connect(); await rejected;
    assert.equal(socket.connected, false); socket.disconnect();
  }
});

test("two tabs receive another login and reads while other users stay isolated", async () => {
  const first = await connect(a); const second = await connect(a); const other = await connect(b);
  const otherEvents = []; other.on("notifications:changed", (data) => otherEvents.push(data));
  const firstChange = event(first, "notifications:changed"); const secondChange = event(second, "notifications:changed");
  const login = await request(url).post("/api/auth/login").send({ email: a.email, password });
  assert.equal(login.status, 200); assert.ok(login.body.token);
  const changes = await Promise.all([firstChange, secondChange]);
  assert.deepEqual(changes, [{ unreadCount: 1, revision: "1" }, { unreadCount: 1, revision: "1" }]);
  const page = await get("/api/notifications");
  assert.equal(page.body.notifications.length, 1); assert.equal(page.body.unreadCount, 1);
  const readEvents = [event(first, "notifications:changed"), event(second, "notifications:changed")];
  assert.equal((await post(`/api/notifications/${page.body.notifications[0].id}/read`)).status, 200);
  assert.deepEqual(await Promise.all(readEvents), [{ unreadCount: 0, revision: "2" }, { unreadCount: 0, revision: "2" }]);
  const another = [event(first, "notifications:changed"), event(second, "notifications:changed")];
  await request(url).post("/api/auth/login").send({ email: a.email, password }); await Promise.all(another);
  const readAll = [event(first, "notifications:changed"), event(second, "notifications:changed")];
  await post("/api/notifications/read-all");
  assert.deepEqual(await Promise.all(readAll), [{ unreadCount: 0, revision: "4" }, { unreadCount: 0, revision: "4" }]);
  // A later event to B provides a delivery barrier on B's own connection.
  const otherChange = event(other, "notifications:changed");
  await request(url).post("/api/auth/login").send({ email: b.email, password }); await otherChange;
  assert.deepEqual(otherEvents, [{ unreadCount: 1, revision: "1" }]);
  assert.equal((await get("/api/notifications", b)).body.notifications.length, 1);
});

test("client cannot choose another room or mutate notifications through socket messages", async () => {
  const socket = await connect(a, { auth: { token: signToken(a, baseConfig), userId: b.id, room: `user:${b.id}`, rol: "familiar" } });
  socket.emit("join", `user:${b.id}`); socket.emit("notifications:create", { userId: b.id }); socket.emit("notifications:read-all");
  const changes = []; socket.on("notifications:changed", (value) => changes.push(value));
  await request(url).post("/api/auth/login").send({ email: b.email, password });
  await server.app.locals.loginNotifications.drain();
  const change = event(socket, "notifications:changed");
  await request(url).post("/api/auth/login").send({ email: a.email, password }); await change;
  assert.deepEqual(changes, [{ unreadCount: 1, revision: "1" }]);
  assert.equal((await get("/api/notifications")).body.notifications.length, 1);
  const rooms = [...server.io.sockets.sockets.get(socket.id).rooms];
  assert.ok(rooms.includes(`user:${a.id}`)); assert.ok(!rooms.includes(`user:${b.id}`));
});

test("connected JWT expires and the same token is rejected on reconnection", async () => {
  const token = jwt.sign({ sub: String(a.id), exp: Math.floor(Date.now() / 1000) + 2 }, baseConfig.jwtSecret);
  const socket = newClient(token);
  const ready = event(socket, "notifications:ready"); socket.connect(); await ready;
  const notices = []; socket.on("notifications:changed", (value) => notices.push(value));
  assert.equal(await event(socket, "disconnect"), "io server disconnect");
  assert.equal(socket.active, false); // Server disconnect does not retry automatically.
  await request(url).post("/api/auth/login").send({ email: a.email, password });
  await server.app.locals.loginNotifications.drain();
  assert.deepEqual(notices, []);
  const rejected = event(socket, "connect_error"); socket.connect();
  assert.equal((await rejected).message, "AUTH_INVALID");
});

test("reconnection and server restart recover persisted state through REST without new notices", async () => {
  const socket = await connect(a);
  socket.disconnect();
  await request(url).post("/api/auth/login").send({ email: a.email, password });
  await server.app.locals.loginNotifications.drain();
  await post("/api/notifications/read-all");
  const before = (await get("/api/notifications")).body;
  const ready = event(socket, "notifications:ready"); socket.connect(); await ready;
  assert.deepEqual((await get("/api/notifications")).body, before);
  await server.close(); await start();
  await connect(a);
  assert.deepEqual((await get("/api/notifications")).body, before);
});

test("missing user is rejected on reconnection even with a valid signed token", async () => {
  const socket = await connect(a); socket.disconnect();
  await db.query("DELETE FROM users WHERE id=$1", [a.id]);
  const rejected = event(socket, "connect_error"); socket.connect();
  assert.equal((await rejected).message, "AUTH_INVALID");
});

test("rolled back secondary notice emits no update and leaves login valid", async () => {
  const socket = await connect(a); const changes = [];
  socket.on("notifications:changed", (state) => changes.push(state));
  await db.query(`CREATE FUNCTION fail_notice() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'forced failure'; END $$;
    CREATE TRIGGER fail_notice BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fail_notice()`);
  try {
    const result = await request(url).post("/api/auth/login").send({ email: a.email, password });
    assert.equal(result.status, 200); assert.ok(result.body.token);
    await server.app.locals.loginNotifications.drain();
    assert.deepEqual((await get("/api/notifications/unread-count")).body, { unreadCount: 0, revision: "0" });
  } finally { await db.query("DROP TRIGGER fail_notice ON notifications; DROP FUNCTION fail_notice()"); }
  const next = event(socket, "notifications:changed");
  await request(url).post("/api/auth/login").send({ email: a.email, password }); await next;
  assert.deepEqual(changes, [{ unreadCount: 1, revision: "1" }]);
});
