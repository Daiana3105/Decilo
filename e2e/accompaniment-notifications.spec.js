const { test, expect, restore, count, open } = require('./fixtures');
test.use({ familyDemo: true });

test('family notices recover after disconnection without private codes, preserve keyboard/mobile and clear at logout', async ({ page, context, stack }) => {
  const u = stack.demoUsers;
  const call = async (user, path, body, method = 'POST') => {
    const response = await fetch(`${stack.apiUrl}/api/family-demo${path}`, {
      method, headers: { Authorization: `Bearer ${stack.token(user)}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    expect(response.ok, `HTTP ${response.status} ${method} ${path}`).toBeTruthy(); return response.status === 204 ? null : response.json();
  };
  await restore(page, stack, u.family);
  await count(page, 0);
  const invitation = await call(u.professional, `/patients/${u.patient1.id}/family-invitations`, { email: u.family.email });
  await count(page, 1);
  await open(page);
  await expect(page.locator('.notification-list')).toContainText('Solicitá el código');
  await expect(page.locator('.notification-list')).not.toContainText(invitation.code);
  await expect(page.locator('.notification-list')).not.toContainText(u.patient1.nombre);
  await page.keyboard.press('Escape'); await expect(page.locator('#notification-bell')).toBeFocused();
  await call(u.family, '/invitations/accept', { code: invitation.code });
  const activity = { title: 'PRIVATE-ACTIVITY', instruction: 'PRIVATE-INSTRUCTION', availability: 'Hogar', points: 15 };
  await context.setOffline(true);
  await call(u.professional, `/patients/${u.patient1.id}/activities`, activity);
  await call(u.professional, `/patients/${u.patient1.id}/activities`, { ...activity, availability: 'Consulta' });
  await context.setOffline(false); await count(page, 2);
  await page.setViewportSize({ width: 360, height: 740 });
  await open(page);
  await expect(page.locator('.notification-item')).toHaveCount(2);
  await expect(page.locator('.notification-list')).not.toContainText(activity.title);
  const bounds = await page.locator('#notification-dialog').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
  await page.keyboard.press('Escape');
  await call(u.professional, `/patients/${u.patient1.id}/family-links/${u.family.id}`, null, 'DELETE');
  await count(page, 3);
  await call(u.professional, `/patients/${u.patient1.id}/activities`, activity);
  await page.reload(); await count(page, 3);
  await page.locator('#logout-button').click();
  await expect(page.locator('#notification-bell')).toHaveCount(0);
  await restore(page, stack, stack.otherDemoUsers.family); await count(page, 0);
});
