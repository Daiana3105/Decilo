const { test, expect, restore, uiLogin, count, open } = require("./fixtures");

test("two tabs of A synchronize login and reads within five seconds while B stays isolated", async ({ page, context, stack }) => {
  const second = await context.newPage(), other = await context.newPage();
  await restore(page, stack, stack.users.paciente);
  await restore(other, stack, stack.users.familiar);
  await count(page, 0); await count(other, 0);
  await uiLogin(second, stack, stack.users.paciente);
  await count(page, 1); await count(second, 1); await count(other, 0);
  await open(page); await expect(page.locator(".notification-item")).toHaveCount(1);
  await count(page, 1); // Opening is not reading.
  await page.locator(".notification-item button").click();
  await count(page, 0); await count(second, 0);
  await expect(page.locator(".notification-badge")).toBeHidden();
  await expect(page.locator(".notification-item.is-read")).toHaveCount(1);
  await stack.login(stack.users.paciente); await count(second, 1);
  await page.locator("[data-all]").click(); await count(page, 0); await count(second, 0); await count(other, 0);
  expect(await stack.api.notifications.unreadCount(stack.users.familiar.id)).toMatchObject({ unreadCount: 0 });
});

test("anonymous and wrong role stay outside; all three roles can use an empty panel", async ({ page, stack }) => {
  await page.goto(stack.url); await expect(page.locator("#notification-bell")).toHaveCount(0);
  await uiLogin(page, stack, stack.users.paciente, "profesional");
  await expect(page.locator("#login-message")).toContainText("Esta cuenta pertenece");
  await expect(page.locator("#notification-bell")).toHaveCount(0);
  await expect.poll(async () => (await stack.api.notifications.unreadCount(stack.users.paciente.id)).unreadCount).toBe(1);
  for (const user of Object.values(stack.users)) {
    await uiLogin(page, stack, user); await expect(page.locator("#notification-bell")).toBeVisible();
    await open(page); await expect(page.locator(".notification-connection")).toHaveText("Conectado en tiempo real");
    await page.keyboard.press("Escape"); await page.locator("#logout-button").click();
    await expect(page.locator("#notification-dialog")).toHaveCount(0);
  }
});

test("pagination, safe text, keyboard focus and mobile layout", async ({ page, stack }) => {
  for (let i = 0; i < 25; i++) await stack.api.notifications.createLogin(stack.users.paciente.id);
  await stack.db.query("UPDATE notifications SET body = $1 WHERE user_id = $2", ['<img src=x onerror="window.injected=true">', stack.users.paciente.id]);
  await restore(page, stack, stack.users.paciente);
  await count(page, 25);
  await page.locator("#notification-bell").focus(); await page.keyboard.press("Enter");
  await expect(page.locator("[data-close]")).toBeFocused();
  await expect(page.locator(".notification-item")).toHaveCount(20);
  await expect(page.locator(".notification-item time").first()).toHaveAttribute("datetime", /T/);
  await expect(page.locator(".notification-body").first()).toContainText("<img");
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await expect(page.locator(".notification-list img")).toHaveCount(0);
  await page.locator(".notification-more").click(); await expect(page.locator(".notification-item")).toHaveCount(25);
  await expect(page.locator(".notification-more")).toBeHidden(); await count(page, 25);
  await page.setViewportSize({ width: 360, height: 640 });
  const bounds = await page.locator("#notification-dialog").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(640);
  await page.screenshot({ path: test.info().outputPath("panel-mobile.png") });
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.querySelector("dialog").contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape"); await expect(page.locator("#notification-bell")).toBeFocused();
  await page.reload(); await count(page, 25); // restore never creates another notification
});

test("loading, empty, failed refresh and retry preserve the true count", async ({ page, stack }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route("**/api/notifications?*", async (route) => { await gate; await route.continue(); });
  await restore(page, stack, stack.users.profesional); await open(page);
  await expect(page.locator(".notification-loading")).toBeVisible();
  await expect(page.locator(".notification-badge")).toBeHidden();
  release(); await count(page, 0); await expect(page.locator(".notification-empty")).toBeVisible();
  await page.unroute("**/api/notifications?*");
  await stack.login(stack.users.profesional); await count(page, 1);
  await page.route("**/api/notifications?*", (route) => route.fulfill({ status: 503, json: { error: "UNAVAILABLE" } }));
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.locator(".notification-error")).toBeVisible();
  await expect(page.locator(".notification-stale")).toBeVisible(); await count(page, 1);
  await page.unroute("**/api/notifications?*"); await page.locator("[data-retry]").click();
  await expect(page.locator(".notification-error")).toBeHidden(); await count(page, 1);
});

test("lost signals recover on visibility and reconnect, without duplicate rows", async ({ page, context, stack }) => {
  await restore(page, stack, stack.users.paciente); await count(page, 0); await open(page);
  await stack.api.notifications.createLogin(stack.users.paciente.id); // committed, deliberately no Socket.IO signal
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await count(page, 1);
  await context.setOffline(true);
  await expect(page.locator(".notification-connection")).not.toHaveText("Conectado en tiempo real");
  await stack.login(stack.users.paciente);
  await context.setOffline(false); await count(page, 2);
  await expect(page.locator(".notification-connection")).toHaveText("Conectado en tiempo real");
  const state = await stack.api.notifications.unreadCount(stack.users.paciente.id);
  for (let i = 0; i < 5; i++) stack.api.io.to(`user:${stack.users.paciente.id}`).emit("notifications:changed", state);
  await expect(page.locator(".notification-item")).toHaveCount(2); await count(page, 2);
});

test("socket updates preserve the communicator phrase and current focus", async ({ page, stack }) => {
  await restore(page, stack, stack.users.paciente, { board: true }); await count(page, 0);
  await page.locator('[data-picto="quiero"]').click();
  await page.locator('[data-picto="agua"]').focus();
  await stack.login(stack.users.paciente); await count(page, 1);
  await expect(page.locator(".phrase-token .word")).toHaveText("Quiero");
  await expect(page.locator('[data-picto="agua"]')).toBeFocused();
  for (let i = 0; i < 3; i++) await page.locator('[data-category="todas"]').click();
  await expect.poll(() => stack.api.io.sockets.sockets.size).toBe(1);
  await expect(page.locator("#notification-bell")).toHaveCount(1);
});

test("logout invalidates delayed snapshots before switching accounts", async ({ page, stack }) => {
  await uiLogin(page, stack, stack.users.paciente); await count(page, 1);
  let release, intercepted;
  const gate = new Promise((resolve) => { release = resolve; });
  const seen = new Promise((resolve) => { intercepted = resolve; });
  await page.route("**/api/notifications?*", async (route) => {
    const response = await route.fetch(); intercepted(); await gate;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.evaluate(() => window.dispatchEvent(new Event("online"))); await seen;
  await page.locator("#logout-button").click(); await expect(page.locator("#notification-bell")).toHaveCount(0);
  release(); await page.unrouteAll({ behavior: "wait" });
  await uiLogin(page, stack, stack.users.familiar); await count(page, 1); await open(page);
  const own = await stack.api.notifications.list(stack.users.familiar.id);
  await expect(page.locator(".notification-item")).toHaveCount(1);
  await expect(page.locator(".notification-item")).toHaveAttribute("data-notification-id", own.notifications[0].id);
  await expect.poll(() => stack.api.io.sockets.sockets.size).toBe(1);
});

test("expired JWT clears UI and socket and asks for login again", async ({ page, stack }) => {
  await restore(page, stack, stack.users.paciente, { token: stack.token(stack.users.paciente, "3s") });
  await count(page, 0); await open(page);
  await expect(page.locator("#login-form")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#notification-bell")).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("decilo-session-v1"))).toBeNull();
  await expect.poll(() => stack.api.io.sockets.sockets.size).toBe(0);
});

test("old HTTP response loses to newer socket revision during initial loading", async ({ page, stack }) => {
  let release, intercepted;
  const gate = new Promise((resolve) => { release = resolve; });
  const seen = new Promise((resolve) => { intercepted = resolve; });
  let first = true;
  await page.route("**/api/notifications?*", async (route) => {
    if (!first) return route.continue();
    first = false; const response = await route.fetch(); intercepted(); await gate; await route.fulfill({ response });
  });
  await restore(page, stack, stack.users.paciente); await seen; await open(page);
  await expect(page.locator(".notification-connection")).toHaveText("Conectado en tiempo real");
  const state = await stack.api.notifications.createLogin(stack.users.paciente.id);
  stack.api.io.to(`user:${stack.users.paciente.id}`).emit("notifications:changed", state);
  release(); await count(page, 1); await expect(page.locator(".notification-item")).toHaveCount(1);
});

test("new login after read-all commit dominates its delayed response", async ({ page, stack }) => {
  await stack.api.notifications.createLogin(stack.users.paciente.id);
  await restore(page, stack, stack.users.paciente); await count(page, 1); await open(page);
  let release, committed;
  const gate = new Promise((resolve) => { release = resolve; });
  const seen = new Promise((resolve) => { committed = resolve; });
  await page.route("**/api/notifications/read-all", async (route) => {
    const response = await route.fetch(); committed(); await gate; await route.fulfill({ response });
  });
  await page.locator("[data-all]").click(); await seen;
  await stack.login(stack.users.paciente);
  await expect.poll(async () => (await stack.api.notifications.unreadCount(stack.users.paciente.id)).unreadCount).toBe(1);
  release(); await expect(page.locator(".notification-item")).toHaveCount(2);
  await count(page, 1); await expect(page.locator(".notification-item.is-unread")).toHaveCount(1);
  await expect(page.locator(".notification-item.is-read")).toHaveCount(1);
});

test("REST loads and reads remain available when Socket.IO cannot connect", async ({ page, stack }) => {
  await page.route("**/socket.io/**", (route) => route.abort());
  await stack.api.notifications.createLogin(stack.users.paciente.id);
  await restore(page, stack, stack.users.paciente); await count(page, 1); await open(page);
  await expect(page.locator(".notification-item")).toHaveCount(1);
  await page.locator("[data-all]").click(); await count(page, 0);
});

for (const mode of ["persist", "emit"]) {
  test.describe(`secondary ${mode} failure`, () => {
    test.use({ secondaryMode: mode });
    test("login keeps a valid JWT and REST recovers only committed notices", async ({ page, stack }) => {
      const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login"));
      await uiLogin(page, stack, stack.users.paciente);
      const login = await response; expect(login.status()).toBe(200);
      const { token } = await login.json(); expect(token).toBeTruthy();
      const me = await fetch(`${stack.apiUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      expect(me.status).toBe(200);
      await expect.poll(() => stack.logs.length).toBe(1);
      await open(page); await count(page, mode === "emit" ? 1 : 0);
      await page.reload(); await count(page, mode === "emit" ? 1 : 0);
      expect(stack.logs[0]).toMatchObject({ code: "NOTIFICATION_FAILED", stage: mode });
      expect(JSON.stringify(stack.logs)).not.toContain("private-test-data");
      expect(JSON.stringify(stack.logs)).not.toContain(token);
    });
  });
}
