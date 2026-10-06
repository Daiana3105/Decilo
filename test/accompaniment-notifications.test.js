const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomBytes } = require('node:crypto');
const { io } = require('socket.io-client');
const { isolatedDatabase } = require('../scripts/test-database');
const { seedFamilyDemo } = require('../scripts/seed-family-demo');
const { initializeFamilyDemo } = require('../family-demo-schema');
const { initializeDatabase } = require('../db');
const { createFamilyDemoService } = require('../family-demo');
const { createNotificationService } = require('../notifications');
const { persistAccompanimentNotifications } = require('../accompaniment-notifications');
const { createUnitOfWork } = require('../unit-of-work');
const { createServer, createApp } = require('../server');
const { signToken } = require('../auth');

async function setup(t) {
  const fixture = await isolatedDatabase(); t.after(() => fixture.close());
  const db = fixture.database, marker = randomBytes(16).toString('hex');
  await db.query('CREATE TABLE family_demo_guard(marker TEXT NOT NULL)');
  await db.query('INSERT INTO family_demo_guard VALUES($1)', [marker]);
  const seed = { marker, password: 'isolated-accompaniment-test-password' };
  const a = await seedFamilyDemo(db, seed);
  const b = await seedFamilyDemo(db, { ...seed, namespace: 'second-family' });
  const config = { jwtSecret: 'isolated-accompaniment-secret-32-characters', jwtExpiresIn: '1h', corsOrigins: [], familyDemo: { enabled: true, marker } };
  const emissions = [], logs = [];
  const options = { ...config.familyDemo, publish: (userId, state) => emissions.push({ userId, ...state }), logger: value => logs.push(value) };
  const service = createFamilyDemoService(db, options);
  const notices = createNotificationService(db);
  const link = async (patient = a.patient1, family = a.family) => {
    const invitation = await service.invite(a.professional, patient.id, { email: family.email });
    await service.accept(family, { code: invitation.code }); return invitation;
  };
  const rows = async () => (await db.query('SELECT * FROM notifications ORDER BY id')).rows;
  return { fixture, db, a, b, config, options, service, notices, link, rows, emissions, logs, seed };
}
const activity = availability => ({ title: 'PRIVATE-TITLE', instruction: 'PRIVATE-INSTRUCTION', points: 15, availability });
const recipients = (rows, type) => rows.filter(row => row.type === type).map(row => row.user_id).sort((a, b) => a - b);

test('accompaniment maps all five events to authorized recipients and preserves private content', async t => {
  const { a, b, service, link, rows, notices, emissions } = await setup(t);
  const invitation = await link(); await link(a.patient2); await link(a.patient1, b.family);
  const home = await service.assign(a.professional, a.patient1.id, activity('Hogar'));
  const consultation = await service.assign(a.professional, a.patient1.id, activity('Consulta'));
  let list = await rows();
  assert.deepEqual(recipients(list, 'family.invited'), [a.family.id, a.family.id, b.family.id].sort((a, b) => a - b));
  assert.deepEqual(recipients(list, 'family.accepted'), [a.professional.id, a.professional.id, a.professional.id]);
  assert.deepEqual(recipients(list, 'activity.assigned'), [a.patient1.id, a.patient1.id, a.family.id, b.family.id].sort((a, b) => a - b));
  const before = list.length;
  await assert.rejects(service.complete(a.family, a.patient1.id, consultation.activity.id));
  await assert.rejects(service.assign(b.professional, a.patient1.id, activity('Hogar')));
  await assert.rejects(service.complete(b.family, a.patient2.id, home.activity.id));
  assert.equal((await rows()).length, before);
  await Promise.all([service.complete(a.family, a.patient1.id, home.activity.id), service.complete(b.family, a.patient1.id, home.activity.id)]);
  await service.revoke(a.professional, a.patient1.id, a.family.id);
  await service.revoke(a.professional, a.patient1.id, a.family.id);
  list = await rows();
  assert.deepEqual(recipients(list, 'activity.completed'), [a.professional.id]);
  assert.deepEqual(recipients(list, 'family.revoked'), [a.family.id]);
  await assert.rejects(service.list(a.family, a.patient1.id, {}));
  assert.equal((await notices.list(b.professional.id)).notifications.length, 0);
  const publicText = JSON.stringify([list.map(({ title, body }) => ({ title, body })), emissions]);
  for (const privateValue of [invitation.code, a.patient1.nombre, a.patient1.email, 'PRIVATE-TITLE', 'PRIVATE-INSTRUCTION']) {
    assert.ok(!publicText.includes(privateValue));
  }
  assert.ok(emissions.every(value => typeof value.revision === 'string' && Object.keys(value).length === 3));
});

test('durable deduplication freezes audiences, survives restart and counts one revision per notice', async t => {
  const { db, a, b, rows, notices, seed, config } = await setup(t);
  assert.equal((await rows()).length, 0); // Seeding creates no historic events.
  await notices.createLogin(a.patient1.id);
  const uow = createUnitOfWork(db);
  const event = { type: 'activity.assigned', source: 'test-source', recipients: async () => [a.patient1.id, a.patient1.id] };
  const record = events => uow.run(client => persistAccompanimentNotifications(client, events, a.professional.id, () => {}));
  const results = await Promise.all([record([event]), record([event])]);
  assert.equal(results.flat().length, 1);
  const snapshot = await notices.list(a.patient1.id);
  assert.equal(snapshot.revision, '2'); assert.equal(snapshot.unreadCount, 2);
  await initializeDatabase(db); await initializeFamilyDemo(db, config.familyDemo.marker);
  await seedFamilyDemo(db, seed);
  assert.deepEqual(await notices.list(a.patient1.id), snapshot);
  assert.deepEqual(await record([{ ...event, recipients: async () => [a.patient1.id, b.family.id] }]), []);
  assert.equal((await notices.list(b.family.id)).unreadCount, 0);
  assert.deepEqual(await notices.list(a.patient1.id), snapshot);
});

test('repeated acceptance and revocation only notify real transitions; self-revocation notifies professional', async t => {
  const { a, service, link, rows } = await setup(t);
  await link();
  await link(); // Another accepted invitation does not reactivate an already active link.
  assert.equal(recipients(await rows(), 'family.accepted').length, 1);
  await service.revoke(a.family, a.patient1.id, a.family.id);
  await service.revoke(a.family, a.patient1.id, a.family.id);
  assert.deepEqual(recipients(await rows(), 'family.revoked'), [a.professional.id]);
  await link();
  await service.revoke(a.professional, a.patient1.id, a.family.id);
  const revoked = (await rows()).filter(row => row.type === 'family.revoked');
  assert.equal(revoked.length, 2); assert.notEqual(revoked[0].event_id, revoked[1].event_id);
});

test('revocation wins queued assignment and detached professionals receive no completion notice', async t => {
  const { db, a, b, service, link, rows } = await setup(t); await link();
  const blocker = await db.connect();
  let pending;
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [a.patient1.id]);
    await blocker.query('UPDATE family_patient_links SET active=FALSE WHERE patient_id=$1 AND family_id=$2', [a.patient1.id, a.family.id]);
    pending = service.assign(a.professional, a.patient1.id, activity('Hogar'));
    await blocker.query('COMMIT');
    const inserted = await pending;
    assert.deepEqual(recipients(await rows(), 'activity.assigned'), [a.patient1.id]);
    await db.query('UPDATE professional_patient_links SET active=FALSE WHERE professional_id=$1', [a.professional.id]);
    await service.complete(a.patient1, a.patient1.id, inserted.activity.id);
    assert.deepEqual(recipients(await rows(), 'activity.completed'), []);
    assert.deepEqual(recipients(await rows(), 'activity.assigned').filter(id => id === b.family.id), []);
  } finally { blocker.release(); }
});

test('secondary SQL failure rolls back every partial notice but preserves successful HTTP operation', async t => {
  const { db, a, config, options, rows, logs, emissions } = await setup(t);
  // Fail after insert and state.ensure, so recovering requires a real PostgreSQL savepoint.
  await db.query(`CREATE FUNCTION reject_notice_revision() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'PRIVATE-SQL-ERROR'; END $$`);
  await db.query('CREATE TRIGGER reject_notice_revision BEFORE UPDATE ON notification_state FOR EACH ROW EXECUTE FUNCTION reject_notice_revision()');
  const app = createApp({ database: db, config, publish: options.publish, logger: options.logger });
  t.after(() => app.locals.loginNotifications.close());
  const response = await request(app).post(`/api/family-demo/patients/${a.patient1.id}/activities`)
    .set('Authorization', `Bearer ${signToken(a.professional, config)}`).send(activity('Hogar')).expect(201);
  assert.ok(response.body.activity.id);
  assert.equal((await rows()).length, 0);
  assert.equal((await db.query('SELECT count(*) FROM accompaniment_events')).rows[0].count, '0');
  assert.equal((await db.query('SELECT count(*) FROM notification_state')).rows[0].count, '0');
  assert.equal((await db.query('SELECT count(*) FROM patient_activities WHERE id=$1', [response.body.activity.id])).rows[0].count, '1');
  assert.deepEqual(emissions, []); assert.equal(logs.length, 1);
  assert.deepEqual(Object.keys(logs[0]).sort(), ['code', 'correlationId', 'stage']);
  assert.ok(!JSON.stringify(logs).includes('PRIVATE-SQL-ERROR'));
});

function instrument(db, commit) {
  const trace = [], stats = { connections: 0, releases: 0 };
  return { trace, stats, pool: { async connect() {
    stats.connections++; const client = await db.connect();
    return { query: async (sql, params) => {
      trace.push(sql);
      if (sql === 'COMMIT') await commit(client);
      return client.query(sql, params);
    }, release: discard => { stats.releases++; return client.release(discard); } };
  } } };
}
test('one connection; no publication until COMMIT finishes; release before publication', async t => {
  const { db, a, options, rows } = await setup(t);
  let finish, reached;
  const gate = new Promise(resolve => { finish = resolve; });
  const entering = new Promise(resolve => { reached = resolve; });
  t.after(() => finish());
  const { pool, stats, trace } = instrument(db, async () => { reached(); await gate; });
  const emissions = [];
  const service = createFamilyDemoService(pool, { ...options, publish: async (id, state) => {
    assert.equal(stats.releases, 1); assert.equal((await rows()).length, 1); emissions.push({ id, ...state });
  } });
  const operation = service.assign(a.professional, a.patient1.id, activity('Hogar'));
  await entering;
  assert.deepEqual(emissions, []); assert.equal((await rows()).length, 0);
  finish(); await operation;
  assert.deepEqual(stats, { connections: 1, releases: 1 });
  assert.equal(emissions.length, 1); assert.equal(trace[0], 'BEGIN'); assert.equal(trace.at(-1), 'COMMIT');
});

test('principal rollback leaves no partial activity or notices; uncertain COMMIT never publishes', async t => {
  const { db, a, options, rows, emissions } = await setup(t);
  for (const uncertain of [false, true]) {
    const { pool, stats, trace } = instrument(db, async client => {
      if (uncertain) await client.query('COMMIT');
      throw new Error('test commit failure');
    });
    const service = createFamilyDemoService(pool, options);
    await assert.rejects(service.assign(a.professional, a.patient1.id, activity('Hogar')), /test commit failure/);
    assert.deepEqual(stats, { connections: 1, releases: 1 });
    assert.equal(trace.at(-1), 'ROLLBACK'); assert.deepEqual(emissions, []);
    assert.equal((await rows()).length, uncertain ? 1 : 0);
    assert.equal((await db.query("SELECT count(*) FROM patient_activities WHERE fixture_key IS NULL")).rows[0].count, uncertain ? '1' : '0');
  }
});

function once(socket, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, listener); reject(new Error(`Missing ${name}`)); }, 4000);
    const listener = value => { clearTimeout(timer); resolve(value); };
    socket.once(name, listener);
  });
}
test('Socket.IO and REST recover new notices on reconnection and keep other families isolated', async t => {
  const { db, a, b, config, notices } = await setup(t);
  const server = await createServer({ database: db, config });
  await new Promise(resolve => server.httpServer.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const clients = [];
  t.after(async () => { clients.forEach(socket => socket.disconnect()); await server.close(); });
  const connect = async user => {
    const socket = io(url, { autoConnect: false, forceNew: true, reconnection: false, transports: ['websocket'], auth: { token: signToken(user, config) } });
    clients.push(socket); const ready = once(socket, 'notifications:ready'); socket.connect(); await ready; return socket;
  };
  const patient = await connect(a.patient1), foreign = await connect(b.family);
  const leaked = []; foreign.on('notifications:changed', value => leaked.push(value));
  const changed = once(patient, 'notifications:changed');
  const assign = () => request(url).post(`/api/family-demo/patients/${a.patient1.id}/activities`)
    .set('Authorization', `Bearer ${signToken(a.professional, config)}`).send(activity('Hogar')).expect(201);
  await assign(); assert.deepEqual(await changed, { revision: '1', unreadCount: 1 });
  patient.disconnect(); await assign();
  const ready = once(patient, 'notifications:ready'); patient.connect(); await ready;
  const recovered = await request(url).get('/api/notifications').set('Authorization', `Bearer ${signToken(a.patient1, config)}`).expect(200);
  assert.equal(recovered.body.notifications.length, 2); assert.equal(recovered.body.revision, '2');
  const target = recovered.body.notifications[0].id;
  await request(url).post(`/api/notifications/${target}/read`).set('Authorization', `Bearer ${signToken(b.family, config)}`).expect(404);
  assert.deepEqual(leaked, []); assert.equal((await notices.list(b.family.id)).unreadCount, 0);
});

test('failed publication preserves successful operation and durable REST recovery', async t => {
  const { db, a, options, logs, notices } = await setup(t);
  const service = createFamilyDemoService(db, { ...options, publish: () => { throw new Error('PRIVATE-EMIT'); } });
  const result = await service.assign(a.professional, a.patient1.id, activity('Hogar'));
  assert.ok(result.activity.id);
  assert.equal((await notices.list(a.patient1.id)).unreadCount, 1);
  assert.equal(logs[0].stage, 'accompaniment.emit'); assert.ok(!JSON.stringify(logs).includes('PRIVATE-EMIT'));
});

test('new authorized professional can renew an ineffective grant; notices stay separated by patient', async t => {
  const { db, a, b, service, link, rows } = await setup(t);
  await link(); await link(a.patient2); await link(a.patient1, b.family);
  await service.assign(a.professional, a.patient2.id, activity('Hogar'));
  assert.deepEqual(recipients(await rows(), 'activity.assigned'), [a.family.id, a.patient2.id].sort((a, b) => a - b));
  const old = (await db.query('SELECT generation FROM family_patient_links WHERE patient_id=$1 AND family_id=$2', [a.patient1.id, a.family.id])).rows[0].generation;
  await db.query('UPDATE professional_patient_links SET active=FALSE WHERE professional_id=$1 AND patient_id=$2', [a.professional.id, a.patient1.id]);
  await db.query('INSERT INTO professional_patient_links(professional_id,patient_id) VALUES($1,$2)', [b.professional.id, a.patient1.id]);
  const invitation = await service.invite(b.professional, a.patient1.id, { email: a.family.email });
  await service.accept(a.family, { code: invitation.code });
  const renewed = (await db.query('SELECT generation,professional_id FROM family_patient_links WHERE patient_id=$1 AND family_id=$2', [a.patient1.id, a.family.id])).rows[0];
  assert.notEqual(renewed.generation, old); assert.equal(renewed.professional_id, b.professional.id);
  assert.ok((await service.patients(a.family)).patients.some(patient => patient.id === String(a.patient1.id)));
  assert.ok(recipients(await rows(), 'family.accepted').includes(b.professional.id));
});
