const { test, expect, uiLogin } = require('./fixtures');

function contrast(a, b) {
  const luminance = (rgb) => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
    v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

for (const width of [320, 768, 1280]) {
  test(`role identity, contrast and account changes at ${width}px`, async ({ page, stack }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [role, label, color] of [
      ['profesional', 'Profesional', 'rgb(29, 78, 216)'],
      ['paciente', 'Paciente', 'rgb(22, 101, 52)'],
      ['familiar', 'Familiar', 'rgb(107, 33, 168)']
    ]) {
      await uiLogin(page, stack, stack.users[role]);
      await expect(page.locator('body')).toHaveAttribute('data-identity-role', role);
      await expect(page.locator('.session-role')).toBeVisible();
      await expect(page.locator('.session-role')).toContainText(label);
      await expect(page.locator('.session-role [aria-hidden="true"]')).toBeVisible();
      await expect(page.locator('.topbar')).toHaveCSS('background-color', color);
      const active = page.locator('.nav-button[aria-current="page"]');
      await expect(active).toHaveCSS('background-color', color);
      await active.hover();
      await expect(active).toHaveCSS('background-color', color);
      expect(contrast('rgb(255, 255, 255)', color)).toBeGreaterThanOrEqual(4.5);
      const heading = page.locator('h1, h2').first();
      await expect(heading).toHaveCSS('color', color);
      const surface = await page.locator('.sidebar').evaluate(el => getComputedStyle(el).backgroundColor);
      expect(contrast(color, surface)).toBeGreaterThanOrEqual(4.5);
      await page.keyboard.press('Tab');
      await active.focus(); await expect(active).toBeFocused();
      await expect(active).toHaveCSS('outline-style', 'solid');
      await page.keyboard.press('Enter');
      await expect(page.locator('.session-role')).toContainText(label);
      if (role !== 'profesional') await expect(page.locator('[data-action="new-patient"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.reload();
      await expect(page.locator('body')).toHaveAttribute('data-identity-role', role);
      await page.emulateMedia({ forcedColors: 'active' });
      await expect(page.locator('.session-role')).toBeVisible();
      await page.keyboard.press('Tab');
      await page.locator('#logout-button').focus();
      await expect(page.locator('#logout-button')).toHaveCSS('outline-style', 'solid');
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
      await expect(page.locator('.session-role')).toBeVisible();
      // 320 CSS px remains the supported minimum at browser zoom.
      if (width >= 768) {
        const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(el => el.className) }));
        expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(width);
      }
      await page.evaluate(() => { document.documentElement.style.zoom = ''; });
      await page.locator('#logout-button').click();
      await expect(page.locator('body')).not.toHaveAttribute('data-identity-role');
      await expect(page.locator('.session-role')).toHaveCount(0);
      await expect(page.locator('#login-form')).toBeVisible();
      const selection = page.locator(`.role-button[data-role="${role}"]`);
      await selection.click();
      await expect(selection).toHaveAttribute('aria-pressed', 'true');
      await expect(selection.locator('.role-icon')).toHaveCSS('background-color', color);
      const selectedSurface = await selection.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(contrast(color, selectedSurface)).toBeGreaterThanOrEqual(4.5);
      await expect(page.locator('body')).not.toHaveAttribute('data-identity-role');
    }
  });
}

test('a selected role cannot override authenticated identity', async ({ page, stack }) => {
  await uiLogin(page, stack, stack.users.paciente, 'profesional');
  await expect(page.locator('#login-form')).toBeVisible();
  await expect(page.locator('body')).not.toHaveAttribute('data-identity-role');
  await uiLogin(page, stack, stack.users.paciente);
  await expect(page.locator('body')).toHaveAttribute('data-identity-role', 'paciente');
  await page.evaluate(() => { document.body.dataset.identityRole = 'profesional'; });
  await expect(page.locator('[data-action="new-patient"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-identity-role', 'paciente');
});
