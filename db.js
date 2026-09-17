const { Pool } = require("pg");

const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('profesional', 'paciente', 'familiar')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

async function createDatabase(databaseConfig) {
  const database = new Pool(databaseConfig);
  await database.query(CREATE_USERS_TABLE);
  return database;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    fechaCreacion: user.created_at
  };
}

module.exports = { createDatabase, publicUser };
