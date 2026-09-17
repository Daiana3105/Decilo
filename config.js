function loadConfig(env = process.env) {
  const jwtSecret = String(env.JWT_SECRET || "").trim();
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET es obligatorio y debe tener al menos 32 caracteres");
  }

  const requiredDatabaseValues = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  const missingDatabaseValues = requiredDatabaseValues.filter((key) => !String(env[key] || "").trim());
  if (missingDatabaseValues.length) {
    throw new Error(`Configuración PostgreSQL incompleta: faltan ${missingDatabaseValues.join(", ")}`);
  }

  return {
    port: Number(env.PORT || 3000),
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || "1h",
    database: {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      max: Number(env.DB_POOL_MAX || 10)
    }
  };
}

module.exports = { loadConfig };
