const express = require("express");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { loadConfig } = require("./config");
const { createDatabase, createPool, publicUser } = require("./db");
const { createNotificationService, NotificationError } = require("./notifications");
const { createLoginNotifications, safeLog } = require("./login-notifications");
const { attachRealtime } = require("./realtime");
const {
  authMiddleware,
  registerUser,
  signToken,
  validateRegistration,
  verifyPassword
} = require("./auth");

function createApp({ config = loadConfig(), database, notificationService = createNotificationService(database),
  publish = () => {}, logger = (entry) => console.error(entry), loginNotifications } = {}) {
  const app = express();
  const jobs = loginNotifications || createLoginNotifications({ service: notificationService, publish, logger });
  app.locals.loginNotifications = jobs;
  app.disable("x-powered-by");
  const corsOrigins = new Set(config.corsOrigins || []);
  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (!origin) return next();
    if (!corsOrigins.has(origin)) return response.status(403).json({ error: "CORS_ORIGIN_DENIED", message: "El origen no está autorizado." });
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (request.method === "OPTIONS") return response.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", async (_request, response) => {
    try {
      await database.query("SELECT 1 AS ok");
      response.json({ status: "ok", database: "ok" });
    } catch (_error) {
      response.status(503).json({ status: "error", database: "unavailable" });
    }
  });

  app.post("/api/auth/register", async (request, response) => {
    const { errors, values } = validateRegistration(request.body);
    if (Object.keys(errors).length) return response.status(400).json({ error: "VALIDATION_ERROR", message: "Revisá los campos indicados.", fields: errors });

    try {
      const user = await registerUser(database, values);
      return response.status(201).json({ token: signToken(user, config), user: publicUser(user) });
    } catch (error) {
      if (error.code === "23505") return response.status(409).json({ error: "EMAIL_IN_USE", message: "Ese correo ya está registrado.", fields: { email: "Usá otro correo electrónico." } });
      throw error;
    }
  });

  app.post("/api/auth/login", async (request, response) => {
    const email = String(request.body?.email || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    const result = await database.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) return response.status(401).json({ error: "INVALID_CREDENTIALS", message: "El correo o la contraseña no son válidos." });
    response.json({ token: signToken(user, config), user: publicUser(user) });
    try { jobs.schedule(user.id); }
    catch (_) { safeLog(logger, "schedule", randomUUID()); }
  });

  app.get("/api/auth/me", authMiddleware(database, config), (request, response) => {
    response.json({ user: publicUser(request.user) });
  });

  const notifications = express.Router();
  notifications.use((_request, response, next) => { response.setHeader("Cache-Control", "no-store"); next(); });
  notifications.use(authMiddleware(database, config));
  function notificationRoute(operation) {
    return async (request, response) => {
      try {
        const { changed, ...result } = await operation(request);
        if (changed) {
          try { await publish(request.user.id, result); }
          catch (_) { safeLog(logger, "emit", randomUUID()); }
        }
        response.json(result);
      } catch (error) {
        if (error instanceof NotificationError) return response.status(error.status).json({ error: error.code, message: error.message });
        safeLog(logger, "request", randomUUID());
        response.status(503).json({ error: "NOTIFICATIONS_UNAVAILABLE", message: "Las notificaciones no están disponibles. Reintentá más tarde." });
      }
    };
  }
  notifications.get("/", notificationRoute((request) => notificationService.list(request.user.id, request.query)));
  notifications.get("/unread-count", notificationRoute((request) => notificationService.unreadCount(request.user.id)));
  notifications.post("/read-all", notificationRoute((request) => notificationService.markAllRead(request.user.id)));
  notifications.post("/:id/read", notificationRoute((request) => notificationService.markRead(request.user.id, request.params.id)));
  app.use("/api/notifications", notifications);

  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) return response.status(400).json({ error: "INVALID_JSON", message: "La solicitud no contiene JSON válido." });
    console.error(error);
    return response.status(500).json({ error: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." });
  });

  return app;
}

async function createServer({ config = loadConfig(), database, logger, notificationService, loginNotifications } = {}) {
  const ownsDatabase = !database;
  database = database || await createDatabase(config.database);
  // Separate, bounded pool prevents slow secondary writes from taking all auth connections.
  const backgroundDatabase = config.database ? createPool({ ...config.database, max: 2,
    connectionTimeoutMillis: 1000, statement_timeout: 5000, idle_in_transaction_session_timeout: 10000 }) : null;
  let realtime;
  const publish = (userId, state) => realtime.publish(userId, state);
  const service = notificationService || createNotificationService(database);
  const jobs = loginNotifications || createLoginNotifications({
    service: notificationService || createNotificationService(backgroundDatabase || database),
    publish, logger
  });
  const app = createApp({ config, database, notificationService: service, publish, logger, loginNotifications: jobs });
  const httpServer = http.createServer(app);
  realtime = attachRealtime(httpServer, { config, database });
  let closing;
  return { app, httpServer, io: realtime.io, notifications: service,
    close() {
      closing ||= (async () => {
        await realtime.close();
        await jobs.close();
        if (backgroundDatabase) await backgroundDatabase.end();
        if (ownsDatabase) await database.end();
      })();
      return closing;
    }
  };
}

if (require.main === module) {
  (async () => {
    const config = loadConfig();
    const server = await createServer({ config });
    server.httpServer.listen(config.port, () => console.log(`DECILO API escuchando en http://localhost:${config.port}`));
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { server.close().catch(() => { process.exitCode = 1; }); });
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { createApp, createServer };
