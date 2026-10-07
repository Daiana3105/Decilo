function createPatientActivityRepository(db) {
  return {
    list: async (patient, homeOnly, before, limit) => (await db.query(`SELECT a.id,a.patient_id::text AS "patientId",a.title,a.instruction,
      a.availability,a.points,d.completed_at AS "completedAt" FROM patient_activities a
      LEFT JOIN patient_deliveries d ON d.activity_id=a.id WHERE a.patient_id=$1 AND (NOT $2 OR a.availability='Hogar')
      AND a.removed_at IS NULL AND ($3::bigint IS NULL OR a.id<$3) ORDER BY a.id DESC LIMIT $4`, [patient, homeOnly, before, limit])).rows,
    find: async (patient, id, homeOnly) => (await db.query(`SELECT * FROM patient_activities WHERE patient_id=$1 AND id=$2
      AND removed_at IS NULL AND (NOT $3 OR availability='Hogar')`, [patient, id, homeOnly])).rows[0],
    remove: async (patient, activity, professional) => (await db.query(`UPDATE patient_activities
      SET removed_at=COALESCE(removed_at,CURRENT_TIMESTAMP),removed_by=COALESCE(removed_by,$3)
      WHERE patient_id=$1 AND id=$2 RETURNING id`, [patient,activity,professional])).rows[0],
    insert: async (patient, professional, value) => (await db.query(`INSERT INTO patient_activities
      (patient_id,professional_id,title,instruction,availability,points) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [patient, professional, value.title, value.instruction, value.availability, value.points])).rows[0],
    complete: (activity, actor, origin) => db.query(`INSERT INTO patient_deliveries(activity_id,patient_id,author_id,origin,points)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(activity_id) DO NOTHING`, [activity.id, activity.patient_id, actor, origin, activity.points]),
    delivery: async id => (await db.query(`SELECT activity_id AS "activityId",patient_id::text AS "patientId",origin,points,
      completed_at AS "completedAt" FROM patient_deliveries WHERE activity_id=$1`, [id])).rows[0]
  };
}
module.exports = { createPatientActivityRepository };
