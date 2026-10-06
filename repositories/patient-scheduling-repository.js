function createPatientSchedulingRepository(executor) {
  const profileColumns = `p.patient_user_id::text AS "patientUserId",u.nombre AS "patientName",
    p.responsible_name AS "responsibleName",p.responsible_relationship AS "responsibleRelationship",
    p.responsible_phone AS "responsiblePhone",p.responsible_email AS "responsibleEmail",
    p.archived_at AS "archivedAt",p.created_at AS "createdAt",p.updated_at AS "updatedAt"`;
  return {
    user: async id => (await executor.query('SELECT id,nombre,rol FROM users WHERE id=$1', [id])).rows[0],
    lockUsers: async ids => {
      const ordered = [...new Set(ids.map(Number))].sort((left, right) => left - right);
      for (const id of ordered) await executor.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [id]);
    },
    insertInvitation: async values => (await executor.query(`INSERT INTO patient_consent_invitations
      (code_hash,scope,issuer_user_id,professional_user_id,patient_user_id,expires_at)
      VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP + INTERVAL '24 hours')
      RETURNING id::text AS id,expires_at AS "expiresAt"`,
    [values.codeHash,values.scope,values.issuerUserId,values.professionalUserId,values.patientUserId])).rows[0],
    invitation: async (codeHash, lock = false) => (await executor.query(`SELECT i.*,i.id::text AS id_text,u.nombre AS "professionalName",p.nombre AS "patientName"
      FROM patient_consent_invitations i
      LEFT JOIN users u ON u.id=i.professional_user_id
      LEFT JOIN users p ON p.id=i.patient_user_id
      WHERE i.code_hash=$1${lock ? ' FOR UPDATE OF i' : ''}`, [codeHash])).rows[0],
    consumeInvitation: (id, patientId, familyId) => executor.query(`UPDATE patient_consent_invitations
      SET patient_user_id=COALESCE(patient_user_id,$2), consumed_at=CURRENT_TIMESTAMP
      WHERE id=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP
      AND ((scope='professional_access' AND patient_user_id IS NULL AND $3::integer IS NULL)
        OR (scope='family_schedule' AND patient_user_id=$2 AND $3 IS NOT NULL)) RETURNING id`, [id,patientId,familyId]),
    revokeInvitations: (issuerId, scope, patientId = null) => executor.query(`UPDATE patient_consent_invitations
      SET revoked_at=CURRENT_TIMESTAMP WHERE issuer_user_id=$1 AND scope=$2 AND consumed_at IS NULL
      AND ($3::integer IS NULL OR patient_user_id=$3) AND revoked_at IS NULL`, [issuerId,scope,patientId]),
    insertConsent: async values => (await executor.query(`INSERT INTO patient_consents
      (patient_user_id,professional_user_id,family_user_id,scope,action,actor_user_id,actor_role,
       consent_version,capture_method,representative_relationship,verification_reference)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [values.patientUserId,values.professionalUserId,values.familyUserId,values.scope,values.action,
      values.actorUserId,values.actorRole,values.consentVersion,values.captureMethod,
      values.representativeRelationship || null,values.verificationReference || null])).rows[0],
    latestConsent: async (patientId, professionalId, familyId, scope) => (await executor.query(`SELECT * FROM patient_consents
      WHERE patient_user_id=$1 AND professional_user_id IS NOT DISTINCT FROM $2
      AND family_user_id IS NOT DISTINCT FROM $3 AND scope=$4 ORDER BY id DESC LIMIT 1`,
    [patientId,professionalId,familyId,scope])).rows[0],
    professionalAccess: async (patientId, professionalId, lock = false) => (await executor.query(`SELECT * FROM patient_professional_access
      WHERE patient_user_id=$1 AND professional_user_id=$2${lock ? ' FOR UPDATE' : ''}`,
    [patientId,professionalId])).rows[0],
    grantProfessional: (patientId, professionalId, consentId) => executor.query(`INSERT INTO patient_professional_access
      (patient_user_id,professional_user_id,active,consent_id,authorized_at,revoked_at)
      VALUES($1,$2,TRUE,$3,CURRENT_TIMESTAMP,NULL) ON CONFLICT(patient_user_id,professional_user_id)
      DO UPDATE SET active=TRUE,consent_id=EXCLUDED.consent_id,authorized_at=CURRENT_TIMESTAMP,revoked_at=NULL`,
    [patientId,professionalId,consentId]),
    revokeProfessional: (patientId, professionalId) => executor.query(`UPDATE patient_professional_access
      SET active=FALSE,revoked_at=CURRENT_TIMESTAMP WHERE patient_user_id=$1 AND professional_user_id=$2 AND active`,
    [patientId,professionalId]),
    familyAccess: async (patientId, familyId, lock = false) => (await executor.query(`SELECT * FROM patient_family_schedule_access
      WHERE patient_user_id=$1 AND family_user_id=$2${lock ? ' FOR UPDATE' : ''}`,[patientId,familyId])).rows[0],
    grantFamilySchedule: (patientId, familyId, consentId) => executor.query(`INSERT INTO patient_family_schedule_access
      (patient_user_id,family_user_id,active,consent_id,authorized_at,revoked_at)
      VALUES($1,$2,TRUE,$3,CURRENT_TIMESTAMP,NULL) ON CONFLICT(patient_user_id,family_user_id)
      DO UPDATE SET active=TRUE,consent_id=EXCLUDED.consent_id,authorized_at=CURRENT_TIMESTAMP,revoked_at=NULL`,
    [patientId,familyId,consentId]),
    revokeFamilySchedule: (patientId, familyId) => executor.query(`UPDATE patient_family_schedule_access
      SET active=FALSE,revoked_at=CURRENT_TIMESTAMP WHERE patient_user_id=$1 AND family_user_id=$2 AND active`,
    [patientId,familyId]),
    listProfilesForProfessional: async professionalId => (await executor.query(`SELECT ${profileColumns}
      FROM patient_profiles p JOIN users u ON u.id=p.patient_user_id
      JOIN patient_professional_access a ON a.patient_user_id=p.patient_user_id
      WHERE a.professional_user_id=$1 AND a.active AND p.archived_at IS NULL ORDER BY u.nombre,u.id`,[professionalId])).rows,
    profileForProfessional: async (patientId, professionalId, includeArchived = false) => (await executor.query(`SELECT ${profileColumns}
      FROM patient_profiles p JOIN users u ON u.id=p.patient_user_id
      JOIN patient_professional_access a ON a.patient_user_id=p.patient_user_id
      WHERE p.patient_user_id=$1 AND a.professional_user_id=$2 AND a.active
      AND ($3::boolean OR p.archived_at IS NULL)`,[patientId,professionalId,includeArchived])).rows[0],
    profileForPatient: async patientId => (await executor.query(`SELECT ${profileColumns}
      FROM patient_profiles p JOIN users u ON u.id=p.patient_user_id WHERE p.patient_user_id=$1 AND p.archived_at IS NULL`,[patientId])).rows[0],
    insertProfile: async (patientId, professionalId, values) => (await executor.query(`INSERT INTO patient_profiles
      (patient_user_id,responsible_name,responsible_relationship,responsible_phone,responsible_email,created_by_professional_id)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING patient_user_id::text AS "patientUserId",responsible_name AS "responsibleName",
      responsible_relationship AS "responsibleRelationship",responsible_phone AS "responsiblePhone",responsible_email AS "responsibleEmail",
      archived_at AS "archivedAt",created_at AS "createdAt",updated_at AS "updatedAt"`,
    [patientId,values.responsibleName,values.responsibleRelationship,values.responsiblePhone,values.responsibleEmail,professionalId])).rows[0],
    updateProfile: async (patientId, values) => (await executor.query(`UPDATE patient_profiles SET responsible_name=$2,
      responsible_relationship=$3,responsible_phone=$4,responsible_email=$5,updated_at=CURRENT_TIMESTAMP
      WHERE patient_user_id=$1 AND archived_at IS NULL RETURNING patient_user_id::text AS "patientUserId",
      responsible_name AS "responsibleName",responsible_relationship AS "responsibleRelationship",
      responsible_phone AS "responsiblePhone",responsible_email AS "responsibleEmail",archived_at AS "archivedAt",
      created_at AS "createdAt",updated_at AS "updatedAt"`,
    [patientId,values.responsibleName,values.responsibleRelationship,values.responsiblePhone,values.responsibleEmail])).rows[0],
    hasFutureAppointments: async patientId => (await executor.query(`SELECT 1 FROM appointments
      WHERE patient_user_id=$1 AND starts_at>CURRENT_TIMESTAMP AND status IN ('pendiente','confirmado') LIMIT 1`,[patientId])).rowCount>0,
    archiveProfile: patientId => executor.query('UPDATE patient_profiles SET archived_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE patient_user_id=$1 AND archived_at IS NULL',[patientId]),
    audit: (values) => executor.query(`INSERT INTO patient_audit_events
      (patient_user_id,actor_user_id,resource_type,resource_id,action,changed_fields,previous_status,next_status,correlation_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[values.patientUserId,values.actorUserId,values.resourceType,
      values.resourceId,values.action,values.changedFields || [],values.previousStatus || null,values.nextStatus || null,values.correlationId])
  };
}
module.exports = { createPatientSchedulingRepository };