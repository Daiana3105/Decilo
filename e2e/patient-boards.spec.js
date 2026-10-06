const { test, expect, uiLogin } = require('./fixtures');
test.use({ familyDemo: true });

test('professional assigns and edits a persisted board; independent patient sessions stay isolated', async ({ page, browser, stack }) => {
  const u = stack.demoUsers;
  await uiLogin(page, stack, u.professional);
  await page.locator('.sidebar [data-view="tableros"]').click();
  await page.getByRole('button', { name: '+ Nuevo tablero', exact: true }).click();
  const editor = page.getByRole('dialog');
  await expect(editor.getByRole('combobox', { name: 'Paciente', exact: true }).locator('option')).toHaveCount(3);
  await editor.getByRole('combobox', { name: 'Paciente', exact: true }).selectOption(String(u.patient1.id));
  await editor.getByLabel('Nombre del tablero').fill('Tablero Uno remoto');
  await editor.locator('input[value="quiero"]').check(); await editor.locator('input[value="agua"]').check();
  await editor.getByRole('button', { name: 'Guardar tablero' }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Tablero Uno remoto', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('decilo-mvp-v1') || '')).not.toContain('Tablero Uno remoto');
  const otherContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const patientPage = await otherContext.newPage();
  await patientPage.route(/https:\/\/fonts\./, route => route.abort());
  try {
    await uiLogin(patientPage, stack, u.patient1);
    await expect(patientPage.getByRole('heading', { name: 'Tablero de Tablero Uno remoto' })).toBeVisible();
    await patientPage.getByRole('button', { name: 'Agregar Agua. Vaso de agua', exact: true }).click();
    await expect(patientPage.locator('.phrase')).toContainText('Agua');
    await patientPage.reload();
    await expect(patientPage.getByRole('heading', { name: 'Tablero de Tablero Uno remoto' })).toBeVisible();
    await page.getByRole('button', { name: 'Editar tablero', exact: true }).click();
    await editor.getByLabel('Nombre del tablero').fill('Tablero Uno actualizado');
    await editor.getByRole('button', { name: 'Guardar tablero' }).click(); await expect(editor).toHaveCount(0);
    await patientPage.reload();
    await expect(patientPage.getByRole('heading', { name: 'Tablero de Tablero Uno actualizado' })).toBeVisible();
    await patientPage.locator('#logout-button').click();
    await uiLogin(patientPage, stack, u.patient2);
    await expect(patientPage.getByText('Todavía no tenés un tablero asignado.', { exact: true })).toBeVisible();
    await expect(patientPage.locator('.phrase')).not.toContainText('Agua');
    await expect(patientPage.locator('main')).not.toContainText('Tablero Uno');
    // Forged local board cannot replace the empty authorized backend response.
    await patientPage.evaluate(patient => {
      localStorage.setItem('decilo-mvp-v1', JSON.stringify({ users: [], relationships: [], boards: [{ id: 'fake', patientId: String(patient), name: 'LOCAL-FORGED', pictogramIds: ['agua'] }], activities: [], deliveries: [], badges: [], comments: [] }));
    }, u.patient2.id);
    await patientPage.reload();
    await expect(patientPage.getByText('Todavía no tenés un tablero asignado.', { exact: true })).toBeVisible();
    await expect(patientPage.locator('main')).not.toContainText('LOCAL-FORGED');
    expect(await patientPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await otherContext.close(); }
});

test('revoked assignment is rejected without local writes or success and errors never fall back to local boards', async ({ page, stack }) => {
  const u = stack.demoUsers;
  await uiLogin(page, stack, u.professional);
  await page.locator('.sidebar [data-view="tableros"]').click();
  await page.getByRole('button', { name: '+ Nuevo tablero', exact: true }).click();
  const editor = page.getByRole('dialog');
  await editor.getByRole('combobox', { name: 'Paciente', exact: true }).selectOption(String(u.patient1.id));
  await editor.locator('input[value="hola"]').check();
  await stack.db.query('UPDATE professional_patient_links SET active=FALSE WHERE professional_id=$1 AND patient_id=$2', [u.professional.id, u.patient1.id]);
  await editor.getByRole('button', { name: 'Guardar tablero' }).click();
  await expect(editor.locator('[role="alert"]')).toContainText('No se pudo guardar');
  expect((await stack.db.query('SELECT count(*) FROM patient_boards')).rows[0].count).toBe('0');
  await expect(page.locator('.toast')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(editor).toHaveCount(0);
  await page.route('**/api/family-demo/patients/*/boards', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await page.reload();
  await page.locator('.sidebar [data-view="tableros"]').click();
  await expect(page.getByRole('alert')).toContainText('No se muestran datos locales');
});

test('professional filters, orders and removes new pictograms; patient receives the saved order and voice controls', async ({ page, browser, stack }) => {
  const u = stack.demoUsers;
  await uiLogin(page, stack, u.professional);
  await page.locator('.sidebar [data-view="tableros"]').click();
  await page.getByRole('button', { name: '+ Nuevo tablero', exact: true }).click();
  const editor = page.getByRole('dialog');
  await editor.getByRole('combobox', { name: 'Paciente', exact: true }).selectOption(String(u.patient1.id));
  await editor.getByLabel('Nombre del tablero').fill('Lugares cotidianos');
  await editor.getByRole('button', { name: 'Lugares', exact: true }).click();
  await editor.locator('input[value="casa"]').check();
  await editor.locator('input[value="escuela"]').check();
  await editor.getByLabel('Buscar pictogramas').fill('hospital');
  await expect(editor.locator('input[value="hospital"]')).toBeVisible();
  await editor.getByLabel('Buscar pictogramas').fill('');
  await editor.getByRole('button', { name: 'Subir Escuela' }).click();
  await expect(editor.locator('#selected-pictograms > li').first()).toHaveAttribute('data-selected-id', 'escuela');
  await editor.locator('#selected-pictograms [data-selected-id="casa"]').getByRole('button', { name: 'Quitar' }).click();
  await editor.locator('input[value="casa"]').check();
  await editor.getByRole('button', { name: 'Escuchar Casa' }).click();
  await editor.getByRole('button', { name: 'Guardar tablero' }).click();
  await expect(editor).toHaveCount(0);

  const otherContext = await browser.newContext();
  const patientPage = await otherContext.newPage();
  try {
    await uiLogin(patientPage, stack, u.patient1);
    await expect(patientPage.getByRole('heading', { name: 'Tablero de Lugares cotidianos' })).toBeVisible();
    const boardItems = patientPage.locator('.picto-entry [data-picto]');
    await expect(boardItems).toHaveCount(2);
    expect(await boardItems.evaluateAll(nodes => nodes.map(node => node.dataset.picto))).toEqual(['escuela', 'casa']);
    await patientPage.getByRole('button', { name: 'Agregar Casa. Casa' }).click();
    await patientPage.getByRole('button', { name: 'Agregar Escuela. Edificio escolar' }).click();
    await patientPage.getByRole('button', { name: 'Mover Casa después' }).click();
    await expect(patientPage.locator('.phrase-item .phrase-token').first()).toContainText('Escuela');
    await patientPage.getByRole('region', { name: /Frase en construcción/ }).getByRole('button', { name: 'Escuchar Escuela' }).click();
    await patientPage.getByRole('button', { name: 'Quitar Casa' }).click();
    await expect(patientPage.locator('.phrase-item')).toHaveCount(1);
  } finally { await otherContext.close(); }
});
