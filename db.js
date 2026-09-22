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
  const database = createPool(databaseConfig);
  try {
    await initializeDatabase(database);
    return database;
  } catch (error) {
    await database.end();
    throw error;
  }
}

function createPool(databaseConfig) {
  const pool = new Pool({ connectionTimeoutMillis: 2000, statement_timeout: 5000,
    idle_in_transaction_session_timeout: 10000, ...databaseConfig });
  // Idle connection failures must not crash the server or print connection secrets.
  pool.on("error", () => console.error("PostgreSQL: conexión inactiva no disponible"));
  return pool;
}

async function initializeDatabase(database) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext(current_schema()), 7)");
    await client.query(CREATE_USERS_TABLE);
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID NOT NULL,
        type TEXT NOT NULL CHECK (type = 'session.login'),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMPTZ,
        UNIQUE (user_id, event_id)
      );
      CREATE TABLE IF NOT EXISTS notification_state (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0)
      );
      CREATE INDEX IF NOT EXISTS notifications_user_id_desc ON notifications (user_id, id DESC);
      CREATE INDEX IF NOT EXISTS notifications_unread_user ON notifications (user_id) WHERE read_at IS NULL;
      INSERT INTO notification_state (user_id) SELECT id FROM users ON CONFLICT DO NOTHING;
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
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

module.exports = { createDatabase, createPool, initializeDatabase, publicUser };
