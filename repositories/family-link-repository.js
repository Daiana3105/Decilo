function createFamilyLinkRepository(db) {
  return {
    // One per-patient lock shared by all reads and mutations prevents revoke/write races.
    lockPatient: id => db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [id]),
    member: async id => (await db.query(`SELECT u.* FROM users u JOIN family_demo_members m ON m.user_id=u.id
      WHERE u.id=$1 AND u.rol=m.expected_role AND u.email=m.expected_email`, [id])).rows[0],
    byEmail: async email => (await db.query(`SELECT u.* FROM users u JOIN family_demo_members m ON m.user_id=u.id
      WHERE u.email=$1 AND u.rol=m.expected_role AND u.email=m.expected_email`, [email])).rows[0],
    professional: async (actor, patient) => (await db.query(`SELECT 1 FROM professional_patient_links
      WHERE professional_id=$1 AND patient_id=$2 AND active`, [actor, patient])).rowCount > 0,
    family: async (actor, patient) => (await db.query(`SELECT 1 FROM family_patient_links f
      JOIN professional_patient_links p ON p.professional_id=f.professional_id AND p.patient_id=f.patient_id
      JOIN family_demo_members m ON m.user_id=p.professional_id JOIN users u ON u.id=m.user_id
      WHERE f.family_id=$1 AND f.patient_id=$2 AND f.active AND p.active
      AND u.rol='profesional' AND u.rol=m.expected_role AND u.email=m.expected_email`, [actor, patient])).rowCount > 0,
    patients: async actor => (await db.query(`SELECT DISTINCT u.id::text AS id,u.nombre AS name FROM users u
      JOIN family_demo_members m ON m.user_id=u.id WHERE u.rol='paciente' AND u.rol=m.expected_role AND u.email=m.expected_email
      AND (u.id=$1 OR EXISTS(SELECT 1 FROM professional_patient_links p WHERE p.professional_id=$1 AND p.patient_id=u.id AND p.active)
        OR EXISTS(SELECT 1 FROM family_patient_links f JOIN professional_patient_links p
          ON p.patient_id=f.patient_id AND p.professional_id=f.professional_id
          JOIN family_demo_members pm ON pm.user_id=p.professional_id JOIN users pu ON pu.id=pm.user_id
          WHERE f.family_id=$1 AND f.patient_id=u.id AND f.active AND p.active
          AND pu.rol='profesional' AND pu.rol=pm.expected_role AND pu.email=pm.expected_email)) ORDER BY id`, [actor])).rows,
    links: async patient => (await db.query(`SELECT f.family_id::text AS id,u.nombre AS name FROM family_patient_links f
      JOIN users u ON u.id=f.family_id WHERE f.patient_id=$1 AND f.active ORDER BY f.family_id`, [patient])).rows,
    revoke: (patient, family) => db.query(`UPDATE family_patient_links SET active=FALSE
      WHERE patient_id=$1 AND family_id=$2 AND active RETURNING generation,professional_id`, [patient, family]),
    invalidate: (patient, family) => db.query(`UPDATE family_link_invitations SET revoked=TRUE
      WHERE patient_id=$1 AND family_id=$2 AND consumed_at IS NULL`, [patient, family]),
    pending: async patient => Number((await db.query(`SELECT count(*) FROM family_link_invitations
      WHERE patient_id=$1 AND NOT revoked AND consumed_at IS NULL AND expires_at>CURRENT_TIMESTAMP`, [patient])).rows[0].count),
    invite: async (patient, professional, family, hash) => (await db.query(`INSERT INTO family_link_invitations
      (patient_id,professional_id,family_id,code_hash,expires_at) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP+INTERVAL '24 hours')
      RETURNING id,expires_at AS "expiresAt"`, [patient, professional, family, hash])).rows[0],
    invitation: async hash => (await db.query(`SELECT * FROM family_link_invitations WHERE code_hash=$1`, [hash])).rows[0],
    consume: async (hash, family) => (await db.query(`UPDATE family_link_invitations SET consumed_at=CURRENT_TIMESTAMP
      WHERE code_hash=$1 AND family_id=$2 AND NOT revoked AND consumed_at IS NULL AND expires_at>CURRENT_TIMESTAMP RETURNING *`, [hash, family])).rows[0],
    activate: (patient, family, professional) => db.query(`INSERT INTO family_patient_links(patient_id,family_id,professional_id)
      VALUES($1,$2,$3) ON CONFLICT(patient_id,family_id) DO UPDATE SET active=TRUE,
      professional_id=EXCLUDED.professional_id,generation=gen_random_uuid()
      WHERE NOT family_patient_links.active OR family_patient_links.professional_id<>EXCLUDED.professional_id
      RETURNING generation`, [patient, family, professional])
  };
}
module.exports = { createFamilyLinkRepository };
