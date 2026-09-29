function createUserRepository(executor) {
  return {
    async findById(id) {
      return (await executor.query("SELECT * FROM users WHERE id = $1", [id])).rows[0];
    },
    async findByEmail(email) {
      return (await executor.query("SELECT * FROM users WHERE email = $1", [email])).rows[0];
    },
    async insert({ nombre, email, passwordHash, rol }) {
      return (await executor.query(`INSERT INTO users (nombre, email, password_hash, rol)
        VALUES ($1, $2, $3, $4) RETURNING *`, [nombre, email, passwordHash, rol])).rows[0];
    }
  };
}

module.exports = { createUserRepository };
