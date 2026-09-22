const { randomUUID } = require("node:crypto");

class NotificationError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function validId(value) {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
    throw new NotificationError(400, "INVALID_NOTIFICATION_INPUT", "El identificador no es válido.");
  }
  return value;
}

function pagination(query = {}) {
  const raw = query.limit ?? "20";
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,2}$/.test(raw) || Number(raw) > 100) {
    throw new NotificationError(400, "INVALID_NOTIFICATION_INPUT", "El límite debe estar entre 1 y 100.");
  }
  return { limit: Number(raw), before: query.before === undefined ? null : validId(query.before) };
}

function publicNotification(row) {
  return { id: row.id, type: row.type, title: row.title, body: row.body,
    createdAt: row.created_at, readAt: row.read_at };
}

async function summary(client, userId) {
  const { rows } = await client.query(`SELECT
    COALESCE((SELECT revision FROM notification_state WHERE user_id = $1), 0)::text AS revision,
    (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL)::text AS count`, [userId]);
  return { unreadCount: Number(rows[0].count), revision: rows[0].revision };
}

function createNotificationService(database) {
  async function transaction(userId, write, operation) {
    const client = await database.connect();
    try {
      await client.query(write ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      // Bounds also apply when the service is passed an externally constructed pool.
      await client.query("SET LOCAL statement_timeout = '5s'");
      await client.query("SET LOCAL lock_timeout = '2s'");
      if (write) {
        await client.query("INSERT INTO notification_state (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [userId]);
        await client.query("SELECT revision FROM notification_state WHERE user_id = $1 FOR UPDATE", [userId]);
      }
      const result = await operation(client);
      if (write && result.changed) {
        await client.query("UPDATE notification_state SET revision = revision + 1 WHERE user_id = $1", [userId]);
      }
      const state = await summary(client, userId);
      await client.query("COMMIT");
      return { ...result, ...state };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { client.release(); }
  }

  return {
    async createLogin(userId, eventId = randomUUID()) {
      return transaction(userId, true, async (client) => {
        const result = await client.query(`INSERT INTO notifications (user_id, event_id, type, title, body)
          VALUES ($1, $2, 'session.login', 'Se inició sesión en tu cuenta', 'Se aceptó un nuevo inicio de sesión en DECILO.')
          ON CONFLICT (user_id, event_id) DO NOTHING RETURNING *`, [userId, eventId]);
        return { changed: result.rowCount > 0, notification: result.rows[0] ? publicNotification(result.rows[0]) : null };
      });
    },
    async list(userId, query = {}) {
      const { limit, before } = pagination(query);
      return transaction(userId, false, async (client) => {
        const { rows } = await client.query(`SELECT * FROM notifications
          WHERE user_id = $1 AND ($2::bigint IS NULL OR id < $2)
          ORDER BY id DESC LIMIT $3`, [userId, before, limit + 1]);
        const page = rows.slice(0, limit);
        return { notifications: page.map(publicNotification), nextCursor: rows.length > limit ? page.at(-1).id : null };
      });
    },
    async unreadCount(userId) { return transaction(userId, false, async () => ({})); },
    async markRead(userId, id) {
      validId(id);
      return transaction(userId, true, async (client) => {
        const result = await client.query(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND id = $2 AND read_at IS NULL RETURNING *`, [userId, id]);
        const row = result.rows[0] || (await client.query("SELECT * FROM notifications WHERE user_id = $1 AND id = $2", [userId, id])).rows[0];
        if (!row) throw new NotificationError(404, "NOTIFICATION_NOT_FOUND", "No se encontró la notificación.");
        return { notification: publicNotification(row), changed: result.rowCount > 0 };
      });
    },
    async markAllRead(userId) {
      return transaction(userId, true, async (client) => {
        const result = await client.query("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read_at IS NULL", [userId]);
        return { updatedCount: result.rowCount, changed: result.rowCount > 0 };
      });
    }
  };
}

module.exports = { createNotificationService, NotificationError };
