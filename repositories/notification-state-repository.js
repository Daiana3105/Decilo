function createNotificationStateRepository(executor) {
  return {
    ensure(userId) {
      return executor.query("INSERT INTO notification_state (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [userId]);
    },
    lock(userId) {
      return executor.query("SELECT revision FROM notification_state WHERE user_id = $1 FOR UPDATE", [userId]);
    },
    increment(userId) {
      return executor.query("UPDATE notification_state SET revision = revision + 1 WHERE user_id = $1", [userId]);
    },
    async summary(userId) {
      const { rows } = await executor.query(`SELECT
        COALESCE((SELECT revision FROM notification_state WHERE user_id = $1), 0)::text AS revision,
        (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL)::text AS count`, [userId]);
      return { unreadCount: Number(rows[0].count), revision: rows[0].revision };
    }
  };
}

module.exports = { createNotificationStateRepository };
