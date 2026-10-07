function createDemoAgendaRepository(executor) {
  return {
    async profile(patient, professional) {
      return (await executor.query(`SELECT first_name AS "firstName", last_name AS "lastName", contact
        FROM demo_patient_details WHERE patient_id=$1 AND professional_id=$2`, [patient, professional])).rows[0] || null;
    },
    async saveProfile(patient, professional, values) {
      return (await executor.query(`INSERT INTO demo_patient_details(patient_id,professional_id,first_name,last_name,contact)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(patient_id,professional_id) DO UPDATE
        SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,contact=EXCLUDED.contact
        RETURNING first_name AS "firstName",last_name AS "lastName",contact`,
      [patient, professional, values.firstName, values.lastName, values.contact])).rows[0];
    },
    async list(patient, actor, start, end) {
      return (await executor.query(`SELECT a.id::text,a.starts_at AS "startsAt",a.ends_at AS "endsAt",a.status
        FROM appointments a WHERE a.patient_user_id=$1 AND a.starts_at<$4 AND a.ends_at>$3
        AND EXISTS(SELECT 1 FROM professional_patient_links p JOIN family_demo_members m ON m.user_id=p.professional_id
          JOIN users u ON u.id=m.user_id AND u.rol=m.expected_role AND u.email=m.expected_email
          WHERE p.patient_id=$1 AND p.professional_id=a.professional_user_id AND p.active AND u.rol='profesional')
        AND (($5='profesional' AND a.professional_user_id=$2) OR $5='paciente' OR
          ($5='familiar' AND EXISTS(SELECT 1 FROM family_patient_links f WHERE f.patient_id=$1
            AND f.family_id=$2 AND f.professional_id=a.professional_user_id AND f.active)))
        ORDER BY a.starts_at,a.id LIMIT 501`, [patient,actor.id,start,end,actor.rol])).rows;
    },
    async overlaps(patient, professional, start, end) {
      return (await executor.query(`SELECT 1 FROM appointments WHERE status<>'cancelado'
        AND (patient_user_id=$1 OR professional_user_id=$2) AND starts_at<$4 AND ends_at>$3 LIMIT 1`,
      [patient, professional, start, end])).rowCount > 0;
    },
    async insert(patient, professional, start, end) {
      return (await executor.query(`INSERT INTO appointments(patient_user_id,professional_user_id,starts_at,ends_at,
        created_by_user_id,updated_by_user_id) VALUES($1,$2,$3,$4,$2,$2)
        RETURNING id::text,starts_at AS "startsAt",ends_at AS "endsAt",status`, [patient, professional, start, end])).rows[0];
    },
    async cancel(patient, professional, appointment) {
      return (await executor.query(`UPDATE appointments SET status='cancelado',
        version=version+CASE WHEN status='cancelado' THEN 0 ELSE 1 END,
        updated_at=CASE WHEN status='cancelado' THEN updated_at ELSE CURRENT_TIMESTAMP END,updated_by_user_id=$2
        WHERE patient_user_id=$1 AND professional_user_id=$2 AND id=$3 AND status IN ('pendiente','confirmado','cancelado')
        RETURNING id::text,starts_at AS "startsAt",ends_at AS "endsAt",status`, [patient,professional,appointment])).rows[0];
    }
  };
}
module.exports = { createDemoAgendaRepository };
