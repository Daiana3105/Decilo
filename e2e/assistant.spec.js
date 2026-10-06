const { test, expect, uiLogin } = require('./fixtures');

for (const role of ['paciente', 'familiar']) {
  test(`simulated assistant: ${role}, accessible suggestions and session cleanup`, async ({ page, stack }) => {
    const outgoing = [];
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
      return route.continue();
    });
    page.on('request', req => { if (req.url().endsWith('/api/assistant/messages')) outgoing.push(req.postDataJSON()); });
    await uiLogin(page, stack, stack.users[role]);
    await page.getByRole('button', { name: 'Ayudante', exact: true }).click();
    await expect(page.getByText('Demostración: respuestas simuladas')).toBeVisible();
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('#assistant-message')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await page.locator('#assistant-send').boundingBox()).height).toBeGreaterThanOrEqual(48);
    }
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    const suggestion = page.getByRole('button', { name: 'Ayudarme a expresar una necesidad', exact: true });
    await suggestion.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#assistant-message')).toBeFocused();
    expect(outgoing).toHaveLength(0);
    const storage = await page.evaluate(() => [JSON.stringify(localStorage), JSON.stringify(sessionStorage)]);
    await page.locator('#assistant-send').click();
    await expect(page.locator('#assistant-reply')).toContainText('Necesito descansar');
    expect(outgoing).toEqual([{ message: 'Ayudarme a expresar una necesidad' }]);
    expect(await page.evaluate(() => [JSON.stringify(localStorage), JSON.stringify(sessionStorage)])).toEqual(storage);
    await page.locator('#logout-button').click();
    const next = role === 'paciente' ? 'familiar' : 'paciente';
    await uiLogin(page, stack, stack.users[next]);
    await page.getByRole('button', { name: 'Ayudante', exact: true }).click();
    await expect(page.locator('#assistant-message')).toHaveValue('');
    await expect(page.locator('#assistant-reply')).toBeEmpty();
    await expect(page.locator('body')).toHaveAttribute('data-identity-role', next);
  });
}

test('assistant loading, error, text-only reply, cancellation and logout during request', async ({ page, stack }) => {
  await uiLogin(page, stack, stack.users.paciente);
  await page.getByRole('button', { name: 'Ayudante', exact: true }).click();
  await page.route('**/api/assistant/messages', route => route.fulfill({ status: 503, json: { message: 'internal details must not appear' } }));
  await page.locator('#assistant-message').fill('Cómo usar DECILO');
  await page.locator('#assistant-send').click();
  await expect(page.locator('#assistant-status')).toContainText('No pudimos responder');
  await expect(page.locator('.assistant')).not.toContainText('internal details');
  await page.unroute('**/api/assistant/messages');
  await page.route('**/api/assistant/messages', route => route.fulfill({ json: { reply: '<img src=x onerror=alert(1)>' } }));
  await page.locator('#assistant-send').click();
  await expect(page.locator('#assistant-reply')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#assistant-reply img')).toHaveCount(0);
  await page.unroute('**/api/assistant/messages');
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  await page.route('**/api/assistant/messages', async route => { await gate; await route.fulfill({ json: { reply: 'Old session response' } }).catch(() => {}); });
  await page.locator('#assistant-send').click();
  await expect(page.locator('#assistant-status')).toContainText('Preparando');
  await expect(page.locator('#assistant-send')).toHaveAttribute('aria-disabled', 'true');
  await page.locator('#assistant-cancel').click();
  await expect(page.locator('#assistant-message')).toHaveValue('');
  await page.locator('#assistant-message').fill('Cómo usar DECILO');
  await page.locator('#assistant-send').click();
  await page.locator('#logout-button').click(); finish();
  await uiLogin(page, stack, stack.users.familiar);
  await page.getByRole('button', { name: 'Ayudante', exact: true }).click();
  await expect(page.locator('#assistant-reply')).toBeEmpty();
  await expect(page.locator('#assistant-message')).toHaveValue('');
});

test('professional has no assistant entry and API rejects the request', async ({ page, stack }) => {
  await uiLogin(page, stack, stack.users.profesional);
  await expect(page.locator('#logout-button')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ayudante', exact: true })).toHaveCount(0);
  const response = await page.request.post(`${stack.apiUrl}/api/assistant/messages`, {
    headers: { Authorization: `Bearer ${stack.token(stack.users.profesional)}` }, data: { message: 'Cómo usar DECILO' }
  });
  expect(response.status()).toBe(403);
});

test('Gemini demo needs fresh explicit consent and simulated mode stays separate', async ({ page, stack }) => {
  const sent = [];
  await page.route('**/api/assistant/capabilities', route => route.fulfill({ json: { geminiAvailable: true, consentVersion: 'google-demo-v1' } }));
  await page.route('**/api/assistant/messages', route => {
    sent.push(route.request().postDataJSON());
    return route.fulfill({ json: { reply: 'Abrí Mis actividades en el menú.' } });
  });
  await uiLogin(page, stack, stack.users.paciente);
  await page.getByRole('button', { name: 'Ayudante', exact: true }).click();
  await expect(page.locator('#assistant-mode option[value="gemini"]')).toBeEnabled();
  await page.locator('#assistant-mode').selectOption('gemini');
  await expect(page.locator('#assistant-google-notice')).toContainText('revisión humana');
  await expect(page.locator('#assistant-consent')).not.toBeChecked();
  await page.locator('#assistant-message').fill('Dónde busco la actividad');
  await page.locator('#assistant-send').click(); expect(sent).toHaveLength(0);
  await page.locator('#assistant-consent').check();
  await page.locator('#assistant-send').click();
  await expect(page.locator('#assistant-reply')).toContainText('Mis actividades');
  expect(sent).toEqual([{ message: 'Dónde busco la actividad', mode: 'gemini', consent: 'google-demo-v1' }]);
  await expect(page.locator('#assistant-consent')).not.toBeChecked();
  await page.locator('#assistant-mode').selectOption('simulated');
  await expect(page.getByText('Demostración: respuestas simuladas')).toBeVisible();
  await expect(page.locator('#assistant-google-notice')).toBeHidden();
  await page.locator('#assistant-send').click();
  await expect(page.locator('#assistant-status')).toHaveText('Respuesta simulada lista.');
  expect(sent[1]).toEqual({ message: 'Dónde busco la actividad' });
  await page.locator('#logout-button').click();
  await uiLogin(page, stack, stack.users.familiar);
  await page.getByRole('button', { name: 'Ayudante', exact: true }).click();
  await expect(page.locator('#assistant-mode')).toHaveValue('simulated');
  await expect(page.locator('#assistant-consent')).not.toBeChecked();
});
