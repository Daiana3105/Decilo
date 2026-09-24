const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

// Execute the real handler inside its closure, without adding production test hooks.
// DOM interaction and native form validation are covered separately by Playwright.
const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
function setup() {
  const state = {
    users: [{ id: "own", role: "paciente", name: "Propio" }, { id: "other", role: "paciente", name: "Ajeno" }],
    relationships: [{ professionalId: "prof", patientId: "own", familyIds: [] }],
    activities: [], boards: [], deliveries: [], comments: [], badges: []
  };
  const writes = [], messages = [], listeners = {};
  const fields = new Map(Object.entries({ patientId: "own", title: "Actividad", instruction: "Instrucción", points: "15", availability: "Hogar" }));
  const nodes = new Map();
  const node = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: "", focus() {}, setAttribute() {}, removeAttribute() {},
      addEventListener(type, fn) { listeners[`${selector}:${type}`] = fn; } });
    return nodes.get(selector);
  };
  const dialog = { removed: false, querySelector: node, querySelectorAll: () => [],
    addEventListener() {}, remove() { this.removed = true; }, classList: { add() {} } };
  const context = vm.createContext({
    window: { DeciloNotifications: { createWidget: () => ({}) } },
    document: { activeElement: null, querySelector: () => null },
    localStorage: { getItem: () => JSON.stringify(state), setItem: (key, value) => writes.push({ key, value }) },
    sessionStorage: { getItem: () => JSON.stringify({ token: "synthetic", user: {}, userId: "prof", role: "profesional" }) },
    FormData: class { get(key) { return fields.get(key) ?? null; } },
    testModal: () => dialog, testToast: (message) => messages.push(message)
  });
  vm.runInContext(source.replace("  restoreSession();", `
    modal = testModal; showToast = testToast; render = () => {};
    globalThis.activityTest = { openActivityModal, get data() { return data; },
      get session() { return session; }, clearSession() { session = null; } };
  `), context);
  return { api: context.activityTest, fields, writes, messages, dialog, node,
    submit() { listeners["#activity-form:submit"]({ preventDefault() {}, currentTarget: {} }); } };
}

const invalidCases = {
  "sin pacientes": (h) => { h.api.data.users = []; h.api.data.relationships = []; h.fields.delete("patientId"); },
  "identificador ausente": (h) => h.fields.delete("patientId"),
  "identificador vacío": (h) => h.fields.set("patientId", ""),
  "solo espacios": (h) => h.fields.set("patientId", "   "),
  "identificador inexistente": (h) => h.fields.set("patientId", "missing"),
  "paciente no vinculado": (h) => h.fields.set("patientId", "other"),
  "relación retirada con diálogo abierto": (h) => { h.api.data.relationships = []; },
  "paciente retirado con diálogo abierto": (h) => { h.api.data.users = []; },
  "usuario vinculado que no es paciente": (h) => { h.api.data.users[0].role = "familiar"; },
  "rol cambiado con diálogo abierto": (h) => { h.api.session.role = "familiar"; },
  "sesión terminada con diálogo abierto": (h) => h.api.clearSession()
};
for (const [name, invalidate] of Object.entries(invalidCases)) {
  test(`asignación rechaza ${name} sin mutación, escritura ni éxito`, () => {
    const h = setup();
    h.api.openActivityModal();
    invalidate(h);
    const before = JSON.stringify(h.api.data);
    h.submit();
    assert.equal(JSON.stringify(h.api.data), before);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.messages, []);
    assert.equal(h.dialog.removed, false);
    assert.ok(h.node("#activity-message").textContent.length > 0);
    assert.doesNotMatch(h.node("#activity-message").textContent, /Ajeno/);
  });
}

test("asignación válida después de rechazo conserva campos y escribe una sola actividad", () => {
  const h = setup(); h.api.openActivityModal();
  h.fields.set("patientId", "other"); h.submit();
  assert.equal(h.writes.length, 0);
  h.fields.set("patientId", "own"); h.submit();
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].key, "decilo-mvp-v1");
  const saved = JSON.parse(h.writes[0].value).activities;
  assert.equal(saved.length, 1);
  const { id, ...activity } = saved[0];
  assert.ok(id);
  assert.deepEqual(activity, { patientId: "own", professionalId: "prof", title: "Actividad", instruction: "Instrucción", availability: "Hogar", points: 15, status: "available" });
  assert.deepEqual(h.messages, ["Actividad asignada"]);
  assert.equal(h.dialog.removed, true);
});
