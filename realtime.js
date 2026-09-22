const { Server } = require("socket.io");
const { authenticateToken } = require("./auth");

function attachRealtime(httpServer, { config, database }) {
  const origins = new Set(config.corsOrigins || []);
  const allowed = (origin) => !origin || origins.has(origin);
  const io = new Server(httpServer, {
    serveClient: false,
    maxHttpBufferSize: 32768,
    connectTimeout: 10000,
    cors: { origin: (origin, callback) => callback(null, allowed(origin)), methods: ["GET", "POST"] },
    allowRequest: (request, callback) => callback(null, allowed(request.headers.origin))
  });
  // Check subsequent polling requests and upgrades as well as the initial handshake.
  io.engine.use((request, response, next) => {
    if (!allowed(request.headers.origin)) return next(new Error("CORS_ORIGIN_DENIED"));
    next();
  });
  io.use(async (socket, next) => {
    try {
      const { user, claims } = await authenticateToken(database, config, socket.handshake.auth?.token);
      if (claims.exp * 1000 <= Date.now()) throw new Error();
      socket.data.userId = user.id;
      socket.data.expiresAt = claims.exp * 1000;
      next();
    } catch (_) { next(new Error("AUTH_INVALID")); }
  });
  io.on("connection", (socket) => {
    let timer;
    function checkExpiry() {
      const remaining = socket.data.expiresAt - Date.now();
      if (remaining <= 0) { socket.disconnect(true); return; }
      timer = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
      timer.unref();
    }
    socket.on("disconnect", () => clearTimeout(timer));
    checkExpiry();
    if (!socket.connected) return;
    socket.join(`user:${socket.data.userId}`);
    socket.emit("notifications:ready");
  });
  return {
    io,
    publish(userId, { revision, unreadCount }) {
      const room = io.sockets.adapter.rooms.get(`user:${userId}`);
      for (const id of room || []) {
        const socket = io.sockets.sockets.get(id);
        if (!socket) continue;
        if (socket.data.expiresAt <= Date.now()) { socket.disconnect(true); continue; }
        socket.emit("notifications:changed", { revision, unreadCount });
      }
    },
    close() { return new Promise((resolve) => io.close(resolve)); }
  };
}

module.exports = { attachRealtime };
