function createDatabaseHealth(executor) {
  return { check: () => executor.query("SELECT 1 AS ok") };
}

module.exports = { createDatabaseHealth };
