const { randomUUID } = require('node:crypto');
const { createAccompanimentEventRepository } = require('./repositories/accompaniment-event-repository');
const { createNotificationRepository } = require('./repositories/notification-repository');
const { createNotificationStateRepository } = require('./repositories/notification-state-repository');
const { safeLog } = require('./login-notifications');

const messages = Object.freeze({
  'activity.assigned': ['Nueva actividad', 'Hay una nueva actividad disponible.'],
  'family.invited': ['Invitación familiar', 'Tenés una invitación. Solicitá el código a quien te invitó.'],
  'family.accepted': ['Invitación aceptada', 'Se aceptó una invitación familiar.'],
  'activity.completed': ['Actividad completada', 'Se completó una actividad.'],
  'family.revoked': ['Vínculo revocado', 'Se revocó un vínculo de acompañamiento.']
});

// The caller owns the UoW. A savepoint isolates recoverable secondary failures;
// connection loss still prevents confirming the principal transaction safely.
async function persistAccompanimentNotifications(client, events, actorId, logger) {
  if (!events.length) return [];
  const correlationId = randomUUID();
  await client.query('SAVEPOINT accompaniment_notices');
  try {
    const repository = createNotificationRepository(client);
    const state = createNotificationStateRepository(client);
    const registry = createAccompanimentEventRepository(client);
    const pending = [];
    for (const event of events) {
      if (!Object.hasOwn(messages, event.type)) throw new TypeError('Unknown accompaniment event');
      const inserted = await registry.insert(event.type, event.source, randomUUID());
      if (!inserted.rowCount) continue; // Never expand the audience of an old event.
      const recipients = [...new Set(await event.recipients())].filter(id => id !== actorId);
      for (const userId of recipients) pending.push({ userId, eventId: inserted.rows[0].event_id, type: event.type });
    }
    const updates = [];
    for (const userId of [...new Set(pending.map(item => item.userId))].sort((a, b) => a - b)) {
      await state.ensure(userId);
      await state.lock(userId);
      let changed = false;
      for (const item of pending.filter(item => item.userId === userId)) {
        const [title, body] = messages[item.type];
        if ((await repository.insert({ ...item, title, body })).rowCount) {
          await state.increment(userId);
          changed = true;
        }
      }
      if (changed) updates.push({ userId, ...await state.summary(userId) });
    }
    await client.query('RELEASE SAVEPOINT accompaniment_notices');
    return updates;
  } catch (_) {
    // Do not swallow an unusable connection or pretend that COMMIT succeeded.
    await client.query('ROLLBACK TO SAVEPOINT accompaniment_notices');
    await client.query('RELEASE SAVEPOINT accompaniment_notices');
    safeLog(logger, 'accompaniment.persist', correlationId);
    return [];
  }
}

async function publishAccompanimentNotifications(updates, publish, logger) {
  for (const { userId, revision, unreadCount } of updates) {
    try { await publish(userId, { revision, unreadCount }); }
    catch (_) { safeLog(logger, 'accompaniment.emit', randomUUID()); }
  }
}
module.exports = { persistAccompanimentNotifications, publishAccompanimentNotifications };
