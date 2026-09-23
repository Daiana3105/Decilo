const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1, retries: 0,
  timeout: 30000, expect: { timeout: 5000 }, forbidOnly: Boolean(process.env.CI),
  reporter: "list", use: { headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    viewport: { width: 1280, height: 800 } }
});
