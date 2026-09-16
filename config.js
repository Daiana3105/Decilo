const path = require("node:path");

function loadConfig(env = process.env) {
  const jwtSecret = String(env.JWT_SECRET || "").trim();
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET es obligatorio y debe tener al menos 32 caracteres");
  }

  return {
    port: Number(env.PORT || 3000),
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || "1h",
    dbPath: env.DB_PATH || path.join(__dirname, "data", "decilo.sqlite")
  };
}

module.exports = { loadConfig };
