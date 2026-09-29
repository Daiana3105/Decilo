function createNotificationRepository(executor) {
  return {
    insert({ userId, eventId, type, title, body }) {
      return executor.query(`INSERT INTO notifications (user_id, event_id, type, title, body)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, event_id) DO NOTHING RETURNING *`, [userId, eventId, type, title, body]);
    },
    listBefore(userId, { before = null, limit }) {
      return executor.query(`SELECT * FROM notifications
        WHERE user_id = $1 AND ($2::bigint IS NULL OR id < $2)
        ORDER BY id DESC LIMIT $3`, [userId, before, limit]);
    },
    async findOwnedById(userId, id) {
      return (await executor.query("SELECT * FROM notifications WHERE user_id = $1 AND id = $2", [userId, id])).rows[0];
    },
    markRead(userId, id) {
      return executor.query(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND id = $2 AND read_at IS NULL RETURNING *`, [userId, id]);
    },
    markAllRead(userId) {
      return executor.query("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read_at IS NULL", [userId]);
    }
  };
}

module.exports = { createNotificationRepository };
