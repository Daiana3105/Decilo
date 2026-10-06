// Explicit additive demo migrations; never trust browser data or remove existing data.
async function verifyDemo(database, marker) {
  if (!/^[a-f0-9]{32}$/.test(marker || '')) throw new Error('FAMILY_DEMO_UNAVAILABLE');
  const { rows } = await database.query('SELECT marker FROM family_demo_guard');
  if (rows.length !== 1 || rows[0].marker !== marker) throw new Error('FAMILY_DEMO_UNAVAILABLE');
}

async function initializeFamilyDemo(database, marker) {
  await verifyDemo(database, marker);
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext(current_schema()), 18)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_demo_members (
        user_id INTEGER PRIMARY KEY REFERENCES users(id), fixture_key TEXT UNIQUE NOT NULL,
        expected_role TEXT NOT NULL, expected_email TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS professional_patient_links (
        professional_id INTEGER REFERENCES users(id), patient_id INTEGER REFERENCES users(id),
        active BOOLEAN NOT NULL DEFAULT TRUE, PRIMARY KEY (professional_id, patient_id));
      CREATE TABLE IF NOT EXISTS family_patient_links (
        patient_id INTEGER REFERENCES users(id), family_id INTEGER REFERENCES users(id),
        professional_id INTEGER NOT NULL REFERENCES users(id), active BOOLEAN NOT NULL DEFAULT TRUE,
        PRIMARY KEY (patient_id, family_id));
      CREATE TABLE IF NOT EXISTS family_link_invitations (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES users(id),
        professional_id INTEGER NOT NULL REFERENCES users(id), family_id INTEGER NOT NULL REFERENCES users(id),
        code_hash TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ, revoked BOOLEAN NOT NULL DEFAULT FALSE);
      CREATE INDEX IF NOT EXISTS family_invitation_patient ON family_link_invitations(patient_id);
      CREATE TABLE IF NOT EXISTS patient_activities (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, fixture_key TEXT UNIQUE,
        patient_id INTEGER NOT NULL REFERENCES users(id), professional_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL, instruction TEXT NOT NULL, availability TEXT NOT NULL CHECK (availability IN ('Hogar','Consulta')),
        points INTEGER NOT NULL CHECK (points BETWEEN 0 AND 100), UNIQUE(id,patient_id));
      CREATE TABLE IF NOT EXISTS patient_deliveries (
        activity_id BIGINT PRIMARY KEY, patient_id INTEGER NOT NULL, author_id INTEGER NOT NULL REFERENCES users(id),
        origin TEXT NOT NULL, points INTEGER NOT NULL, completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(activity_id,patient_id) REFERENCES patient_activities(id,patient_id));
      CREATE TABLE IF NOT EXISTS patient_comments (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES users(id),
        author_id INTEGER NOT NULL REFERENCES users(id), activity_id BIGINT,
        text TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(activity_id,patient_id) REFERENCES patient_activities(id,patient_id));
      ALTER TABLE family_patient_links ADD COLUMN IF NOT EXISTS generation UUID NOT NULL DEFAULT gen_random_uuid();
      CREATE TABLE IF NOT EXISTS accompaniment_events (
        event_id UUID PRIMARY KEY, type TEXT NOT NULL, source_key TEXT NOT NULL,
        UNIQUE(type, source_key));
      CREATE TABLE IF NOT EXISTS patient_boards (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        professional_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
        pictogram_ids TEXT[] NOT NULL CHECK (cardinality(pictogram_ids) BETWEEN 1 AND 64));
      CREATE INDEX IF NOT EXISTS patient_boards_patient ON patient_boards(patient_id,id);
      ALTER TABLE patient_boards DROP CONSTRAINT IF EXISTS patient_boards_pictogram_ids_check;
      ALTER TABLE patient_boards ADD CONSTRAINT patient_boards_pictogram_ids_check
        CHECK (cardinality(pictogram_ids) BETWEEN 1 AND 64);
    `);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}
module.exports = { verifyDemo, initializeFamilyDemo };
