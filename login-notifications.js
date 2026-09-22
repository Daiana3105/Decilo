const { randomUUID } = require("node:crypto");

function safeLog(logger, stage, correlationId) {
  // Error objects can carry SQL, passwords and headers. Never serialize them.
  try {
    Promise.resolve(logger({ code: "NOTIFICATION_FAILED", stage, correlationId })).catch(() => {});
  } catch (_) { /* logging is secondary too */ }
}

function createLoginNotifications({ service, publish = () => {}, logger = (entry) => console.error(entry), maxPending = 2 }) {
  const pending = new Set();
  let closed = false;
  return {
    schedule(userId) {
      const correlationId = randomUUID();
      if (closed || pending.size >= maxPending) { safeLog(logger, "capacity", correlationId); return; }
      let job;
      // Start in a later microtask; all synchronous and asynchronous failures are handled.
      job = Promise.resolve().then(async () => {
        let state;
        try { state = await service.createLogin(userId, correlationId); }
        catch (_) { safeLog(logger, "persist", correlationId); return; }
        if (state.changed) {
          try { await publish(userId, state); }
          catch (_) { safeLog(logger, "emit", correlationId); }
        }
      }).catch(() => safeLog(logger, "schedule", correlationId)).finally(() => pending.delete(job));
      pending.add(job);
    },
    async drain() { await Promise.allSettled([...pending]); },
    async close() { closed = true; await Promise.allSettled([...pending]); }
  };
}

module.exports = { createLoginNotifications, safeLog };
