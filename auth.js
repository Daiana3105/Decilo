const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { publicUser } = require("./db");

const ROLES = new Set(["profesional", "paciente", "familiar"]);
const PASSWORD_MIN_LENGTH = 8;

function validateRegistration(payload = {}) {
  const errors = {};
  const nombre = String(payload.nombre || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const confirmPassword = String(payload.confirmPassword || "");
  const rol = String(payload.rol || "").trim().toLowerCase();

  if (nombre.length < 2) errors.nombre = "Ingresá un nombre válido.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Ingresá un correo electrónico válido.";
  if (password.length < PASSWORD_MIN_LENGTH) errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (password !== confirmPassword) errors.confirmPassword = "Las contraseñas no coinciden.";
  if (!ROLES.has(rol)) errors.rol = "Elegí un rol válido.";

  return { errors, values: { nombre, email, password, rol } };
}

function signToken(user, config) {
  return jwt.sign({ sub: String(user.id), rol: user.rol }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function readBearerToken(header = "") {
  return typeof header === "string" ? /^Bearer ([^ ]+)$/.exec(header)?.[1] || null : null;
}

class AuthenticationError extends Error {}

async function authenticateToken(database, config, token) {
  let claims;
  try {
    if (typeof token !== "string") throw new Error();
    claims = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    if (typeof claims.sub !== "string" || !/^[1-9][0-9]{0,9}$/.test(claims.sub) ||
        Number(claims.sub) > 2147483647 || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) throw new Error();
  } catch (_) { throw new AuthenticationError("AUTH_INVALID"); }
  const result = await database.query("SELECT * FROM users WHERE id = $1", [Number(claims.sub)]);
  if (!result.rows[0]) throw new AuthenticationError("AUTH_INVALID");
  return { user: result.rows[0], claims };
}

function authMiddleware(database, config) {
  return async (request, response, next) => {
    const token = readBearerToken(request.headers.authorization);
    if (!token) return response.status(401).json({ error: "AUTH_REQUIRED", message: "Necesitás iniciar sesión." });

    try {
      const { user } = await authenticateToken(database, config, token);
      request.user = user;
      next();
    } catch (error) {
      if (!(error instanceof AuthenticationError)) return response.status(503).json({ error: "SERVICE_UNAVAILABLE", message: "El servicio no está disponible." });
      return response.status(401).json({ error: "AUTH_INVALID", message: "La sesión ya no es válida." });
    }
  };
}

async function registerUser(database, values) {
  const passwordHash = await bcrypt.hash(values.password, 12);
  const result = await database.query(`
    INSERT INTO users (nombre, email, password_hash, rol)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [values.nombre, values.email, passwordHash, values.rol]);
  return result.rows[0];
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  ROLES,
  authMiddleware,
  authenticateToken,
  AuthenticationError,
  registerUser,
  signToken,
  publicUser,
  validateRegistration,
  verifyPassword
};
