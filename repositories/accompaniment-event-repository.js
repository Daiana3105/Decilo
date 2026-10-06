function createAccompanimentEventRepository(db) {
  return {
    insert: (type, source, eventId) => db.query(`INSERT INTO accompaniment_events(type,source_key,event_id)
      VALUES($1,$2,$3) ON CONFLICT(type,source_key) DO NOTHING RETURNING event_id`, [type, String(source), eventId])
  };
}
module.exports = { createAccompanimentEventRepository };
