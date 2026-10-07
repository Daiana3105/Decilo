const { test, expect, uiLogin } = require('./fixtures');
test.use({ familyDemo: true });
test('navigation starts short entrances and respects the browser motion preference', async ({ page, stack }) => {
  await page.addInitScript(() => {
    window.demoMotionEvents = [];
    document.addEventListener('animationstart', event => window.demoMotionEvents.push(event.animationName));
  });
  await uiLogin(page, stack, stack.demoUsers.professional);
  const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  console.log(`Browser prefers-reduced-motion: ${reduced}`);
  for (const view of ['actividades', 'inicio']) {
    await page.evaluate(() => { window.demoMotionEvents = []; });
    await page.locator(`.sidebar [data-view="${view}"]`).click();
    await expect(page.locator('.content > .panel')).toHaveCSS('animation-name', reduced ? 'none' : 'demo-card-enter');
    if (!reduced) await expect.poll(() => page.evaluate(() => window.demoMotionEvents.includes('demo-card-enter'))).toBe(true);
  }
  await page.locator('.sidebar [data-view="progreso"]').click();
  await page.getByLabel('Paciente activo').selectOption(String(stack.demoUsers.patient1.id));
  const bar = page.getByRole('progressbar');
  await expect(bar).toBeVisible();
  const actual = await bar.getAttribute('aria-valuenow');
  expect(await bar.locator('span').evaluate(el => el.style.width)).toBe(`${actual}%`);
  await expect(bar.locator('span')).toHaveCSS('animation-name', reduced ? 'none' : 'demo-progress-enter');
  // Only enable reduction for this additional assertion; never override it to no-preference.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.sidebar [data-view="inicio"]').click();
  await expect(page.locator('.content > .panel')).toHaveCSS('animation-name', 'none');
  await page.locator('.sidebar [data-view="progreso"]').click();
  await expect(page.getByRole('progressbar').locator('span')).toHaveCSS('animation-name', 'none');
});
