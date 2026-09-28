const { test, expect, uiLogin, count, open } = require("./fixtures");

async function noPwaCache(page) {
  expect(await page.evaluate(async () => ({
    workers: (await navigator.serviceWorker.getRegistrations()).length,
    caches: await caches.keys(), controlled: !!navigator.serviceWorker.controller
  }))).toEqual({ workers: 0, caches: [], controlled: false });
}

test("manifest and HTML icons are real public resources with MIME and revalidation", async ({ page, stack }) => {
  await page.goto(stack.url);
  const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute("href");
  const response = await page.request.get(stack.url + manifestUrl);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  expect(response.headers()["cache-control"]).toBe("no-cache");
  const manifest = await response.json();
  expect(manifest.name).toBe("DECILO"); expect(manifest.display).toBe("standalone");
  const icons = [...manifest.icons.map((icon) => [icon.src, Number(icon.sizes.split("x")[0])]),
    [await page.locator('link[rel="icon"]').getAttribute("href"), 32],
    [await page.locator('link[rel="apple-touch-icon"]').getAttribute("href"), 180]];
  for (const [src, size] of icons) {
    const resource = await page.request.get(stack.url + src);
    expect(resource.status()).toBe(200); expect(resource.headers()["content-type"]).toBe("image/png");
    expect(resource.headers()["cache-control"]).toBe("no-cache");
    expect(await page.evaluate(async (src) => {
      const image = new Image(); image.src = src; await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }, src)).toEqual([size, size]);
  }
  for (const src of ["/icons/missing.png", "/missing.webmanifest"]) {
    expect((await page.request.get(stack.url + src)).status()).toBe(404);
  }
  const revalidated = await page.request.get(stack.url + manifestUrl, { headers: { "If-None-Match": response.headers().etag } });
  expect(revalidated.status()).toBe(304);
  await noPwaCache(page);
});

for (const [width, zoom] of [[320, 1], [768, 1], [1280, 1], [1280, 2]]) {
  test(`installation help works with keyboard at ${width}px and ${zoom * 100}% zoom`, async ({ page, stack }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(stack.url);
    await page.evaluate((zoom) => { document.documentElement.style.zoom = String(zoom); }, zoom);
    const summary = page.locator(".install-help summary"), details = page.locator(".install-help details");
    await expect(summary).toHaveAccessibleName("Cómo instalar DECILO");
    await summary.focus(); await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    expect(await summary.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
    await expect(details).toContainText("Safari en iPhone");
    await expect(details).toContainText("podés seguir usando DECILO aquí");
    await expect(details).toContainText("necesita conexión a Internet");
    expect(await details.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const box = await details.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`install-help-${width}-${zoom}.png`) });
    await page.keyboard.press("Space"); await expect(details).not.toHaveAttribute("open", "");
    await expect(page.locator("#login-form")).toBeVisible();
  });
}

test("registration, login, session restore and private notifications work without a PWA cache", async ({ page, stack }) => {
  const network = [];
  const sockets = [];
  page.on("response", (response) => {
    if (/\/api\/|\/socket\.io\//.test(response.url())) network.push(response);
  });
  page.on("websocket", (socket) => sockets.push(socket));
  await page.goto(stack.url); await noPwaCache(page);
  await page.getByRole("button", { name: "Crear una cuenta", exact: true }).click();
  await page.locator("#register-name").fill("Prueba PWA");
  await page.locator("#register-email").fill("pwa@example.test");
  await page.locator("#register-password").fill("synthetic-pwa-password");
  await page.locator("#register-confirm").fill("synthetic-pwa-password");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.locator("#notification-bell")).toBeVisible();
  await noPwaCache(page);
  await page.locator("#logout-button").click();
  await uiLogin(page, stack, stack.users.paciente); await count(page, 1);
  await page.reload(); await count(page, 1);
  await page.locator(".install-help summary").click();
  await expect(page.locator(".install-help details")).toHaveAttribute("open", "");
  await open(page); await page.locator("[data-all]").click(); await count(page, 0);
  await page.keyboard.press("Escape"); await noPwaCache(page);
  await expect.poll(() => sockets.length).toBeGreaterThan(0);
  const notices = network.filter((r) => r.url().includes("/api/notifications"));
  expect(notices.length).toBeGreaterThan(0);
  for (const response of notices) {
    expect(response.fromServiceWorker()).toBe(false);
    expect((await response.allHeaders())["cache-control"]).toContain("no-store");
  }
  expect(network.some((r) => r.url().includes("/socket.io/?EIO="))).toBe(true);
  expect(network.every((r) => !r.fromServiceWorker())).toBe(true);
  await page.locator("#logout-button").click(); await noPwaCache(page);
  expect(await page.evaluate(() => sessionStorage.getItem("decilo-session-v1"))).toBeNull();
  await uiLogin(page, stack, stack.users.familiar); await count(page, 1); await noPwaCache(page);
});
