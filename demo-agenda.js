// Fictitious, already linked accounts only. This does not grant production consent.
const { createPatientSchedulingRepository } = require('./repositories/patient-scheduling-repository');
const { createDemoAgendaRepository } = require('./repositories/demo-agenda-repository');
function createDemoAgenda({ run, access, id, bigId, fields, ErrorType }) {
  const bad = () => { throw new ErrorType(400); };
  function monthRange(query) {
    fields(query, ['month']);
    if (typeof query.month !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(query.month)) bad();
    const [year, month] = query.month.split('-').map(Number);
    return [new Date(Date.UTC(year,month-1,1,3)),new Date(Date.UTC(year,month,1,3))];
  }
  async function context(ctx, patientId, writing) {
    const patient = id(patientId);
    const locks = createPatientSchedulingRepository(ctx.client);
    // All agenda mutations take the same ordered locks before checking overlap.
    await locks.lockUsers(writing ? [ctx.user.id, patient] : [patient]);
    await access(ctx, patient, writing);
    return { patient, repo: createDemoAgendaRepository(ctx.client) };
  }
  return {
    agendaProfile: (actor, patientId) => run(actor, async ctx => {
      const { patient, repo } = await context(ctx, patientId, true);
      return { profile: await repo.profile(patient, actor.id) };
    }),
    saveAgendaProfile: (actor, patientId, body) => run(actor, async ctx => {
      fields(body, ['firstName','lastName','contact']);
      for (const key of ['firstName','lastName']) if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > 80) bad();
      if (body.contact !== undefined && (typeof body.contact !== 'string' || body.contact.length > 160)) bad();
      const { patient, repo } = await context(ctx, patientId, true);
      return { profile: await repo.saveProfile(patient, actor.id, { firstName: body.firstName.trim(), lastName: body.lastName.trim(), contact: body.contact?.trim() || null }) };
    }),
    agenda: (actor, patientId, query) => run(actor, async ctx => {
      const [start,end] = monthRange(query);
      const { patient, repo } = await context(ctx, patientId, false);
      const appointments = await repo.list(patient, actor, start, end);
      if (appointments.length > 500) throw new ErrorType(429);
      return { appointments, timezone: 'America/Argentina/Buenos_Aires' };
    }),
    createAppointment: (actor, patientId, body) => run(actor, async ctx => {
      fields(body, ['date','time','duration']);
      if (typeof body.date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(body.date) ||
          typeof body.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5][05]$/.test(body.time) ||
          !Number.isInteger(body.duration) || body.duration < 15 || body.duration > 180 || body.duration % 5) bad();
      const start = new Date(`${body.date}T${body.time}:00-03:00`);
      if (!Number.isFinite(start.getTime()) || new Date(start.getTime()-10800000).toISOString().slice(0,16) !== `${body.date}T${body.time}` || start.getTime() <= Date.now()) bad();
      const end = new Date(start.getTime()+body.duration*60000);
      const { patient, repo } = await context(ctx, patientId, true);
      if (await repo.overlaps(patient, actor.id, start, end)) throw new ErrorType(409);
      return { appointment: await repo.insert(patient, actor.id, start, end) };
    }),
    cancelAppointment: (actor, patientId, appointmentId, body) => run(actor, async ctx => {
      fields(body, []);
      const { patient, repo } = await context(ctx, patientId, true);
      const appointment = await repo.cancel(patient, actor.id, bigId(appointmentId));
      if (!appointment) throw new ErrorType();
      return { appointment };
    })
  };
}
module.exports = { createDemoAgenda };
