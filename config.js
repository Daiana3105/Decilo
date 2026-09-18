function loadConfig(env = process.env) {
  const jwtSecret = String(env.JWT_SECRET || "").trim();
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET es obligatorio y debe tener al menos 32 caracteres");
  }

  const databaseUrl = String(env.DATABASE_URL || "").trim();
  const requiredDatabaseValues = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  const missingDatabaseValues = requiredDatabaseValues.filter((key) => !String(env[key] || "").trim());
  if (!databaseUrl && missingDatabaseValues.length) throw new Error(`Configuración PostgreSQL incompleta: faltan ${missingDatabaseValues.join(", ")}`);

  const localFrontendUrls = String(env.LOCAL_FRONTEND_URL || "http://localhost:8080,http://127.0.0.1:8080")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const frontendPublicUrl = String(env.FRONTEND_PUBLIC_URL || "").trim().replace(/\/$/, "");

  return {
    port: Number(env.PORT || 3000),
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || "1h",
    corsOrigins: [...new Set([frontendPublicUrl, ...localFrontendUrls].filter(Boolean))],
    database: databaseUrl ? { connectionString: databaseUrl, max: Number(env.DB_POOL_MAX || 10) } : {
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
