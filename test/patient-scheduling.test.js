const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { isolatedDatabase } = require('../scripts/test-database');
const { initializeDatabase } = require('../db');

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
