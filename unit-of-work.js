function createUnitOfWork(pool) {
  return {
    async run(operation, { readOnly = false } = {}) {
      if (typeof readOnly !== "boolean") throw new TypeError("readOnly must be a boolean");
      const client = await pool.connect();
      let failed = false;
      let discard = true;
      try {
        await client.query(readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN");
        discard = false;
        await client.query("SET LOCAL statement_timeout = '5s'");
        await client.query("SET LOCAL lock_timeout = '2s'");
        const result = await operation(client);
        discard = true; // A failed COMMIT may have an unknown outcome.
        await client.query("COMMIT");
        discard = false;
        return result;
      } catch (error) {
        failed = true;
        try { await client.query("ROLLBACK"); }
        catch (_) { discard = true; }
        throw error;
      } finally {
        try { await client.release(discard); }
        catch (error) {
          // Never replace the transaction error with a cleanup error.
          // After successful COMMIT, report release failure without rolling back.
          if (!failed) throw error;
        }
      }
    }
  };
}

module.exports = { createUnitOfWork };
