const { test: base, expect } = require("@playwright/test");
const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const bcrypt = require("bcryptjs");
const { isolatedDatabase } = require("../scripts/test-database");
const { createServer } = require("../server");
const { signToken, publicUser } = require("../auth");
const { createNotificationService } = require("../notifications");
const { createLoginNotifications } = require("../login-notifications");

const password = "browser-test-password";
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = (server) => `http://127.0.0.1:${server.address().port}`;
const test = base.extend({
  secondaryMode: ["normal", { option: true }],
  stack: [async ({ context, secondaryMode }, use) => {
    const fixture = await isolatedDatabase();
    const app = express();
    const frontend = http.createServer(app);
    let api;
    try {
      await listen(frontend);
      const config = { database: fixture.databaseConfig, jwtSecret: "isolated-browser-test-secret-at-least-32-characters",
        jwtExpiresIn: "1h", corsOrigins: [origin(frontend)] };
      const logs = [];
      const service = createNotificationService(fixture.database);
      const jobs = secondaryMode === "normal" ? undefined : createLoginNotifications({
        service: secondaryMode === "persist" ? { createLogin: async () => { throw new Error("private-test-data"); } } : service,
        publish: () => { throw new Error("private-test-data"); }, logger: (entry) => logs.push(entry)
      });
      api = await createServer({ config, database: fixture.database, loginNotifications: jobs });
      await listen(api.httpServer);
      execFileSync(process.execPath, ["build-frontend.js"], {
        cwd: path.join(__dirname, ".."), env: { ...process.env, API_PUBLIC_URL: origin(api.httpServer) }, stdio: "pipe"
      });
      app.use(express.static(path.join(__dirname, "../dist")));
      const hash = await bcrypt.hash(password, 4);
      const users = {};
      for (const role of ["paciente", "familiar", "profesional"]) {
        users[role] = (await fixture.database.query("INSERT INTO users (nombre,email,password_hash,rol) VALUES ($1,$2,$3,$1) RETURNING *", [role, `${role}@example.test`, hash])).rows[0];
      }
      await use({ api, logs, db: fixture.database, users, config, url: origin(frontend), apiUrl: origin(api.httpServer),
        token: (user, expiresIn = "1h") => signToken(user, { ...config, jwtExpiresIn: expiresIn }),
        async login(user) {
          const response = await fetch(`${origin(api.httpServer)}/api/auth/login`, { method: "POST",
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password }) });
          expect(response.status).toBe(200); return response.json();
        }
      });
    } finally {
      await context.close(); // Stop browser polling/reconnection before closing the test API.
      await api?.close(); await new Promise((resolve) => frontend.close(resolve)); await fixture.close();
    }
  }, { scope: "test" }],
  page: async ({ page }, use) => {
    // Existing optional Google font is not needed to test the self-contained application.
    await page.route(/https:\/\/fonts\./, (route) => route.abort());
    await use(page);
  }
});

async function restore(page, stack, user, { token = stack.token(user), board = false } = {}) {
  await page.addInitScript(({ user, token, board }) => {
    sessionStorage.setItem("decilo-session-v1", JSON.stringify({ token, userId: String(user.id), role: user.rol,
      user: { id: String(user.id), name: user.nombre, email: user.email, role: user.rol } }));
    if (board) localStorage.setItem("decilo-mvp-v1", JSON.stringify({ users: [], relationships: [],
      boards: [{ id: "test-board", patientId: String(user.id), name: "Prueba", pictogramIds: ["quiero", "agua"] }],
      activities: [], deliveries: [], comments: [], badges: [] }));
  }, { user: publicUser(user), token, board });
  await page.goto(stack.url);
  await expect(page.locator("#notification-bell")).toBeVisible();
}
async function uiLogin(page, stack, user, role = user.rol) {
  await page.goto(stack.url);
  await page.locator(`[data-role="${role}"]`).click();
  await page.locator("#login-email").fill(user.email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar a DECILO" }).click();
}
const count = (page, value) => expect(page.locator("#notification-bell")).toHaveAttribute("aria-label", `Notificaciones, ${value} sin leer`);
const open = async (page) => { await page.locator("#notification-bell").click(); await expect(page.locator("#notification-dialog")).toBeVisible(); };
module.exports = { test, expect, restore, uiLogin, count, open };
