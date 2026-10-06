const { test, expect, uiLogin } = require('./fixtures');
const { createFamilyDemoService } = require('../family-demo');
test.use({ familyDemo: true });
async function acceptBoth(stack) {
  const service = createFamilyDemoService(stack.db, stack.config.familyDemo), u = stack.demoUsers;
  for (const patient of [u.patient1, u.patient2]) {
    const invitation = await service.invite(u.professional, patient.id, { email: u.family.email });
    await service.accept(u.family, { code: invitation.code });
  }
  return service;
}
test('family demo manual invitation, single patient, home progress, completion and professional revocation',async({page,stack})=>{
  const u=stack.demoUsers;
  await uiLogin(page,stack,u.professional);
  await page.locator('.sidebar [data-view="pacientes"]').click();
  await page.getByLabel('Paciente activo').selectOption(String(u.patient1.id));
  await page.getByLabel('Correo del familiar ficticio').fill(u.family.email);
  await page.getByRole('button',{name:'Crear código de invitación'}).click();
  await expect(page.locator('#family-invitation')).toContainText('Código:');
  const code=(await page.locator('#family-invitation').textContent()).match(/[A-F0-9]{32}/)[0];
  expect(await page.evaluate(()=>JSON.stringify([localStorage,sessionStorage]))).not.toContain(code);
  await page.locator('#logout-button').click();
  await uiLogin(page,stack,u.family);
  await expect(page.locator('#family-status')).toContainText('No tenés pacientes');
  await page.getByLabel('Código de invitación').fill(code);
  await page.getByRole('button',{name:'Aceptar invitación'}).click();
  await expect(page.locator('#family-status')).toContainText('Paciente Uno');
  await page.getByRole('button',{name:'Actividades de hogar',exact:true}).click();
  await expect(page.locator('#family-activities')).toContainText('Hogar: Pedir agua');
  await expect(page.locator('#family-activities')).not.toContainText('Consulta');
  await page.getByRole('button',{name:'Completar actividad',exact:true}).click();
  await expect(page.locator('#family-activities')).toContainText('Completada');
  await page.locator('.sidebar [data-view="progreso"]').click();
  await expect(page.getByRole('region',{name:'Progreso del paciente'})).toContainText('1 de 1');
  const service=createFamilyDemoService(stack.db,stack.config.familyDemo);
  await service.revoke(u.professional,u.patient1.id,u.family.id);
  await page.getByRole('button',{name:'Actividades de hogar',exact:true}).click();
  await expect(page.locator('#family-status')).toContainText('No tenés pacientes');
  await expect(page.locator('#family-activities')).toHaveCount(0);
});
test('family selection, mobile keyboard and account cleanup ignore local relationships',async({page,stack})=>{
  await acceptBoth(stack); const u=stack.demoUsers;
  await uiLogin(page,stack,u.family);
  await expect(page.locator('#family-content')).toBeEmpty();
  for(const width of [320,768,1280]) {
    await page.setViewportSize({width,height:900});
    await page.locator('.sidebar [data-view="actividades"]').click();
    await page.getByLabel('Paciente activo').selectOption(String(u.patient1.id));
    await expect(page.locator('#family-activities')).toContainText('Pedir agua');
    await page.locator('.sidebar [data-view="progreso"]').click();
    await page.getByLabel('Comentario de Hogar').fill('Borrador para Uno');
    await page.getByLabel('Paciente activo').selectOption(String(u.patient2.id));
    await expect(page.getByLabel('Comentario de Hogar')).toHaveValue('');
    await page.locator('.sidebar [data-view="actividades"]').click();
    await expect(page.locator('#family-activities')).toContainText('Saludar');
    await expect(page.locator('#family-activities')).not.toContainText('Pedir agua');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.keyboard.press('Tab');
    await page.getByLabel('Paciente activo').focus();
    await expect(page.getByLabel('Paciente activo')).toBeFocused();
  }
  await page.evaluate(()=>{document.documentElement.style.zoom='2';});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>{document.documentElement.style.zoom='';});
  await page.locator('#logout-button').click();
  await uiLogin(page,stack,stack.otherDemoUsers.family);
  await expect(page.locator('#family-status')).toContainText('No tenés pacientes');
  await page.evaluate(({p,f})=>localStorage.setItem('decilo-mvp-v1',JSON.stringify({users:[{id:String(p),name:'Injected patient',role:'paciente'}],relationships:[{patientId:String(p),familyIds:[String(f)]}],activities:[],deliveries:[],comments:[],boards:[],badges:[]})),{p:u.patient1.id,f:stack.otherDemoUsers.family.id});
  await page.reload();
  await expect(page.locator('#family-status')).toContainText('No tenés pacientes');
  await expect(page.locator('#family-content')).not.toContainText('Injected patient');
});
test('family pending response cannot cross patient selection and revoked writes fail closed',async({page,stack})=>{
  const service=await acceptBoth(stack),u=stack.demoUsers;
  await uiLogin(page,stack,u.family);
  await page.locator('.sidebar [data-view="actividades"]').click();
  let release; const gate=new Promise(resolve=>{release=resolve;});
  await page.route(`**/api/family-demo/patients/${u.patient1.id}/activities`,async route=>{
    await gate; await route.fulfill({json:{activities:[{id:'999',title:'OLD PATIENT',instruction:'stale',points:1}],nextCursor:null}}).catch(()=>{});
  });
  await page.getByLabel('Paciente activo').selectOption(String(u.patient1.id));
  await expect(page.getByLabel('Paciente activo')).toBeVisible();
  await page.getByLabel('Paciente activo').selectOption(String(u.patient2.id));
  await expect(page.locator('#family-activities')).toContainText('Saludar'); release();
  await expect(page.locator('#family-content')).not.toContainText('OLD PATIENT');
  await service.revoke(u.professional,u.patient2.id,u.family.id);
  await page.getByRole('button',{name:'Completar actividad',exact:true}).click();
  await expect(page.locator('#family-status')).toContainText('ya no está disponible');
  await expect(page.locator('#family-activities')).toHaveCount(0);
  expect((await stack.db.query('SELECT count(*) FROM patient_deliveries')).rows[0].count).toBe('0');
});

for (const role of ['profesional', 'familiar']) {
  test(`family demo separates summary, activities and progress for ${role}`, async ({ page, stack }) => {
    const service = await acceptBoth(stack), u = stack.demoUsers;
    const own = (await service.list(u.family, u.patient1.id, {})).activities;
    await service.complete(u.patient1, u.patient1.id, own[0].id);
    // Empty second patient is real test data, not a mocked percentage.
    await stack.db.query('DELETE FROM patient_activities WHERE patient_id=$1', [u.patient2.id]);
    await page.setViewportSize({ width: role === 'familiar' ? 360 : 1280, height: 850 });
    await uiLogin(page, stack, role === 'familiar' ? u.family : u.professional);
    await page.getByLabel('Paciente activo').selectOption(String(u.patient1.id));
    await expect(page.getByRole('heading', { name: 'Resumen', exact: true })).toBeVisible();
    await expect(page.locator('.stats-grid .stat-value')).toHaveText(role === 'familiar' ? ['1', '1', '0', '15'] : ['2', '1', '1', '15']);
    await expect(page.locator('#family-activities')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.locator('#family-invite')).toHaveCount(0);
    await expect(page.locator('#storage-hint')).toContainText('Los tableros, las actividades y su progreso se guardan en PostgreSQL');
    await page.getByRole('button', { name: 'Ver actividades', exact: true }).click();
    await expect(page.getByLabel('Paciente activo')).toHaveValue(String(u.patient1.id));
    await expect(page.locator('#family-activities article')).toHaveCount(role === 'familiar' ? 1 : 2);
    await expect(page.locator('.stats-grid')).toHaveCount(0);
    await expect(page.locator('#family-comments')).toHaveCount(0);
    await expect(page.locator('#family-assign')).toHaveCount(role === 'familiar' ? 0 : 1);
    if (role === 'familiar') await expect(page.locator('#family-content')).not.toContainText('Consulta');
    await page.locator('.sidebar [data-view="progreso"]').click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', role === 'familiar' ? '100' : '50');
    await expect(page.getByLabel('Paciente activo')).toHaveValue(String(u.patient1.id));
    await expect(page.locator('#family-activities')).toHaveCount(0);
    await expect(page.locator('#family-comments')).toBeAttached();
    await page.getByLabel('Paciente activo').selectOption(String(u.patient2.id));
    await expect(page.getByRole('region', { name: 'Progreso del paciente' })).toContainText('Sin actividades');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await page.locator('.sidebar [data-view="inicio"]').click();
    await expect(page.locator('.stats-grid .stat-value')).toHaveText(['0', '0', '0', '0']);
    await page.getByRole('button', { name: 'Ver progreso', exact: true }).click();
    await expect(page.getByLabel('Paciente activo')).toHaveValue(String(u.patient2.id));
    await expect(page.getByRole('region', { name: 'Progreso del paciente' })).toContainText('Sin actividades');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
