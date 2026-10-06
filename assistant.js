const express = require('express');
const { GOOGLE_CONSENT } = require('./gemini-provider');

const HELP = 'Puedo explicar cómo usar DECILO o ayudarte a expresar una necesidad. No doy orientación clínica ni cambio datos.';
const PRIVATE = /@|\b(?:bearer|eyJ)[\w.-]*|(?:\d[\s()+-]*){7,}/i;
class AssistantError extends Error {
  constructor(status, code, message, retryAfter) { super(message); Object.assign(this, { status, code, retryAfter }); }
}
const invalid = () => new AssistantError(400, 'ASSISTANT_INVALID', 'Escribí hasta 800 caracteres, sin datos personales ni credenciales.');

// Local fallback remains deterministic and has no network access.
const simulatedProvider = Object.freeze({
  kind: 'simulated',
  async generate({ message, audience }) {
    const question = message.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,]/g, ' ').replace(/\b(?:acividad|activdad|actvidad)(es)?\b/g, 'actividad$1')
      .replace(/\s+/g, ' ').trim();
    let text = HELP;
    if (question === 'como usar decilo') text = audience === 'paciente'
      ? 'Abrí Mi comunicador. Elegí pictogramas para formar una frase. Podés usar el botón de voz para escucharla.'
      : 'Usá Actividades de hogar para consultar las propuestas disponibles. Acompañá dando tiempo para que la persona elija cómo expresarse.';
    if (question === 'ayudarme a expresar una necesidad') text = audience === 'paciente'
      ? 'Podés decir: «Necesito descansar». También podés elegir pictogramas en Mi comunicador. Vos decidís qué expresar.'
      : 'Podés ofrecer una frase como «Necesito descansar». Dale tiempo a la persona para elegir cómo expresar su necesidad.';
    const activityQuestion = /^(?:(?:donde|como|quiero) )?(?:(?:puedo|se) )?(?:busco|buscar|encuentro|encontrar|veo|ver|abro|abrir|esta|estan|accedo a|entrar a|entro a) (?:la |las |mi |mis |una |unas )?actividad(?:es)?(?: de hogar)?$/;
    if (activityQuestion.test(question) || /^(?:mis )?actividad(?:es)?$/.test(question)) {
      text = audience === 'paciente' ? 'Abrí Mis actividades en el menú.' : 'Abrí Actividades de hogar en el menú.';
    }
    return { text, usage: { inputTokens: 0, outputTokens: 0 } };
  }
});

function createAssistantService({ provider = simulatedProvider, geminiProvider, now = Date.now, timeoutMs = 15000 } = {}) {
  if (provider.kind !== 'simulated') throw new Error('Only the simulated assistant is available');
  const quotas = new Map(), busy = new Set();
  return {
    capabilities(user) {
      return { geminiAvailable: Boolean(geminiProvider?.available && ['paciente', 'familiar'].includes(user.rol) && /^[^@\s]+@[^@\s]+\.(test|invalid)$/i.test(user.email || '')), consentVersion: GOOGLE_CONSENT };
    },
    async reply(user, body, signal) {
      if (!['paciente', 'familiar'].includes(user.rol)) throw new AssistantError(403, 'ASSISTANT_FORBIDDEN', 'El ayudante es para pacientes y familiares.');
      if (!body || Array.isArray(body) || Object.keys(body).some(key => !['message', 'mode', 'consent'].includes(key)) || typeof body.message !== 'string') throw invalid();
      const mode = body.mode ?? 'simulated';
      if (!['simulated', 'gemini'].includes(mode)) throw invalid();
      if (mode === 'gemini') {
        if (body.consent !== GOOGLE_CONSENT) throw new AssistantError(400, 'ASSISTANT_CONSENT_REQUIRED', 'Aceptá el envío a Google antes de enviar.');
        if (!this.capabilities(user).geminiAvailable) throw new AssistantError(503, 'ASSISTANT_UNAVAILABLE', 'Gemini no está habilitado para esta cuenta de demostración. Podés usar el modo simulado.');
      }
      const message = body.message.trim();
      if (!message || [...body.message].length > 800 || PRIVATE.test(message)) throw invalid();
      if (signal?.aborted) throw new AssistantError(503, 'ASSISTANT_CANCELLED', 'Solicitud cancelada.');
      const time = now(), day = new Date(time).toISOString().slice(0, 10);
      for (const [id, quota] of quotas) if (quota.day !== day && !busy.has(id)) quotas.delete(id);
      const key = String(user.id);
      let quota = quotas.get(key);
      if (!quota || quota.day !== day) quota = { day, daily: 0, minute: [] };
      quota.minute = quota.minute.filter(t => time - t < 60000);
      if (busy.has(key) || busy.size >= 2) throw new AssistantError(429, 'ASSISTANT_BUSY', 'Esperá a que termine la solicitud actual.', 1);
      if (quota.daily >= 30 || quota.minute.length >= 5) {
        const seconds = quota.daily >= 30 ? Math.ceil((Date.parse(day) + 86400000 - time) / 1000) : Math.ceil((quota.minute[0] + 60000 - time) / 1000);
        throw new AssistantError(429, 'ASSISTANT_LIMIT', 'Alcanzaste el límite de la demostración. Reintentá más tarde.', Math.max(1, seconds));
      }
      if (!quotas.has(key) && quotas.size >= 10000) throw new AssistantError(503, 'ASSISTANT_UNAVAILABLE', 'El ayudante no está disponible ahora.');
      // Atomic within this single-process, zero-cost demo. Durable reservations remain a later task.
      quota.daily++; quota.minute.push(time); quotas.set(key, quota); busy.add(key);
      const controller = new AbortController();
      const cancel = () => controller.abort(new AssistantError(503, 'ASSISTANT_CANCELLED', 'Solicitud cancelada.'));
      signal?.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(() => controller.abort(new AssistantError(504, 'ASSISTANT_TIMEOUT', 'El ayudante tardó demasiado. Podés volver a intentar.')), timeoutMs);
      let onAbort;
      try {
        const aborted = new Promise((_, reject) => { onAbort = () => reject(controller.signal.reason); controller.signal.addEventListener('abort', onAbort, { once: true }); });
        // Clinical requests remain local, including in Gemini mode. This is not a medical safety certification.
        if (mode === 'gemini' && /diagn[oó]st|medic|tratamiento|dosis|recet|s[ií]ntoma|enfermedad/i.test(message)) return { reply: HELP };
        const selected = mode === 'gemini' ? geminiProvider : provider;
        const result = await Promise.race([Promise.resolve().then(() => selected.generate({ message, audience: user.rol, publicHelp: HELP, maxOutputTokens: 256, signal: controller.signal })), aborted]);
        const text = result?.text;
        const allowed = await simulatedProvider.generate({ message, audience: user.rol });
        const safe = typeof text === 'string' && text.trim() && [...text].length <= (user.rol === 'paciente' ? 400 : 700)
          && !/[<>]|https?:\/\/|diagn[oó]st|medic|tratamiento|dosis|recet/i.test(text) && !PRIVATE.test(text)
          && (user.rol !== 'paciente' || text.split(/[.!?]+/).filter(part => part.trim()).length <= 3);
        return { reply: mode === 'simulated' ? (typeof text === 'string' && text === allowed.text ? text : HELP) : (safe ? text : HELP) };
      } catch (error) {
        if (error instanceof AssistantError) throw error;
        if (error.providerStatus === 429) throw new AssistantError(429, 'ASSISTANT_PROVIDER_LIMIT', 'Google alcanzó un límite de uso. Usá el modo simulado o intentá más tarde.', 60);
        throw new AssistantError(502, 'ASSISTANT_FAILURE', 'No pudimos responder. Podés usar la ayuda local e intentar más tarde.');
      } finally {
        clearTimeout(timer); controller.signal.removeEventListener('abort', onAbort);
        signal?.removeEventListener('abort', cancel); busy.delete(key);
      }
    }
  };
}

function createAssistantRouter({ authenticate, service = createAssistantService() }) {
  const router = express.Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/capabilities', authenticate, (req, res) => res.json(service.capabilities(req.user)));
  router.post('/messages', authenticate, express.json({ limit: '8kb' }), async (req, res, next) => {
    const controller = new AbortController();
    const cancel = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', cancel);
    try { const result = await service.reply(req.user, req.body, controller.signal); if (!res.destroyed) res.json(result); }
    catch (error) { next(error); }
    finally { res.off('close', cancel); }
  });
  router.use((error, _req, res, _next) => {
    if (res.destroyed) return;
    const known = error instanceof AssistantError;
    const status = known ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 503;
    if (known && error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
    res.status(status).json({ error: known ? error.code : 'ASSISTANT_REQUEST_ERROR', message: known ? error.message : 'No pudimos procesar la solicitud. Revisá el mensaje e intentá más tarde.' });
  });
  return router;
}
module.exports = { createAssistantService, createAssistantRouter, simulatedProvider };
