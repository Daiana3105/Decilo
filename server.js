const express = require("express");
const { loadConfig } = require("./config");
const { createDatabase, publicUser } = require("./db");
const {
  authMiddleware,
  registerUser,
  signToken,
  validateRegistration,
  verifyPassword
} = require("./auth");

function createApp({ config = loadConfig(), database } = {}) {
  const app = express();
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
    return response.json({ token: signToken(user, config), user: publicUser(user) });
  });

  app.get("/api/auth/me", authMiddleware(database, config), (request, response) => {
    response.json({ user: publicUser(request.user) });
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) return response.status(400).json({ error: "INVALID_JSON", message: "La solicitud no contiene JSON válido." });
    console.error(error);
    return response.status(500).json({ error: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." });
  });

  return app;
}

if (require.main === module) {
  (async () => {
    const config = loadConfig();
    const database = await createDatabase(config.database);
    createApp({ config, database }).listen(config.port, () => console.log(`DECILO API escuchando en http://localhost:${config.port}`));
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { createApp };
