const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createGeminiProvider, DEFAULT_MODEL, GOOGLE_CONSENT } = require('../gemini-provider');
const { createAssistantService } = require('../assistant');
const { createApp } = require('../server');
const { signToken } = require('../auth');
const user = { id: 1, rol: 'paciente', email: 'demo@example.test', nombre: 'private-name' };
const body = { message: 'Dónde busco la actividad', mode: 'gemini', consent: GOOGLE_CONSENT, demoAdultConfirmed: true };
const fakeKey = 'synthetic-gemini-test-value-not-a-real-key';
const goodResponse = () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Abrí Mis actividades en el menú.' }] } }] }));
test('public Gemini requires an explicitly allowed fictional identity and age confirmation',async()=>{
  let calls=0;
  const geminiProvider=createGeminiProvider({enabled:true,apiKey:fakeKey,fetchImpl:async()=>{calls++;return goodResponse();}});
  const service=createAssistantService({geminiProvider,allowedUserIds:['1']});
  for(const denied of [{...user,id:2},{...user,email:'demo@decilo.com'}]) await assert.rejects(service.reply(denied,body),{status:503});
  await assert.rejects(service.reply(user,{...body,demoAdultConfirmed:undefined}),{status:400});
  await assert.rejects(createAssistantService({geminiProvider,allowedUserIds:[]}).reply(user,body),{status:503});
  assert.equal(calls,0);
  await service.reply(user,body); assert.equal(calls,1);
});

test('Gemini sends only one question and public role guide, key in header, fixed endpoint', async () => {
  for (const rol of ['paciente', 'familiar']) {
    let captured;
    const provider = createGeminiProvider({ enabled: true, apiKey: fakeKey, model: DEFAULT_MODEL, fetchImpl: async (url, options) => { captured = { url, options }; return goodResponse(); } });
    await createAssistantService({ geminiProvider: provider }).reply({ ...user, rol }, body);
    assert.equal(captured.url, `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`);
    assert.equal(captured.options.headers['x-goog-api-key'], fakeKey);
    assert.equal(captured.options.redirect, 'error');
    assert.ok(captured.options.signal instanceof AbortSignal);
    const payload = JSON.parse(captured.options.body);
    assert.deepEqual(Object.keys(payload).sort(), ['contents', 'generationConfig', 'systemInstruction']);
    assert.deepEqual(payload.contents, [{ role: 'user', parts: [{ text: body.message }] }]);
    assert.match(payload.systemInstruction.parts[0].text, rol === 'paciente' ? /Mi comunicador, Mis actividades/ : /Seguimiento, Actividades de hogar/);
    assert.equal(payload.generationConfig.maxOutputTokens, 256);
    for (const secret of [fakeKey, user.email, user.nombre, 'JWT_SECRET']) assert.equal(captured.options.body.includes(secret), false);
    assert.equal(captured.options.headers.Authorization, undefined);
  }
});

test('Gemini stays disabled without explicit configuration, consent or fictional account', async () => {
  let calls = 0;
  const provider = createGeminiProvider({ enabled: true, apiKey: fakeKey, fetchImpl: async () => { calls++; return goodResponse(); } });
  const service = createAssistantService({ geminiProvider: provider });
  for (const consent of [undefined, true, 'old-version']) await assert.rejects(service.reply(user, { ...body, consent }), { status: 400 });
  await assert.rejects(service.reply({ ...user, email: 'real@example.com' }, body), { status: 503 });
  await assert.rejects(service.reply({ ...user, rol: 'profesional' }, body), { status: 403 });
  await assert.rejects(service.reply(user, { ...body, history: ['private'] }), { status: 400 });
  for (const config of [{ apiKey: fakeKey }, { enabled: true }, { enabled: true, apiKey: fakeKey, model: '../private?key=x' }]) {
    const unavailable = createAssistantService({ geminiProvider: createGeminiProvider(config) });
    assert.equal(unavailable.capabilities(user).geminiAvailable, false);
    await assert.rejects(unavailable.reply(user, body), { status: 503 });
  }
  await service.reply(user, { message: 'Cómo usar DECILO' });
  await service.reply(user, { ...body, message: 'Decime qué medicación tomar' });
  assert.equal(calls, 0);
});

test('Gemini mock errors, blocked output, truncation and unsafe answers never expose content', async () => {
  const responses = [
    () => new Response('private upstream error', { status: 429 }),
    () => new Response('private upstream error', { status: 401 }),
    () => new Response('not json'),
    () => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } })),
    () => new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] })),
    () => new Response('x'.repeat(32769))
  ];
  for (const response of responses) {
    let calls = 0;
    const service = createAssistantService({ geminiProvider: createGeminiProvider({ enabled: true, apiKey: fakeKey, fetchImpl: async () => { calls++; return response(); } }) });
    await assert.rejects(service.reply(user, body), e => [429, 502].includes(e.status) && !e.message.includes('private'));
    assert.equal(calls, 1);
  }
  for (const text of ['Tomá esta medicación.', '<script>alert(1)</script>', 'x'.repeat(701), 'Uno. Dos. Tres. Cuatro.', '']) {
    const service = createAssistantService({ geminiProvider: createGeminiProvider({ enabled: true, apiKey: fakeKey,
      fetchImpl: async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] })) }) });
    assert.match((await service.reply(user, body)).reply, /No doy orientación clínica/);
  }
});

test('Gemini preserves timeout, signal and quota without real HTTP', async () => {
  let signal;
  const service = createAssistantService({ timeoutMs: 5, geminiProvider: createGeminiProvider({ enabled: true, apiKey: fakeKey,
    fetchImpl: (_url, options) => { signal = options.signal; return new Promise(() => {}); } }) });
  await assert.rejects(service.reply(user, body), { status: 504 });
  assert.equal(signal.aborted, true);
  let calls = 0;
  const limited = createAssistantService({ geminiProvider: createGeminiProvider({ enabled: true, apiKey: fakeKey, fetchImpl: async () => { calls++; return goodResponse(); } }) });
  for (let i = 0; i < 5; i++) await limited.reply(user, body);
  await assert.rejects(limited.reply(user, body), { status: 429 }); assert.equal(calls, 5);
});

test('Gemini HTTP requires consent server-side and exposes only public capability metadata', async () => {
  const config = { jwtSecret: 'synthetic-test-secret-at-least-32-characters', jwtExpiresIn: '1h', corsOrigins: [] };
  let calls = 0;
  const service = createAssistantService({ geminiProvider: createGeminiProvider({ enabled: true, apiKey: fakeKey, fetchImpl: async () => { calls++; return goodResponse(); } }) });
  const app = createApp({ config, database: {}, users: { findById: async () => user }, assistantService: service, loginNotifications: { schedule() {} } });
  const token = signToken(user, config);
  assert.equal((await request(app).get('/api/assistant/capabilities')).status, 401);
  const metadata = await request(app).get('/api/assistant/capabilities').set('Authorization', `Bearer ${token}`);
  assert.deepEqual(metadata.body, { geminiAvailable: true, consentVersion: GOOGLE_CONSENT });
  assert.equal(metadata.headers['cache-control'], 'no-store');
  assert.equal(calls, 0);
  const response = await request(app).post('/api/assistant/messages').set('Authorization', `Bearer ${token}`).send({ message: 'Hola', mode: 'gemini' });
  assert.equal(response.status, 400); assert.equal(calls, 0);
});
