const { test, expect, restore, count, open } = require('./fixtures');

for (const width of [320, 1280]) {
  test(`account and notifications remain usable for every role at ${width}px`, async ({ page, stack }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const role of ['profesional', 'paciente', 'familiar']) {
      // Seed one persisted notice so this presentation test does not depend on
      // the asynchronous login job, covered by the notification regressions.
      await stack.api.notifications.createLogin(stack.users[role].id);
      await restore(page, stack, stack.users[role]);
      await expect(page.getByRole('group', { name: 'Cuenta de usuario' })).toBeVisible();
      await expect(page.locator('.session-role')).toBeVisible();
      const bell = page.locator('#notification-bell');
      const logout = page.getByRole('button', { name: 'Cerrar sesión', exact: true });
      await count(page, 1);
      for (const button of [bell, logout]) {
        const box = await button.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        await page.keyboard.press('Tab');
        await button.focus();
        await expect(button).toBeFocused();
        await expect(button).toHaveCSS('outline-style', 'solid');
      }
      await open(page);
      const dialog = page.locator('#notification-dialog');
      const accent = await page.locator('.topbar').evaluate(el => getComputedStyle(el).backgroundColor);
      await expect(dialog).toHaveCSS('border-top-color', accent);
      await expect(dialog.locator('.is-unread')).toHaveCount(1);
      await expect(dialog.locator('.is-unread')).toHaveCSS('border-left-color', accent);
      const box = await dialog.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(800);
      await dialog.getByRole('button', { name: 'Marcar todas como leídas' }).click();
      await count(page, 0);
      await expect(dialog.locator('.is-unread')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(bell).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await logout.click();
      await expect(page.locator('#login-form')).toBeVisible();
      await expect(page.locator('.account-zone')).toHaveCount(0);
      await expect(page.locator('body')).not.toHaveAttribute('data-identity-role');
      await expect(page.locator('.brand-mark span')).toBeVisible();
    }
  });
}
