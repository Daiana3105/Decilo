const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const distDirectory = path.join(projectRoot, "dist");

function runFrontendBuild(apiPublicUrl) {
  execFileSync(process.execPath, ["build-frontend.js"], {
    cwd: projectRoot,
    env: { ...process.env, API_PUBLIC_URL: apiPublicUrl },
    stdio: "pipe"
  });
}

test("builds a public frontend bundle with safe API configuration", () => {
  const apiPublicUrl = "https://api.example.test/v1?source=render&quote=\"safe\"";
  runFrontendBuild(apiPublicUrl);

  const files = fs.readdirSync(distDirectory).sort();
  assert.deepEqual(files, ["app.js", "config.js", "index.html", "styles.css"]);

  const configSource = fs.readFileSync(path.join(distDirectory, "config.js"), "utf8");
  const indexSource = fs.readFileSync(path.join(distDirectory, "index.html"), "utf8");
  const appSource = fs.readFileSync(path.join(distDirectory, "app.js"), "utf8");

  assert.match(configSource, /window\.DECILO_CONFIG = Object\.freeze/);
  assert.ok(configSource.includes(JSON.stringify(apiPublicUrl)));
  assert.ok(indexSource.indexOf('src="config.js"') < indexSource.indexOf('src="app.js"'));
  assert.match(appSource, /window\.DECILO_CONFIG\?\.apiPublicUrl/);

  const publicSource = files.map((fileName) => fs.readFileSync(path.join(distDirectory, fileName), "utf8")).join("\n");
  for (const forbidden of ["DATABASE_URL", "JWT_SECRET", "DB_PASSWORD", "server.js", "auth.js"]) {
    assert.equal(publicSource.includes(forbidden), false, `No debe publicar ${forbidden}`);
  }
});
