const express = require('express');
const { randomBytes, createHash } = require('node:crypto');
const { createUnitOfWork } = require('./unit-of-work');
const { verifyDemo } = require('./family-demo-schema');
const { createFamilyLinkRepository } = require('./repositories/family-link-repository');
const { createPatientActivityRepository } = require('./repositories/patient-activity-repository');
const { createPatientProgressRepository } = require('./repositories/patient-progress-repository');
const { createPatientBoardRepository } = require('./repositories/patient-board-repository');
const { persistAccompanimentNotifications, publishAccompanimentNotifications } = require('./accompaniment-notifications');
class FamilyError extends Error {
  constructor(status = 404) { super(status === 400 ? 'Revisá los datos ingresados.' : status === 429 ? 'Esperá un minuto antes de reintentar.' : 'El recurso no está disponible.'); this.status = status; }
}
const id = value => { if (!/^[1-9][0-9]{0,9}$/.test(String(value)) || Number(value) > 2147483647) throw new FamilyError(400); return Number(value); };
const bigId = value => { if (typeof value !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw new FamilyError(400); return value; };
const hash = value => createHash('sha256').update(value).digest('hex');
const boardPictograms = new Set(['quiero','necesito','comer','tomar','mama','papa','galletita','agua','pelota','musica','feliz','cansado','hola','gracias','triste','enojado','asustado','tranquilo','preocupado','ayuda','hambre','sed','bano','dolor','frio','calor','descanso','casa','escuela','hospital','parque','plaza','cocina','habitacion','patio','abuela','abuelo','hermana','hermano','amiga','amigo','docente','terapeuta','dormir','jugar','leer','escribir','escuchar','hablar','ir','venir','parar','lavarse','esperar','silla','libro','lapiz','mochila','ropa','manta','telefono','tenedor','vaso','juguete']);
function boardFields(body) {
  fields(body, ['name', 'pictogramIds']);
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120 ||
      !Array.isArray(body.pictogramIds) || !body.pictogramIds.length || body.pictogramIds.length > boardPictograms.size ||
      new Set(body.pictogramIds).size !== body.pictogramIds.length || body.pictogramIds.some(value => !boardPictograms.has(value))) throw new FamilyError(400);
}
function fields(body, allowed) {
  if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(key => !allowed.includes(key))) throw new FamilyError(400);
}
function pagination(query = {}) {
  if (query.limit !== undefined && typeof query.limit !== 'string') throw new FamilyError(400);
  if (Object.keys(query).some(key => !['before', 'limit'].includes(key)) || !/^(?:[1-9][0-9]?|100)$/.test(String(query.limit ?? '20'))) throw new FamilyError(400);
  return { before: query.before === undefined ? null : bigId(query.before), limit: Number(query.limit || 20) };
}
function createFamilyDemoService(database, { enabled = false, marker, publish = () => {}, logger = entry => console.error(entry) } = {}) {
  const uow = createUnitOfWork(database);
  const buckets = new Map();
  function limit(actor) {
    const now = Date.now();
    for (const [key, entry] of buckets) if (entry.until <= now) buckets.delete(key);
    if (buckets.size >= 1000 && !buckets.has(actor)) throw new FamilyError(429);
    const entry = buckets.get(actor) || { count: 0, until: now + 60000 };
    buckets.set(actor, entry);
    if (++entry.count > 5) throw new FamilyError(429);
  }
  async function run(actor, operation) {
    if (!enabled) throw new FamilyError(404);
    const { result, updates } = await uow.run(async client => {
      await verifyDemo(client, marker);
      const links = createFamilyLinkRepository(client);
      const user = await links.member(actor.id);
      if (!user || user.rol !== actor.rol) throw new FamilyError(403);
      const events = [];
      const notify = (type, source, recipients) => events.push({ type, source, recipients });
      const result = await operation({ user, links, notify, boards: createPatientBoardRepository(client), activities: createPatientActivityRepository(client), progress: createPatientProgressRepository(client) });
      const updates = await persistAccompanimentNotifications(client, events, user.id, logger);
      return { result, updates };
    });
    await publishAccompanimentNotifications(updates, publish, logger);
    return result;
  }
  async function access(ctx, patient, professionalOnly = false) {
    await ctx.links.lockPatient(patient);
    const target = await ctx.links.member(patient);
    if (!target || target.rol !== 'paciente') throw new FamilyError();
    const role = ctx.user.rol;
    const permitted = role === 'profesional' ? await ctx.links.professional(ctx.user.id, patient)
      : !professionalOnly && (role === 'paciente' ? ctx.user.id === patient : await ctx.links.family(ctx.user.id, patient));
    if (!permitted) throw new FamilyError();
    return target;
  }
  async function professionalRecipient(ctx, professional, patient) {
    const member = await ctx.links.member(professional);
    return member?.rol === 'profesional' && await ctx.links.professional(professional, patient) ? [professional] : [];
  }
  return {
    async capabilities(actor) {
      if (!enabled) return { enabled: false };
      await verifyDemo(database, marker);
      const member = await createFamilyLinkRepository(database).member(actor.id);
      return { enabled: true, allowed: Boolean(member && member.rol === actor.rol) };
    },
    patients: actor => run(actor, async ctx => ({ patients: await ctx.links.patients(ctx.user.id) })),
    boards: (actor, patientId) => run(actor, async ctx => {
      if (!['profesional', 'paciente'].includes(ctx.user.rol)) throw new FamilyError();
      const patient = id(patientId); await access(ctx, patient);
      return { boards: await ctx.boards.list(patient) };
    }),
    saveBoard: (actor, patientId, body, boardId) => run(actor, async ctx => {
      boardFields(body);
      const patient = id(patientId); await access(ctx, patient, true);
      if (boardId === undefined && await ctx.boards.count(patient) >= 100) throw new FamilyError(429);
      const board = boardId === undefined
        ? await ctx.boards.insert(patient, actor.id, body.name.trim(), body.pictogramIds)
        : await ctx.boards.update(patient, actor.id, bigId(boardId), body.name.trim(), body.pictogramIds);
      if (!board) throw new FamilyError();
      return { board };
    }),
    invite(actor, patientId, body) {
      fields(body, ['email']);
      if (typeof body.email !== 'string' || body.email.length > 254) throw new FamilyError(400);
      const patient = id(patientId);
      return run(actor, async ctx => {
        limit(actor.id);
        await access(ctx, patient, true);
        const family = await ctx.links.byEmail(body.email.trim().toLowerCase());
        if (!family || family.rol !== 'familiar') throw new FamilyError();
        await ctx.links.invalidate(patient, family.id);
        if (await ctx.links.pending(patient) >= 5) throw new FamilyError(429);
        const code = randomBytes(16).toString('hex').toUpperCase();
        const invitation = await ctx.links.invite(patient, actor.id, family.id, hash(code));
        ctx.notify('family.invited', invitation.id, async () => [family.id]);
        return { invitationId: invitation.id, code, expiresAt: invitation.expiresAt };
      });
    },
    accept(actor, body) {
      fields(body, ['code']);
      if (typeof body.code !== 'string' || !/^[a-fA-F0-9]{32}$/.test(body.code.trim())) throw new FamilyError(400);
      return run(actor, async ctx => {
        limit(actor.id);
        if (ctx.user.rol !== 'familiar') throw new FamilyError(403);
        const codeHash = hash(body.code.trim().toUpperCase());
        const invitation = await ctx.links.invitation(codeHash);
        if (!invitation || invitation.family_id !== actor.id) throw new FamilyError();
        await ctx.links.lockPatient(invitation.patient_id);
        const professional = await ctx.links.member(invitation.professional_id);
        const patient = await ctx.links.member(invitation.patient_id);
        if (professional?.rol !== 'profesional' || patient?.rol !== 'paciente' ||
            !await ctx.links.professional(professional.id, patient.id)) throw new FamilyError();
        if (!await ctx.links.consume(codeHash, actor.id)) throw new FamilyError();
        const activated = await ctx.links.activate(patient.id, actor.id, professional.id);
        if (activated.rowCount) ctx.notify('family.accepted', invitation.id, () => professionalRecipient(ctx, professional.id, patient.id));
        return { patient: { id: String(patient.id), name: patient.nombre } };
      });
    },
    links: (actor, patientId) => run(actor, async ctx => {
      const patient = id(patientId); await access(ctx, patient, true);
      return { families: await ctx.links.links(patient) };
    }),
    revoke: (actor, patientId, familyId) => run(actor, async ctx => {
      const patient = id(patientId), family = id(familyId);
      await ctx.links.lockPatient(patient);
      if (ctx.user.rol === 'profesional') await access(ctx, patient, true);
      else if (ctx.user.rol !== 'familiar' || family !== actor.id) throw new FamilyError();
      const revoked = await ctx.links.revoke(patient, family); await ctx.links.invalidate(patient, family);
      if (revoked.rowCount) ctx.notify('family.revoked', revoked.rows[0].generation, async () => {
        const member = await ctx.links.member(family);
        return [...(member?.rol === 'familiar' ? [family] : []), ...await professionalRecipient(ctx, revoked.rows[0].professional_id, patient)];
      });
      return {};
    }),
    list: (actor, patientId, query) => run(actor, async ctx => {
      const patient = id(patientId), { before, limit } = pagination(query);
      await access(ctx, patient);
      const rows = await ctx.activities.list(patient, actor.rol === 'familiar', before, limit + 1);
      return { activities: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
    }),
    assign: (actor, patientId, body) => run(actor, async ctx => {
      fields(body, ['title', 'instruction', 'availability', 'points']);
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 120 || typeof body.instruction !== 'string' ||
          !body.instruction.trim() || body.instruction.length > 1000 || !['Hogar', 'Consulta'].includes(body.availability) ||
          !Number.isInteger(body.points) || body.points < 0 || body.points > 100) throw new FamilyError(400);
      const patient = id(patientId); await access(ctx, patient, true);
      const activity = await ctx.activities.insert(patient, actor.id, body);
      ctx.notify('activity.assigned', activity.id, async () => {
        const recipients = [patient];
        if (body.availability === 'Hogar') for (const family of await ctx.links.links(patient)) {
          const member = await ctx.links.member(Number(family.id));
          if (member?.rol === 'familiar' && await ctx.links.family(member.id, patient)) recipients.push(member.id);
        }
        return recipients;
      });
      return { activity };
    }),
    complete: (actor, patientId, activityId) => run(actor, async ctx => {
      const patient = id(patientId); await access(ctx, patient);
      if (!['paciente', 'familiar'].includes(actor.rol)) throw new FamilyError(403);
      const activity = await ctx.activities.find(patient, bigId(activityId), actor.rol === 'familiar');
      if (!activity) throw new FamilyError();
      const completed = await ctx.activities.complete(activity, actor.id, actor.rol);
      if (completed.rowCount) ctx.notify('activity.completed', activity.id, () => professionalRecipient(ctx, activity.professional_id, patient));
      return { delivery: await ctx.activities.delivery(activity.id) };
    }),
    summary: (actor, patientId) => run(actor, async ctx => {
      const patient = id(patientId); await access(ctx, patient);
      const summary = await ctx.progress.summary(patient, actor.rol === 'familiar');
      return { ...summary, completionPercent: summary.assigned ? Math.round(100 * summary.completed / summary.assigned) : null,
        badges: summary.points >= 25 ? [{ key: 'primeros-pasos', label: 'Primeros pasos' }] : [] };
    }),
    comments: (actor, patientId, query) => run(actor, async ctx => {
      const patient = id(patientId), { before, limit } = pagination(query); await access(ctx, patient);
      const rows = await ctx.progress.comments(patient, actor.rol === 'familiar', before, limit + 1);
      return { comments: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
    }),
    comment: (actor, patientId, body) => run(actor, async ctx => {
      fields(body, ['text', 'activityId']);
      if (typeof body.text !== 'string' || body.text.trim().length < 3 || body.text.length > 1000) throw new FamilyError(400);
      const patient = id(patientId); await access(ctx, patient);
      if (actor.rol !== 'familiar') throw new FamilyError(403);
      const activity = body.activityId === undefined ? null : bigId(body.activityId);
      if (activity && !await ctx.activities.find(patient, activity, true)) throw new FamilyError();
      return { comment: await ctx.progress.insertComment(patient, actor.id, body.text.trim(), activity) };
    })
  };
}
function createFamilyDemoRouter({ authenticate, service }) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(authenticate, express.json({ limit: '8kb' }));
  const route = (fn, status = 200) => async (req, res) => {
    try { const result = await fn(req); res.status(status).json(result); }
    catch (error) { const status = error instanceof FamilyError ? error.status : 503;
      if (status === 429) res.set('Retry-After', '60');
      res.status(status).json({ error: 'FAMILY_DEMO_REQUEST', message: error instanceof FamilyError ? error.message : 'La demo no está disponible.' }); }
  };
  router.get('/capabilities', route(r => service.capabilities(r.user)));
  router.get('/patients', route(r => service.patients(r.user)));
  router.get('/patients/:patient/boards', route(r => service.boards(r.user, r.params.patient)));
  router.post('/patients/:patient/boards', route(r => service.saveBoard(r.user, r.params.patient, r.body), 201));
  router.post('/patients/:patient/boards/:board', route(r => service.saveBoard(r.user, r.params.patient, r.body, r.params.board)));
  router.put('/patients/:patient/boards/:board', route(r => service.saveBoard(r.user, r.params.patient, r.body, r.params.board)));
  router.post('/invitations/accept', route(r => service.accept(r.user, r.body)));
  router.post('/patients/:patient/family-invitations', route(r => service.invite(r.user, r.params.patient, r.body), 201));
  router.get('/patients/:patient/family-links', route(r => service.links(r.user, r.params.patient)));
  router.delete('/patients/:patient/family-links/:family', route(r => service.revoke(r.user, r.params.patient, r.params.family), 204));
  router.get('/patients/:patient/activities', route(r => service.list(r.user, r.params.patient, r.query)));
  router.post('/patients/:patient/activities', route(r => service.assign(r.user, r.params.patient, r.body), 201));
  router.post('/patients/:patient/activities/:activity/complete', route(r => { fields(r.body, []); return service.complete(r.user, r.params.patient, r.params.activity); }));
  router.get('/patients/:patient/progress', route(r => service.summary(r.user, r.params.patient)));
  router.get('/patients/:patient/comments', route(r => service.comments(r.user, r.params.patient, r.query)));
  router.post('/patients/:patient/comments', route(r => service.comment(r.user, r.params.patient, r.body), 201));
  router.use((error, _req, res, _next) => res.status(error.status === 413 ? 413 : 400).json({ error: 'FAMILY_DEMO_REQUEST', message: 'Solicitud inválida.' }));
  return router;
}
module.exports = { createFamilyDemoService, createFamilyDemoRouter, FamilyError };
