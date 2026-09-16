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
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

function authMiddleware(database, config) {
  return (request, response, next) => {
    const token = readBearerToken(request.headers.authorization);
    if (!token) return response.status(401).json({ error: "AUTH_REQUIRED", message: "Necesitás iniciar sesión." });

    try {
      const claims = jwt.verify(token, config.jwtSecret);
      const user = database.prepare("SELECT * FROM users WHERE id = ?").get(Number(claims.sub));
      if (!user) return response.status(401).json({ error: "AUTH_INVALID", message: "La sesión ya no es válida." });
      request.user = user;
      next();
    } catch (_error) {
      return response.status(401).json({ error: "AUTH_INVALID", message: "La sesión ya no es válida." });
    }
  };
}

function registerUser(database, values) {
  const passwordHash = bcrypt.hashSync(values.password, 12);
  const result = database.prepare(`
    INSERT INTO users (nombre, email, password_hash, rol)
    VALUES (@nombre, @email, @passwordHash, @rol)
  `).run({ ...values, passwordHash });
  return database.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  ROLES,
  authMiddleware,
  registerUser,
  signToken,
  publicUser,
  validateRegistration,
  verifyPassword
};
