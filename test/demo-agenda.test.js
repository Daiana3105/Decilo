const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomBytes } = require('node:crypto');
const { isolatedDatabase } = require('../scripts/test-database');
const { seedFamilyDemo } = require('../scripts/seed-family-demo');
const { createFamilyDemoService } = require('../family-demo');
const { initializeFamilyDemo } = require('../family-demo-schema');
const { createApp } = require('../server');
const { signToken } = require('../auth');
async function setup(t) {
  const fixture = await isolatedDatabase(); t.after(() => fixture.close());
  const db = fixture.database, marker = randomBytes(16).toString('hex');
  await db.query('CREATE TABLE family_demo_guard(marker TEXT NOT NULL)');
  await db.query('INSERT INTO family_demo_guard VALUES($1)', [marker]);
  const options = { marker, password: 'isolated-agenda-test-password' };
  const a = await seedFamilyDemo(db, options), b = await seedFamilyDemo(db, { ...options, namespace: 'other-family' });
  const config = { jwtSecret: 'isolated-agenda-jwt-test-secret-32-characters', jwtExpiresIn: '1h', familyDemo: { enabled: true, marker } };
  const service = createFamilyDemoService(db, config.familyDemo), app = createApp({ database: db, config });
  t.after(() => app.locals.loginNotifications.close());
  const auth = user => ({ Authorization: `Bearer ${signToken(user, config)}` });
  const invite = await service.invite(a.professional, a.patient1.id, { email: a.family.email });
  await service.accept(a.family, { code: invite.code });
  return { db,a,b,service,app,auth,config,marker };
}
const slot = { date: '2090-06-12', time: '10:00', duration: 30 };
test('demo agenda persists minimal profiles and appointments across services and repeated migrations', async t => {
  const { db,a,service,config,marker } = await setup(t), p = a.patient1.id;
  const profile = { firstName: 'Paciente', lastName: 'Ficticio', contact: 'Contacto ficticio' };
  await service.saveAgendaProfile(a.professional,p,profile);
  const { appointment } = await service.createAppointment(a.professional,p,slot);
  await initializeFamilyDemo(db,marker);
  const restarted = createFamilyDemoService(db,config.familyDemo);
  assert.deepEqual((await restarted.agendaProfile(a.professional,p)).profile,profile);
  await restarted.saveAgendaProfile(a.professional,p,{firstName:'Demo',lastName:'Editado'});
  assert.equal((await restarted.agendaProfile(a.professional,p)).profile.contact,null);
  for (const actor of [a.professional,a.patient1,a.family]) {
    const rows = (await restarted.agenda(actor,p,{month:'2090-06'})).appointments;
    assert.equal(rows.length,1); assert.equal(rows[0].id,appointment.id);
    assert.deepEqual(Object.keys(rows[0]).sort(),['endsAt','id','startsAt','status']);
  }
  assert.equal((await restarted.agenda(a.professional,p,{month:'2090-05'})).appointments.length,0);
  await restarted.cancelAppointment(a.professional,p,appointment.id,{});
  await restarted.cancelAppointment(a.professional,p,appointment.id,{});
  assert.equal((await db.query('SELECT version,status FROM appointments WHERE id=$1',[appointment.id])).rows[0].version,2);
  assert.equal((await restarted.agenda(a.patient1,p,{month:'2090-06'})).appointments[0].status,'cancelado');
});
test('HTTP agenda enforces authentication, fixture membership, role, ownership and revocation without leaking contacts', async t => {
  const { db,a,b,service,app,auth,config } = await setup(t), p=a.patient1.id, base=`/api/family-demo/patients/${p}`;
  await request(app).get(base+'/appointments?month=2090-06').expect(401);
  const created = await request(app).post(base+'/appointments').set(auth(a.professional)).send(slot).expect(201);
  for (const actor of [b.professional,b.patient1,b.family,a.patient2]) {
    await request(app).get(base+'/appointments?month=2090-06').set(auth(actor)).expect(404);
    await request(app).post(base+'/appointments').set(auth(actor)).send(slot).expect(404);
  }
  for (const actor of [a.patient1,a.family]) {
    await request(app).get(base+'/profile').set(auth(actor)).expect(404);
    await request(app).post(base+'/appointments').set(auth(actor)).send(slot).expect(404);
    await request(app).post(base+`/appointments/${created.body.appointment.id}/cancel`).set(auth(actor)).send({}).expect(404);
    const result = await request(app).get(base+'/appointments?month=2090-06').set(auth(actor)).expect(200);
    assert.equal(result.headers['cache-control'],'no-store');
  }
  await request(app).get(`/api/family-demo/patients/${a.patient2.id}/appointments?month=2090-06`).set(auth(a.family)).expect(404);
  await service.revoke(a.professional,p,a.family.id);
  await request(app).get(base+'/appointments?month=2090-06').set(auth(a.family)).expect(404);
  await db.query('UPDATE professional_patient_links SET active=FALSE WHERE patient_id=$1 AND professional_id=$2',[p,a.professional.id]);
  await request(app).get(base+'/appointments?month=2090-06').set(auth(a.professional)).expect(404);
  assert.equal((await service.agenda(a.patient1,p,{month:'2090-06'})).appointments.length,0);
  const outsider = (await db.query("INSERT INTO users(nombre,email,password_hash,rol) VALUES('Not a fixture','outside@agenda.test','unused','profesional') RETURNING *")).rows[0];
  await request(app).get(base+'/appointments?month=2090-06').set(auth(outsider)).expect(403);
  await assert.rejects(createFamilyDemoService(db,{...config.familyDemo,enabled:false}).agenda(a.professional,p,{month:'2090-06'}),{status:404});
  assert.equal((await db.query('SELECT count(*) FROM appointments')).rows[0].count,'1');
});
test('agenda serializes simultaneous professional and patient conflicts; consecutive/cancelled slots remain available', async t => {
  const { db,a,b,service } = await setup(t), p=a.patient1.id;
  await db.query('INSERT INTO professional_patient_links(professional_id,patient_id) VALUES($1,$2)',[b.professional.id,p]);
  const results=await Promise.allSettled([service.createAppointment(a.professional,p,slot),service.createAppointment(b.professional,p,slot)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  const winningIndex = results.findIndex(r=>r.status==='fulfilled'), winner=winningIndex===0?a.professional:b.professional;
  const winnerAppointment=results[winningIndex].value.appointment;
  await service.cancelAppointment(winner,p,winnerAppointment.id,{});
  await service.createAppointment(a.professional,p,slot);
  await assert.rejects(service.createAppointment(a.professional,a.patient2.id,slot),{status:409});
  await service.createAppointment(a.professional,a.patient2.id,{...slot,time:'10:30'});
  const rows=(await db.query("SELECT count(*) FROM appointments WHERE status<>'cancelado'")).rows[0]; assert.equal(rows.count,'2');
});
test('agenda rejects invalid dates, unknown fields, durations and manipulated ranges without writing', async t => {
  const { db,a,service } = await setup(t), p=a.patient1.id;
  for(const body of [{...slot,date:'2090-02-30'},{...slot,date:'2000-01-01'},{...slot,time:'25:00'},
    {...slot,time:'10:01'},{...slot,duration:10},{...slot,duration:181},{...slot,duration:'30'},
    {...slot,patientId:a.patient2.id},{...slot,diagnosis:'forbidden'}]) await assert.rejects(service.createAppointment(a.professional,p,body),{status:400});
  for(const query of [{month:'2090-13'},{month:['2090-06']},{month:'2090-06',patientId:p}]) await assert.rejects(service.agenda(a.professional,p,query),{status:400});
  await assert.rejects(service.saveAgendaProfile(a.professional,p,{firstName:'A',lastName:'B',diagnosis:'forbidden'}),{status:400});
  assert.equal((await db.query('SELECT count(*) FROM appointments')).rows[0].count,'0');
  assert.equal((await db.query('SELECT count(*) FROM demo_patient_details')).rows[0].count,'0');
});
