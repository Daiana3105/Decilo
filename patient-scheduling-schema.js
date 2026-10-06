async function initializePatientScheduling(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS patient_profiles (
      patient_user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
      responsible_name TEXT NOT NULL CHECK (length(trim(responsible_name)) BETWEEN 2 AND 120),
      responsible_relationship TEXT NOT NULL CHECK (length(trim(responsible_relationship)) BETWEEN 2 AND 80),
      responsible_phone TEXT NOT NULL CHECK (length(trim(responsible_phone)) BETWEEN 5 AND 40),
      responsible_email TEXT CHECK (responsible_email IS NULL OR length(responsible_email) <= 254),
      archived_at TIMESTAMPTZ,
      created_by_professional_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patient_consents (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      professional_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
      scope TEXT NOT NULL CHECK (scope IN ('professional_access','family_schedule')),
      family_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
      action TEXT NOT NULL CHECK (action IN ('granted','revoked')),
      actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      actor_role TEXT NOT NULL CHECK (actor_role IN ('profesional','paciente','familiar')),
      consent_version TEXT NOT NULL CHECK (length(trim(consent_version)) BETWEEN 1 AND 80),
      capture_method TEXT NOT NULL CHECK (capture_method IN ('authenticated_patient','institutional_attestation')),
      representative_relationship TEXT,
      verification_reference TEXT,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CHECK ((scope = 'professional_access' AND professional_user_id IS NOT NULL AND family_user_id IS NULL) OR
              (scope = 'family_schedule' AND professional_user_id IS NULL AND family_user_id IS NOT NULL)),
      CHECK (capture_method <> 'institutional_attestation' OR
             (actor_role = 'profesional' AND length(trim(COALESCE(verification_reference,''))) BETWEEN 1 AND 160))
    );
    CREATE INDEX IF NOT EXISTS patient_consents_pair_desc
      ON patient_consents(patient_user_id, professional_user_id, id DESC);

    CREATE TABLE IF NOT EXISTS patient_consent_invitations (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      scope TEXT NOT NULL CHECK (scope IN ('professional_access','family_schedule')),
      issuer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      professional_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
      patient_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK ((scope='professional_access' AND professional_user_id=issuer_user_id AND patient_user_id IS NULL) OR
             (scope='family_schedule' AND patient_user_id=issuer_user_id AND professional_user_id IS NULL))
    );
    CREATE INDEX IF NOT EXISTS patient_consent_invitations_expiry
      ON patient_consent_invitations(expires_at) WHERE consumed_at IS NULL AND revoked_at IS NULL;

    CREATE TABLE IF NOT EXISTS patient_professional_access (
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      professional_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      consent_id BIGINT NOT NULL REFERENCES patient_consents(id) ON DELETE RESTRICT,
      authorized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMPTZ,
      PRIMARY KEY (patient_user_id, professional_user_id),
      CHECK ((active AND revoked_at IS NULL) OR (NOT active AND revoked_at IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS patient_professional_access_professional
      ON patient_professional_access(professional_user_id, patient_user_id) WHERE active;

    CREATE TABLE IF NOT EXISTS patient_family_schedule_access (
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      family_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      consent_id BIGINT NOT NULL REFERENCES patient_consents(id) ON DELETE RESTRICT,
      authorized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMPTZ,
      PRIMARY KEY (patient_user_id, family_user_id),
      CHECK ((active AND revoked_at IS NULL) OR (NOT active AND revoked_at IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS patient_family_schedule_access_family
      ON patient_family_schedule_access(family_user_id, patient_user_id) WHERE active;

    CREATE TABLE IF NOT EXISTS professional_settings (
      professional_user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
      time_zone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      professional_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente'
        CHECK (status IN ('pendiente','confirmado','atendido','cancelado')),
      version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
      created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      updated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (ends_at > starts_at)
    );
    CREATE INDEX IF NOT EXISTS appointments_professional_start
      ON appointments(professional_user_id, starts_at, ends_at);
    CREATE INDEX IF NOT EXISTS appointments_patient_start
      ON appointments(patient_user_id, starts_at, ends_at);

    CREATE TABLE IF NOT EXISTS patient_audit_events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      resource_type TEXT NOT NULL CHECK (resource_type IN ('patient_profile','consent','appointment')),
      resource_id TEXT NOT NULL,
      action TEXT NOT NULL,
      changed_fields TEXT[] NOT NULL DEFAULT '{}',
      previous_status TEXT,
      next_status TEXT,
      correlation_id UUID NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS patient_audit_events_patient_desc
      ON patient_audit_events(patient_user_id, occurred_at DESC, id DESC);
  `);
}

module.exports = { initializePatientScheduling };