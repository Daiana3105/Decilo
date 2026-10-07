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
  const hosted = env.NODE_ENV === 'production' || Boolean(databaseUrl);
  const publicDemo = env.FAMILY_DEMO_PUBLIC_ENABLED === 'true';
  if (publicDemo && (!databaseUrl || env.FAMILY_DEMO_ENABLED !== 'true' || !/^[a-f0-9]{32}$/.test(env.FAMILY_DEMO_MARKER || ''))) {
    throw new Error('La demo pública requiere DATABASE_URL, FAMILY_DEMO_ENABLED y FAMILY_DEMO_MARKER válidos');
  }
  const geminiUsers = String(env.GEMINI_DEMO_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (geminiUsers.some(value => !/^[1-9][0-9]{0,9}$/.test(value) || Number(value) > 2147483647)) throw new Error('GEMINI_DEMO_USER_IDS inválido');

  return {
    port: Number(env.PORT || 3000),
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || "1h",
    familyDemo: { enabled: publicDemo || (env.FAMILY_DEMO_ENABLED === 'true' && !hosted &&
      env.DB_NAME === 'decilo_family_demo' && ['127.0.0.1', 'localhost', 'postgres'].includes(env.DB_HOST)),
      publicDemo,
      marker: String(env.FAMILY_DEMO_MARKER || '') },
    assistant: {
      enabled: hosted ? env.GEMINI_DEMO_ENABLED === 'true' : Boolean(String(env.GEMINI_API_KEY || '').trim()) || env.GEMINI_DEMO_ENABLED === 'true',
      allowedUserIds: hosted ? geminiUsers : null,
      apiKey: String(env.GEMINI_API_KEY || '').trim(),
      model: String(env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim()
    },
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
