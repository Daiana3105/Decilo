const bcrypt = require('bcryptjs');
const { createUnitOfWork } = require('../unit-of-work');
const { createUserRepository } = require('../repositories/user-repository');
const { verifyDemo, initializeFamilyDemo } = require('../family-demo-schema');
const fixtures = [
  ['professional', 'Profesional Demo', 'profesional'], ['family', 'Familiar Demo', 'familiar'],
  ['patient1', 'Paciente Uno', 'paciente'], ['patient2', 'Paciente Dos', 'paciente']
];
async function seedFamilyDemo(database, { marker, password, namespace = 'family-demo' }) {
  if (!/^[a-z][a-z0-9-]{0,30}$/.test(namespace) || typeof password !== 'string' || password.length < 8) throw new Error('Invalid fixture configuration');
  await verifyDemo(database, marker);
  await initializeFamilyDemo(database, marker);
  const passwordHash = await bcrypt.hash(password, 10);
  return createUnitOfWork(database).run(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext(current_schema()),19)");
    const users = createUserRepository(client), result = {};
    for (const [key, nombre, rol] of fixtures) {
      const email = `${key}@${namespace}.test`, fixtureKey = `${namespace}:${key}`;
      const owned = (await client.query('SELECT * FROM family_demo_members WHERE fixture_key=$1', [fixtureKey])).rows[0];
      let user = await users.findByEmail(email);
      if (owned) {
        if (!user || user.id !== owned.user_id || user.rol !== rol || owned.expected_email !== email || owned.expected_role !== rol) throw new Error('Fixture ownership mismatch');
      } else {
        if (user) throw new Error('Existing account is not owned by fixture');
        user = await users.insert({ nombre, email, rol, passwordHash });
        await client.query('INSERT INTO family_demo_members(user_id,fixture_key,expected_role,expected_email) VALUES($1,$2,$3,$4)', [user.id, fixtureKey, rol, email]);
      }
      result[key] = user;
    }
    for (const key of ['patient1', 'patient2']) {
      await client.query(`INSERT INTO professional_patient_links(professional_id,patient_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [result.professional.id, result[key].id]);
      for (const availability of ['Hogar', 'Consulta']) {
        await client.query(`INSERT INTO patient_activities(fixture_key,patient_id,professional_id,title,instruction,availability,points)
          VALUES($1,$2,$3,$4,$5,$6,15) ON CONFLICT(fixture_key) DO NOTHING`,
        [`${namespace}:${key}:${availability}`, result[key].id, result.professional.id,
          `${availability}: ${key === 'patient1' ? 'Pedir agua' : 'Saludar'}`, 'Práctica ficticia de comunicación.', availability]);
      }
    }
    return result;
  });
}
if (require.main === module) {
  (async () => {
    const { loadConfig } = require('../config');
    const { createPool, initializeDatabase } = require('../db');
    const config = loadConfig();
    if (!config.familyDemo?.enabled || !['127.0.0.1', 'localhost', 'postgres'].includes(config.database.host) ||
        config.database.database !== 'decilo_family_demo' || config.database.connectionString) throw new Error('Unsafe demo target');
    const db = createPool(config.database);
    try {
      await verifyDemo(db, config.familyDemo.marker); // Before DDL or seed.
      await initializeDatabase(db);
      await seedFamilyDemo(db, { marker: config.familyDemo.marker, password: process.env.FAMILY_DEMO_PASSWORD });
      console.log('Demo preparada: 1 profesional, 1 familiar, 2 pacientes. Sin vínculos familiares automáticos.');
    } finally { await db.end(); }
  })().catch(() => { console.error('No se pudo preparar la demo aislada. No se importaron datos locales.'); process.exitCode = 1; });
}
module.exports = { seedFamilyDemo };
