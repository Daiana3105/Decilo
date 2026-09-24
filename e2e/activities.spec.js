const { test, expect, restore } = require("./fixtures");

async function prepare(page, stack, patientCount = 1) {
  const users = [
    ...Array.from({ length: patientCount }, (_, i) => ({ id: `own-${i}`, name: `Paciente propio ${i}`, role: "paciente" })),
    { id: "other", name: "Paciente ajeno", role: "paciente" }
  ];
  const data = { users, relationships: users.filter((u) => u.id !== "other").map((u) => ({
    patientId: u.id, professionalId: String(stack.users.profesional.id), familyIds: []
  })), activities: [], boards: [], deliveries: [], comments: [], badges: [] };
  await page.addInitScript((data) => {
    // Preserve the result on reload so persistence assertions cannot use a reset fixture.
    if (!localStorage.getItem("decilo-mvp-v1")) localStorage.setItem("decilo-mvp-v1", JSON.stringify(data));
    window.activityWrites = [];
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === "decilo-mvp-v1") window.activityWrites.push(value);
      return setItem.call(this, key, value);
    };
  }, data);
  await restore(page, stack, stack.users.profesional);
  await page.getByRole("button", { name: "Actividades", exact: true }).click();
  await page.getByRole("button", { name: "+ Asignar actividad", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Asignar actividad", exact: true })).toBeVisible();
}
async function fill(page) {
  await page.getByLabel("Título", { exact: true }).fill("Práctica de prueba");
  await page.getByLabel("Instrucción", { exact: true }).fill("Construir una frase con agua");
  await page.getByLabel("Puntos", { exact: true }).fill("15");
  await page.getByRole("combobox", { name: "Disponibilidad", exact: true }).selectOption("Consulta");
}
const stored = (page) => page.evaluate(() => localStorage.getItem("decilo-mvp-v1"));
async function directSubmit(page, patientId) {
  await page.locator("#activity-form").evaluate((form, value) => {
    const select = form.querySelector('[name="patientId"]');
    if (value === null) select.removeAttribute("name");
    else { select.add(new Option("Selección de prueba", value)); select.value = value; }
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }, patientId);
}
async function unchanged(page, before) {
  expect(await stored(page)).toBe(before);
  expect(await page.evaluate(() => window.activityWrites)).toEqual([]);
  await expect(page.locator(".toast")).toHaveCount(0);
  await expect(page.locator("#activity-form")).toBeVisible();
}

test("sin pacientes explica el bloqueo y rechaza incluso el envío directo", async ({ page, stack }) => {
  await prepare(page, stack, 0);
  const before = await stored(page);
  await expect(page.locator("#activity-empty")).toContainText("No tenés pacientes vinculados");
  await expect(page.getByRole("combobox", { name: "Paciente", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Confirmar asignación" })).toBeDisabled();
  await directSubmit(page, null);
  await expect(page.locator("#activity-message")).toContainText("Seleccioná un paciente");
  await unchanged(page, before);
});

for (const [name, id] of [["ausente", null], ["vacío", ""], ["espacios", "   "], ["inexistente", "missing"], ["no vinculado", "other"]]) {
  test(`envío directo con patientId ${name} no escribe ni muestra éxito`, async ({ page, stack }) => {
    await prepare(page, stack); await fill(page);
    const before = await stored(page);
    await directSubmit(page, id);
    await expect(page.locator("#activity-message")).not.toBeEmpty();
    await expect(page.locator("#activity-message")).toHaveAttribute("role", "alert");
    await expect(page.locator("#activity-message")).not.toContainText("Paciente ajeno");
    await unchanged(page, before);
  });
}

for (const patientCount of [1, 2]) {
  test(`asignación autorizada con ${patientCount} pacientes conserva campos y persiste al recargar`, async ({ page, stack }) => {
    await prepare(page, stack, patientCount); await fill(page);
    const before = await stored(page);
    await page.getByRole("button", { name: "Confirmar asignación" }).click();
    await expect(page.getByRole("combobox", { name: "Paciente", exact: true })).toBeFocused();
    expect(await page.locator("#activity-patient").evaluate((el) => el.validity.valueMissing)).toBe(true);
    await unchanged(page, before);
    await directSubmit(page, "other"); await unchanged(page, before);
    await page.getByRole("combobox", { name: "Paciente", exact: true }).selectOption(`own-${patientCount - 1}`);
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue("Práctica de prueba");
    await page.getByRole("button", { name: "Confirmar asignación" }).click();
    await expect(page.locator(".toast")).toHaveText("Actividad asignada");
    await expect(page.locator("#activity-form")).toHaveCount(0);
    const result = JSON.parse(await stored(page));
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]).toMatchObject({ patientId: `own-${patientCount - 1}`, professionalId: String(stack.users.profesional.id),
      title: "Práctica de prueba", instruction: "Construir una frase con agua", availability: "Consulta", points: 15, status: "available" });
    expect(await page.evaluate(() => window.activityWrites.length)).toBe(1);
    await page.reload();
    await page.getByRole("button", { name: "Actividades", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Práctica de prueba" })).toBeVisible();
    expect(JSON.parse(await stored(page)).activities).toEqual(result.activities);
  });
}

test("selector y errores accesibles, foco contenido y cierre por teclado", async ({ page, stack }) => {
  await prepare(page, stack);
  const selector = page.getByRole("combobox", { name: "Paciente", exact: true });
  await expect(selector).toBeFocused();
  await expect(selector).toHaveAttribute("aria-describedby", "activity-message");
  await directSubmit(page, "other");
  await expect(selector).toBeFocused();
  await expect(selector).toHaveAttribute("aria-invalid", "true");
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.querySelector(".activity-modal").contains(document.activeElement))).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)).not.toBe("none");
  }
  await page.getByRole("button", { name: "Cerrar", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Confirmar asignación" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".activity-modal")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ Asignar actividad", exact: true })).toBeFocused();
});

for (const width of [320, 768, 1280]) {
  test(`formulario vacío, rechazo y éxito sin desbordamiento a ${width}px`, async ({ page, stack }) => {
    await page.setViewportSize({ width, height: 800 });
    await prepare(page, stack, 0);
    await checkLayout(page);
    await page.keyboard.press("Escape");
    // Replace only this synthetic fixture, then reload to load the local domain state.
    await page.evaluate((professionalId) => {
      const data = JSON.parse(localStorage.getItem("decilo-mvp-v1"));
      data.relationships.push({ professionalId, patientId: "other", familyIds: [] });
      localStorage.setItem("decilo-mvp-v1", JSON.stringify(data));
    }, String(stack.users.profesional.id));
    await page.reload();
    await page.getByRole("button", { name: "Actividades", exact: true }).click();
    await page.getByRole("button", { name: "+ Asignar actividad", exact: true }).click();
    await fill(page); await directSubmit(page, "missing"); await checkLayout(page);
    await page.getByRole("combobox", { name: "Paciente", exact: true }).selectOption("other");
    await checkLayout(page);
    await page.getByRole("button", { name: "Confirmar asignación" }).click();
    await expect(page.locator(".toast")).toHaveText("Actividad asignada");
  });
}

async function checkLayout(page) {
  const modal = page.locator(".activity-modal .modal");
  const bounds = await modal.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  for (const control of await page.locator("#activity-form input, #activity-form select, #activity-form textarea, #activity-form button").all()) {
    const box = await control.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  }
}

test("formulario utilizable con ampliación CSS al 200 por ciento", async ({ page, stack }) => {
  await prepare(page, stack); await fill(page);
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await directSubmit(page, "missing"); await checkLayout(page);
  await page.getByRole("combobox", { name: "Paciente", exact: true }).selectOption("own-0");
  await page.getByRole("button", { name: "Confirmar asignación" }).click();
  await expect(page.locator(".toast")).toHaveText("Actividad asignada");
});
