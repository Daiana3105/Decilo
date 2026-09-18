const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("frontend exposes the authenticated role flow", () => {
  assert.match(htmlSource, /<script src="app\.js"><\/script>/);
  assert.match(appSource, /id="register-form"/);
  assert.match(appSource, /\/api\/auth\/register/);
  assert.match(appSource, /\/api\/auth\/login/);
  assert.match(appSource, /\/api\/auth\/me/);
  assert.match(appSource, /window\.DECILO_CONFIG\?\.apiPublicUrl/);
  assert.match(appSource, /fetch\(`\$\{API_PUBLIC_URL\}\$\{path\}`/);
  assert.match(appSource, /sessionStorage\.setItem\(SESSION_KEY/);
  assert.match(appSource, /id="logout-button"/);
  assert.match(appSource, /navItems\(\)\.some\(\(item\) => item\.id === button\.dataset\.view\)/);
  assert.match(appSource, /roleLabels\[result\.user\.rol\]/);
});
