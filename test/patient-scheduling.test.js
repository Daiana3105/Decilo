const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { isolatedDatabase } = require('../scripts/test-database');
const { initializeDatabase } = require('../db');
const { createPatientSchedulingRepository } = require('../repositories/patient-scheduling-repository');

test('patient scheduling migration is additive and idempotent', async t => {
  const fixture = await isolatedDatabase(); t.after(() => fixture.close());
  const { database } = fixture;
  const professional = (await database.query(`INSERT INTO users(nombre,email,password_hash,rol)
    VALUES('Profesional','schedule-pro@example.test','synthetic','profesional') RETURNING id`)).rows[0].id;
  const patient = (await database.query(`INSERT INTO users(nombre,email,password_hash,rol)
    VALUES('Paciente','schedule-patient@example.test','synthetic','paciente') RETURNING id`)).rows[0].id;
  const eventId = randomUUID();
  await database.query(`INSERT INTO notifications(user_id,event_id,type,title,body)
    VALUES($1,$2,'session.login','Login','Aviso previo')`, [professional,eventId]);
  await database.query('INSERT INTO notification_state(user_id,revision) VALUES($1,7)', [professional]);

  for (let attempt = 0; attempt < 2; attempt++) await initializeDatabase(database);

  for (const table of ['patient_profiles','patient_consents','patient_professional_access',
    'patient_family_schedule_access','professional_settings','appointments','patient_audit_events']) {
    assert.equal((await database.query('SELECT to_regclass($1) IS NOT NULL AS exists', [table])).rows[0].exists, true, table);
  }
  const notice = (await database.query('SELECT type,title,body FROM notifications WHERE event_id=$1', [eventId])).rows[0];
  assert.deepEqual(notice, { type:'session.login',title:'Login',body:'Aviso previo' });
  assert.equal((await database.query('SELECT revision FROM notification_state WHERE user_id=$1', [professional])).rows[0].revision, '7');
  assert.equal((await database.query('SELECT count(*) FROM users')).rows[0].count, '2');
  assert.equal((await database.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='notifications'::regclass AND conname='notifications_type_check'")).rows[0].pg_get_constraintdef.includes('appointment.created'), true);
  assert.equal((await database.query('SELECT count(*) FROM patient_profiles')).rows[0].count, '0');
  assert.ok(patient > professional);
});

test('invitation consumption migrates the legacy constraint without losing existing data', async t => {
  const fixture = await isolatedDatabase(); t.after(() => fixture.close());
  const { database } = fixture;
  const repository = createPatientSchedulingRepository(database);
  const users = {};
  for (const role of ['profesional', 'paciente', 'familiar']) {
    users[role] = (await database.query(`INSERT INTO users(nombre,email,password_hash,rol)
      VALUES($1,$2,'synthetic',$1) RETURNING id`, [role, `${role}@invitation.test`])).rows[0].id;
  }
  // Reproduce the restriction present in existing installations, not just a fresh schema.
  await database.query(`ALTER TABLE patient_consent_invitations DROP CONSTRAINT patient_consent_invitations_check;
    ALTER TABLE patient_consent_invitations ADD CONSTRAINT patient_consent_invitations_check
    CHECK ((scope='professional_access' AND professional_user_id=issuer_user_id AND patient_user_id IS NULL) OR
      (scope='family_schedule' AND patient_user_id=issuer_user_id AND professional_user_id IS NULL))`);
  const invitation = await repository.insertInvitation({ codeHash: randomUUID(), scope: 'professional_access',
    issuerUserId: users.profesional, professionalUserId: users.profesional, patientUserId: null });
  const family = await repository.insertInvitation({ codeHash: randomUUID(), scope: 'family_schedule',
    issuerUserId: users.paciente, professionalUserId: null, patientUserId: users.paciente });
  const snapshot = async () => (await database.query('SELECT * FROM patient_consent_invitations ORDER BY id')).rows;
  const before = await snapshot();
  await assert.rejects(repository.consumeInvitation(invitation.id, users.paciente, null),
    error => error.code === '23514' && error.constraint === 'patient_consent_invitations_check');
  assert.deepEqual(await snapshot(), before);

  await initializeDatabase(database);
  assert.deepEqual(await snapshot(), before); // Migration changes no rows or timestamps.
  assert.equal((await repository.consumeInvitation(invitation.id, users.paciente, null)).rowCount, 1);
  const consumed = (await snapshot())[0];
  assert.equal(consumed.patient_user_id, users.paciente);
  assert.ok(consumed.consumed_at instanceof Date);
  assert.equal(consumed.code_hash, before[0].code_hash);
  assert.equal((await repository.consumeInvitation(invitation.id, users.paciente, null)).rowCount, 0);
  assert.equal((await repository.consumeInvitation(family.id, users.profesional, users.familiar)).rowCount, 0);
  assert.equal((await repository.consumeInvitation(family.id, users.paciente, users.familiar)).rowCount, 1);
  // Pending professional invitations must still have no patient assigned.
  await assert.rejects(repository.insertInvitation({ codeHash: randomUUID(), scope: 'professional_access',
    issuerUserId: users.profesional, professionalUserId: users.profesional, patientUserId: users.paciente }),
  error => error.code === '23514');
  const after = await snapshot();
  await initializeDatabase(database); await initializeDatabase(database);
  assert.deepEqual(await snapshot(), after);
  assert.equal((await database.query('SELECT count(*) FROM users')).rows[0].count, '3');
});
