const express = require("express");
const jwt = require("jsonwebtoken");
const { loadConfig } = require("./config");
const { createDatabase, publicUser } = require("./db");
const {
  authMiddleware,
  registerUser,
  signToken,
  validateRegistration,
  verifyPassword
} = require("./auth");

function createApp({ config = loadConfig(), database = createDatabase(config.dbPath) } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", (_request, response) => {
    try {
      database.prepare("SELECT 1 AS ok").get();
      response.json({ status: "ok", database: "ok" });
    } catch (_error) {
      response.status(503).json({ status: "error", database: "unavailable" });
    }
  });

  app.post("/api/auth/register", (request, response) => {
    const { errors, values } = validateRegistration(request.body);
    if (Object.keys(errors).length) return response.status(400).json({ error: "VALIDATION_ERROR", message: "Revisá los campos indicados.", fields: errors });

    try {
      const user = registerUser(database, values);
      return response.status(201).json({ token: signToken(user, config), user: publicUser(user) });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return response.status(409).json({ error: "EMAIL_IN_USE", message: "Ese correo ya está registrado.", fields: { email: "Usá otro correo electrónico." } });
      throw error;
    }
  });

  app.post("/api/auth/login", (request, response) => {
    const email = String(request.body?.email || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    const user = database.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email);
    if (!user || !verifyPassword(password, user.password_hash)) return response.status(401).json({ error: "INVALID_CREDENTIALS", message: "El correo o la contraseña no son válidos." });
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
  const config = loadConfig();
  const database = createDatabase(config.dbPath);
  createApp({ config, database }).listen(config.port, () => console.log(`DECILO API escuchando en http://localhost:${config.port}`));
}

module.exports = { createApp };
