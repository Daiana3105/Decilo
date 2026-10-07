const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomBytes } = require('node:crypto');
const { isolatedDatabase } = require('../scripts/test-database');
const { seedFamilyDemo } = require('../scripts/seed-family-demo');
const { createFamilyDemoService } = require('../family-demo');
const { initializeFamilyDemo } = require('../family-demo-schema');
const { createApp, createServer } = require('../server');
const { signToken } = require('../auth');
test('activity removal requires current professional authorization and preserves history after restart', async t => {
  const { db,a,b,service,app,auth,link,config,options } = await setup(t);
  await link();
  const patient=a.patient1.id;
  const {activity}=await service.assign(a.professional,patient,{title:'Retirable',instruction:'Demo',availability:'Hogar',points:25});
  await service.complete(a.patient1,patient,activity.id);
  await service.comment(a.family,patient,{text:'Comentario conservado',activityId:activity.id});
  const before=await service.summary(a.family,patient);
  const path=`/api/family-demo/patients/${patient}/activities/${activity.id}`;
  await request(app).delete(path).expect(401);
  for(const actor of [a.patient1,a.family,b.professional]) await request(app).delete(path).set(auth(actor)).expect(404);
  await request(app).delete(`/api/family-demo/patients/${a.patient2.id}/activities/${activity.id}`).set(auth(a.professional)).expect(404);
  await request(app).delete(path).set(auth(a.professional)).expect(204);
  const snapshot=(await db.query('SELECT * FROM patient_activities WHERE id=$1',[activity.id])).rows[0];
  assert.ok(snapshot.removed_at); assert.equal(snapshot.removed_by,a.professional.id);
  await request(app).delete(path).set(auth(a.professional)).expect(204);
  await initializeFamilyDemo(db,options.marker);
  const restarted=createFamilyDemoService(db,config.familyDemo);
  assert.deepEqual((await db.query('SELECT * FROM patient_activities WHERE id=$1',[activity.id])).rows[0],snapshot);
  for(const actor of [a.professional,a.patient1,a.family]) {
    assert.ok(!(await restarted.list(actor,patient,{})).activities.some(row=>row.id===activity.id));
  }
  const after=await restarted.summary(a.family,patient);
  assert.equal(after.assigned,before.assigned); assert.equal(after.completed,before.completed);
  assert.equal(after.points,before.points); assert.equal(after.completionPercent,before.completionPercent);
  assert.equal(after.activeAssigned,before.activeAssigned-1); assert.equal(after.activeCompleted,before.activeCompleted-1);
  assert.ok((await restarted.comments(a.family,patient,{})).comments.some(row=>row.text==='Comentario conservado'));
  assert.equal((await db.query('SELECT count(*) FROM patient_deliveries WHERE activity_id=$1',[activity.id])).rows[0].count,'1');
  await assert.rejects(restarted.complete(a.patient1,patient,activity.id),{status:404});
});
test('removed pending activities cannot be completed and revoked professionals cannot remove',async t=>{
  const {db,a,service}=await setup(t),patient=a.patient1.id;
  const {activity}=await service.assign(a.professional,patient,{title:'Pendiente',instruction:'Demo',availability:'Hogar',points:10});
  const before=await service.summary(a.patient1,patient);
  await db.query('UPDATE professional_patient_links SET active=FALSE WHERE professional_id=$1 AND patient_id=$2',[a.professional.id,patient]);
  await assert.rejects(service.removeActivity(a.professional,patient,activity.id),{status:404});
  assert.equal((await db.query('SELECT removed_at FROM patient_activities WHERE id=$1',[activity.id])).rows[0].removed_at,null);
  await db.query('UPDATE professional_patient_links SET active=TRUE WHERE professional_id=$1 AND patient_id=$2',[a.professional.id,patient]);
  await service.removeActivity(a.professional,patient,activity.id);
  await assert.rejects(service.complete(a.patient1,patient,activity.id),{status:404});
  const after=await service.summary(a.patient1,patient);
  assert.equal(after.activeAssigned-after.activeCompleted,before.activeAssigned-before.activeCompleted-1);
  assert.equal((await db.query('SELECT count(*) FROM patient_deliveries WHERE activity_id=$1',[activity.id])).rows[0].count,'0');
});
async function setup(t) {
  const fixture = await isolatedDatabase(); t.after(() => fixture.close());
  const db = fixture.database, marker = randomBytes(16).toString('hex');
  await db.query('CREATE TABLE family_demo_guard(marker TEXT NOT NULL)');
  await db.query('INSERT INTO family_demo_guard VALUES($1)', [marker]);
  const options = { marker, password: 'isolated-family-test-password' };
  const a = await seedFamilyDemo(db, options), b = await seedFamilyDemo(db, { ...options, namespace: 'other-family' });
  const config = { jwtSecret: 'isolated-family-jwt-test-secret-32-characters', jwtExpiresIn: '1h', familyDemo: { enabled: true, marker } };
  const service = createFamilyDemoService(db, config.familyDemo);
  const app = createApp({ database: db, config });
  t.after(() => app.locals.loginNotifications.close());
  const auth = user => ({ Authorization: `Bearer ${signToken(user, config)}` });
  const link = async (patient = a.patient1, family = a.family) => {
    const invite = await service.invite(a.professional, patient.id, { email: family.email });
    await service.accept(family, { code: invite.code }); return invite;
  };
  return { db, a, b, service, app, auth, link, options, config };
}
test('family seed is repeatable, preserves revoked links/data and refuses collisions or wrong marker', async t => {
  const { db, a, options, link, service } = await setup(t);
  const invite = await link();
  await service.revoke(a.professional, a.patient1.id, a.family.id);
  await db.query('UPDATE professional_patient_links SET active=FALSE WHERE professional_id=$1 AND patient_id=$2', [a.professional.id, a.patient2.id]);
  const again = await seedFamilyDemo(db, options);
  assert.equal(again.professional.id, a.professional.id);
  assert.equal((await db.query('SELECT count(*) FROM users')).rows[0].count, '8');
  assert.equal((await service.patients(a.family)).patients.length, 0);
  await assert.rejects(service.accept(a.family, { code: invite.code }));
  await assert.rejects(seedFamilyDemo(db, { ...options, marker: '0'.repeat(32) }));
  await db.query("INSERT INTO users(nombre,email,password_hash,rol) VALUES('collision','family@collision.test','x','familiar')");
  await assert.rejects(seedFamilyDemo(db, { ...options, namespace: 'collision' }));
  assert.equal((await db.query("SELECT count(*) FROM users WHERE email='professional@collision.test'")).rows[0].count, '0');
  assert.equal((await db.query('SELECT active FROM professional_patient_links WHERE professional_id=$1 AND patient_id=$2', [a.professional.id,a.patient2.id])).rows[0].active, false);
});
test('server startup applies missing protected demo schema before serving board reads', async t => {
  const { db, a, config, auth } = await setup(t);
  await db.query('DROP TABLE patient_boards');
  const server = await createServer({ database: db, config });
  t.after(() => server.close());
  const response = await request(server.app)
    .get(`/api/family-demo/patients/${a.patient1.id}/boards`)
    .set(auth(a.professional))
    .expect(200);
  assert.deepEqual(response.body.boards, []);
});
test('family invitations require persisted professional ownership, recipient, unexpired code and single consumption', async t => {
  const { a, b, db, service } = await setup(t);
  await assert.rejects(service.invite(b.professional, a.patient1.id, { email: a.family.email }));
  await assert.rejects(service.invite(a.family, a.patient1.id, { email: a.family.email }));
  const first = await service.invite(a.professional,a.patient1.id,{email:a.family.email});
  assert.match(first.code, /^[A-F0-9]{32}$/);
  assert.ok(!JSON.stringify((await db.query('SELECT * FROM family_link_invitations')).rows).includes(first.code));
  await assert.rejects(service.accept(b.family,{code:first.code}));
  const second = await service.invite(a.professional,a.patient1.id,{email:a.family.email});
  await assert.rejects(service.accept(a.family,{code:first.code}));
  const attempts = await Promise.allSettled([service.accept(a.family,{code:second.code}),service.accept(a.family,{code:second.code})]);
  assert.equal(attempts.filter(v=>v.status==='fulfilled').length,1);
  const third = await service.invite(a.professional,a.patient2.id,{email:a.family.email});
  await db.query("UPDATE family_link_invitations SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE id=$1",[third.invitationId]);
  await assert.rejects(service.accept(a.family,{code:third.code}));
  assert.equal((await service.patients(a.family)).patients.length,1);
});
test('family N:M links, home-only progress and concurrent completion remain isolated', async t => {
  const { a,b,db,service,link }=await setup(t);
  await link(); await link(a.patient2); await link(a.patient1,b.family);
  assert.equal((await service.patients(a.family)).patients.length,2);
  assert.deepEqual((await service.patients(b.family)).patients.map(p=>p.id),[String(a.patient1.id)]);
  const own=(await service.list(a.family,a.patient1.id,{})).activities;
  assert.equal(own.length,1); assert.equal(own[0].availability,'Hogar');
  const hidden=(await db.query("SELECT id FROM patient_activities WHERE patient_id=$1 AND availability='Consulta'",[a.patient1.id])).rows[0].id;
  await assert.rejects(service.complete(a.family,a.patient1.id,hidden));
  await Promise.all([service.complete(a.family,a.patient1.id,own[0].id),service.complete(b.family,a.patient1.id,own[0].id)]);
  assert.equal((await db.query('SELECT count(*) FROM patient_deliveries')).rows[0].count,'1');
  const progress=await service.summary(a.family,a.patient1.id);
  assert.equal(progress.assigned,1); assert.equal(progress.completed,1); assert.equal(progress.points,15);
  assert.equal((await service.summary(a.family,a.patient2.id)).completed,0);
  await assert.rejects(service.list(b.family,a.patient2.id,{}));
  await service.revoke(a.professional,a.patient1.id,a.family.id);
  await assert.rejects(service.summary(a.family,a.patient1.id));
  assert.equal((await service.patients(a.family)).patients[0].id,String(a.patient2.id));
  assert.equal((await service.summary(b.family,a.patient1.id)).completed,1);
});
test('family HTTP forbids foreign resources, extra actors, private activities and invalid sessions', async t=>{
  const {a,b,app,auth,link,service}=await setup(t); await link();
  const path='/api/family-demo/patients/'+a.patient1.id;
  await request(app).get(path+'/progress').expect(401);
  const denied=await request(app).get(path+'/progress').set(auth(b.family)).expect(404);
  const missing=await request(app).get('/api/family-demo/patients/2147483647/progress').set(auth(b.family)).expect(404);
  assert.deepEqual(denied.body,missing.body);
  const ok=await request(app).get(path+'/activities').set(auth(a.family)).expect(200);
  assert.equal(ok.headers['cache-control'],'no-store'); assert.equal(ok.body.activities.length,1);
  await request(app).post(path+'/comments').set(auth(a.family)).send({text:'Hola',authorId:b.family.id}).expect(400);
  const all=(await service.list(a.professional,a.patient1.id,{})).activities;
  const hidden=all.find(v=>v.availability==='Consulta');
  await request(app).post(path+'/comments').set(auth(a.family)).send({text:'Hola',activityId:hidden.id}).expect(404);
  await request(app).post(path+'/comments').set(auth(a.family)).send({text:'Práctica de hogar'}).expect(201);
  const comments=await request(app).get(path+'/comments').set(auth(a.family)).expect(200);
  assert.equal(comments.body.comments.length,1);
  await request(app).delete(path+'/family-links/'+a.family.id).set(auth(a.professional)).expect(204);
  await request(app).get(path+'/activities').set(auth(a.family)).expect(404);
  await request(app).post(path+'/comments').set(auth(a.family)).send({text:'Después de revocar'}).expect(404);
});
test('family rejects unowned registered accounts and disabled demo without touching existing authorization',async t=>{
  const {db,service,config,app,auth,a}=await setup(t);
  const rogue=(await db.query("INSERT INTO users(nombre,email,password_hash,rol) VALUES('fake','fake@example.test','x','profesional') RETURNING *")).rows[0];
  await request(app).get('/api/family-demo/patients').set(auth(rogue)).expect(403);
  await assert.rejects(service.invite(rogue,a.patient1.id,{email:a.family.email}));
  assert.deepEqual(await createFamilyDemoService(db).capabilities(a.family),{enabled:false});
  await assert.rejects(createFamilyDemoService(db,{...config.familyDemo,marker:'0'.repeat(32)}).patients(a.family));
});
test('family revocation serializes with writes and PostgreSQL rollback leaves no partial comment or invitation',async t=>{
  const {db,a,service,link}=await setup(t); await link();
  const blocker=await db.connect();
  try {
    await blocker.query('BEGIN'); await blocker.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[a.patient1.id]);
    await blocker.query('UPDATE family_patient_links SET active=FALSE WHERE patient_id=$1 AND family_id=$2',[a.patient1.id,a.family.id]);
    const pending=service.comment(a.family,a.patient1.id,{text:'Should not persist'});
    const observed=pending.then(()=>false,()=>true);
    await blocker.query('COMMIT'); assert.equal(await observed,true);
  } finally { blocker.release(); }
  assert.equal((await db.query('SELECT count(*) FROM patient_comments')).rows[0].count,'0');
  // Induce failure after invitation invalidation; transaction must restore prior invitation.
  const invite=await service.invite(a.professional,a.patient1.id,{email:a.family.email});
  await db.query("CREATE FUNCTION fail_invitation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test'; END $$");
  await db.query('CREATE TRIGGER reject_invitation BEFORE INSERT ON family_link_invitations FOR EACH ROW EXECUTE FUNCTION fail_invitation()');
  await assert.rejects(service.invite(a.professional,a.patient1.id,{email:a.family.email}));
  assert.equal((await db.query('SELECT revoked FROM family_link_invitations WHERE id=$1',[invite.invitationId])).rows[0].revoked,false);
  assert.equal((await db.query('SELECT 1 AS ok')).rows[0].ok,1);
});
test('family invitation creation and acceptance quotas are bounded', async t=>{
  const {a,service}=await setup(t);
  for(let i=0;i<5;i++) await service.invite(a.professional,a.patient1.id,{email:a.family.email});
  await assert.rejects(service.invite(a.professional,a.patient1.id,{email:a.family.email}),error=>error.status===429);
  for(let i=0;i<5;i++) await assert.rejects(service.accept(a.family,{code:'A'.repeat(32)}));
  await assert.rejects(service.accept(a.family,{code:'A'.repeat(32)}),error=>error.status===429);
});

test('boards persist across service sessions, isolate patients and authorize every read/write', async t => {
  const { db, a, b, service, app, auth, config } = await setup(t);
  const root = `/api/family-demo/patients/${a.patient1.id}/boards`;
  const payload = { name: 'Comunicación personal', pictogramIds: ['agua', 'quiero', 'casa', 'triste'] };
  await request(app).get(root).expect(401);
  await request(app).post(root).set(auth(b.professional)).send(payload).expect(404);
  await request(app).post(root).set(auth(a.patient1)).send(payload).expect(404);
  await request(app).post(root).set(auth(a.professional)).send({ ...payload, patientId: a.patient2.id }).expect(400);
  for (const pictogramIds of [[], ['fake'], ['agua', 'agua']]) {
    await request(app).post(root).set(auth(a.professional)).send({ ...payload, pictogramIds }).expect(400);
  }
  const created = await request(app).post(root).set(auth(a.professional)).send(payload).expect(201);
  assert.equal((await db.query('SELECT count(*) FROM patient_boards')).rows[0].count, '1');
  const secondService = createFamilyDemoService(db, config.familyDemo);
  const own = await secondService.boards(a.patient1, a.patient1.id);
  assert.deepEqual(own.boards, [created.body.board]);
  assert.deepEqual(own.boards[0].pictogramIds, ['agua', 'quiero', 'casa', 'triste']);
  assert.deepEqual((await secondService.boards(a.patient2, a.patient2.id)).boards, []);
  const foreign = await request(app).get(root).set(auth(a.patient2)).expect(404);
  const absent = await request(app).get('/api/family-demo/patients/2147483647/boards').set(auth(a.patient2)).expect(404);
  assert.deepEqual(foreign.body, absent.body);
  await request(app).get(root).set(auth(a.family)).expect(404);
  await request(app).get(root).set(auth(b.professional)).expect(404);
  const otherPatient = `/api/family-demo/patients/${a.patient2.id}/boards/${created.body.board.id}`;
  await request(app).post(otherPatient).set(auth(a.professional)).send(payload).expect(404);
  await request(app).post(`${root}/${created.body.board.id}`).set(auth(a.professional)).send({ name: 'Actualizado', pictogramIds: ['hola'] }).expect(200);
  assert.equal((await secondService.boards(a.patient1, a.patient1.id)).boards[0].name, 'Actualizado');
  const response = await request(app).get(root).set(auth(a.patient1)).expect(200);
  assert.equal(response.headers['cache-control'], 'no-store');
  await db.query('UPDATE professional_patient_links SET active=FALSE WHERE professional_id=$1 AND patient_id=$2', [a.professional.id, a.patient1.id]);
  await request(app).post(`${root}/${created.body.board.id}`).set(auth(a.professional)).send(payload).expect(404);
  await request(app).get(root).set(auth(a.professional)).expect(404);
  assert.equal((await secondService.boards(a.patient1, a.patient1.id)).boards[0].name, 'Actualizado');
});

test('PUT edits an existing board once and rejects a professional without the patient link', async t => {
  const { db, a, b, app, auth } = await setup(t);
  const root = `/api/family-demo/patients/${a.patient1.id}/boards`;
  const payload = { name: 'Tablero existente', pictogramIds: ['agua', 'quiero'] };
  const created = await request(app).post(root).set(auth(a.professional)).send(payload).expect(201);
  const boardPath = `${root}/${created.body.board.id}`;
  const edited = await request(app).put(boardPath).set(auth(a.professional))
    .send({ name: 'Tablero actualizado', pictogramIds: ['casa', 'triste', 'agua'] }).expect(200);
  assert.equal(edited.body.board.id, created.body.board.id);
  assert.deepEqual(edited.body.board.pictogramIds, ['casa', 'triste', 'agua']);
  assert.equal((await db.query('SELECT count(*) FROM patient_boards WHERE patient_id=$1', [a.patient1.id])).rows[0].count, '1');

  await request(app).put(boardPath).set(auth(b.professional)).send(payload).expect(404);
  assert.equal((await db.query('SELECT count(*) FROM patient_boards WHERE patient_id=$1', [a.patient1.id])).rows[0].count, '1');
  assert.equal((await db.query('SELECT name FROM patient_boards WHERE id=$1', [created.body.board.id])).rows[0].name, 'Tablero actualizado');
});

test('demo migration upgrades legacy 14-pictogram boards before editing them', async t => {
  const { db, a, app, auth, config } = await setup(t);
  const root = `/api/family-demo/patients/${a.patient1.id}/boards`;
  const originalIds = ['quiero','necesito','comer','tomar','mama','papa','galletita','agua','pelota','musica','feliz','cansado','hola','gracias'];
  const created = await request(app).post(root).set(auth(a.professional))
    .send({ name: 'Tablero anterior', pictogramIds: originalIds }).expect(201);
  await db.query('ALTER TABLE patient_boards DROP CONSTRAINT patient_boards_pictogram_ids_check');
  await db.query('ALTER TABLE patient_boards ADD CONSTRAINT patient_boards_pictogram_ids_check CHECK (cardinality(pictogram_ids) BETWEEN 1 AND 14)');

  await initializeFamilyDemo(db, config.familyDemo.marker);
  const expandedIds = [...originalIds, 'casa'];
  const edited = await request(app).put(`${root}/${created.body.board.id}`).set(auth(a.professional))
    .send({ name: 'Tablero ampliado', pictogramIds: expandedIds }).expect(200);
  assert.equal(edited.body.board.id, created.body.board.id);
  assert.deepEqual(edited.body.board.pictogramIds, expandedIds);
  assert.equal((await db.query('SELECT count(*) FROM patient_boards WHERE patient_id=$1', [a.patient1.id])).rows[0].count, '1');
});
