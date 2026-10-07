function createPatientProgressRepository(db) {
  return {
    summary: async (patient, homeOnly) => (await db.query(`SELECT count(*)::int AS assigned,count(d.activity_id)::int AS completed,
      count(*) FILTER(WHERE a.removed_at IS NULL)::int AS "activeAssigned",
      count(d.activity_id) FILTER(WHERE a.removed_at IS NULL)::int AS "activeCompleted",
      COALESCE(sum(d.points),0)::int AS points FROM patient_activities a LEFT JOIN patient_deliveries d ON d.activity_id=a.id
      WHERE a.patient_id=$1 AND (NOT $2 OR a.availability='Hogar')`, [patient, homeOnly])).rows[0],
    comments: async (patient, homeOnly, before, limit) => (await db.query(`SELECT c.id,c.text,c.created_at AS "createdAt",u.nombre AS "authorName"
      FROM patient_comments c JOIN users u ON u.id=c.author_id LEFT JOIN patient_activities a ON a.id=c.activity_id
      WHERE c.patient_id=$1 AND (NOT $2 OR c.activity_id IS NULL OR a.availability='Hogar')
      AND ($3::bigint IS NULL OR c.id<$3) ORDER BY c.id DESC LIMIT $4`, [patient, homeOnly, before, limit])).rows,
    insertComment: async (patient, actor, text, activity) => (await db.query(`INSERT INTO patient_comments(patient_id,author_id,text,activity_id)
      VALUES($1,$2,$3,$4) RETURNING id,text,created_at AS "createdAt"`, [patient, actor, text, activity])).rows[0]
  };
}
module.exports = { createPatientProgressRepository };
