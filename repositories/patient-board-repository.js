function createPatientBoardRepository(db) {
  const columns = 'id,patient_id::text AS "patientId",professional_id::text AS "professionalId",name,pictogram_ids AS "pictogramIds"';
  return {
    list: async patient => (await db.query(`SELECT ${columns} FROM patient_boards WHERE patient_id=$1 ORDER BY id DESC LIMIT 100`, [patient])).rows,
    count: async patient => Number((await db.query('SELECT count(*) FROM patient_boards WHERE patient_id=$1', [patient])).rows[0].count),
    insert: async (patient, professional, name, pictograms) => (await db.query(`INSERT INTO patient_boards(patient_id,professional_id,name,pictogram_ids)
      VALUES($1,$2,$3,$4) RETURNING ${columns}`, [patient, professional, name, pictograms])).rows[0],
    update: async (patient, professional, board, name, pictograms) => (await db.query(`UPDATE patient_boards SET name=$4,pictogram_ids=$5
      WHERE patient_id=$1 AND professional_id=$2 AND id=$3 RETURNING ${columns}`, [patient, professional, board, name, pictograms])).rows[0]
  };
}
module.exports = { createPatientBoardRepository };
