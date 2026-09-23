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
  const apiPublicUrl = "https://api.example.test";
  runFrontendBuild(apiPublicUrl);

  const files = fs.readdirSync(distDirectory, { recursive: true }).filter((file) => fs.statSync(path.join(distDirectory, file)).isFile()).map((file) => file.replaceAll("\\", "/")).sort();
  assert.deepEqual(files, ["app.js", "config.js", "index.html", "notifications-client.js", "styles.css", "vendor/socket.io.LICENSE.txt", "vendor/socket.io.min.js"]);

  const configSource = fs.readFileSync(path.join(distDirectory, "config.js"), "utf8");
  const indexSource = fs.readFileSync(path.join(distDirectory, "index.html"), "utf8");
  const appSource = fs.readFileSync(path.join(distDirectory, "app.js"), "utf8");

  assert.match(configSource, /window\.DECILO_CONFIG = Object\.freeze/);
  assert.ok(configSource.includes(JSON.stringify(apiPublicUrl)));
  assert.ok(indexSource.indexOf('src="config.js"') < indexSource.indexOf('src="app.js"'));
  assert.ok(indexSource.indexOf('src="vendor/socket.io.min.js"') < indexSource.indexOf('src="notifications-client.js"'));
  assert.ok(indexSource.indexOf('src="notifications-client.js"') < indexSource.indexOf('src="app.js"'));
  assert.doesNotMatch(indexSource, /<script[^>]+src="https?:/);
  assert.match(appSource, /window\.DECILO_CONFIG\?\.apiPublicUrl/);

  const publicSource = files.map((fileName) => fs.readFileSync(path.join(distDirectory, fileName), "utf8")).join("\n");
  for (const forbidden of ["DATABASE_URL", "JWT_SECRET", "DB_PASSWORD", "server.js", "auth.js"]) {
    assert.equal(publicSource.includes(forbidden), false, `No debe publicar ${forbidden}`);
  }
});

test("same-origin development build and public origin validation", () => {
  runFrontendBuild("");
  assert.match(fs.readFileSync(path.join(distDirectory, "config.js"), "utf8"), /apiPublicUrl: ""/);
  for (const invalid of ["https://user:secret@example.test", "https://api.example.test/path", "https://api.example.test?secret=value", "file:///etc"]) {
    assert.throws(() => runFrontendBuild(invalid));
  }
});

test("Nginx serves missing assets as 404 and proxies both Socket.IO transports", () => {
  const config = fs.readFileSync(path.join(projectRoot, "nginx.conf"), "utf8");
  assert.match(config, /location \/socket\.io\/\s*\{[^}]*proxy_pass http:\/\/api:3000;[^}]*proxy_http_version 1\.1;[^}]*proxy_set_header Upgrade \$http_upgrade;[^}]*proxy_set_header Connection \$connection_upgrade;[^}]*proxy_read_timeout 75s;/s);
  assert.match(config, /location ~\*[^\{]+\{\s*try_files \$uri =404;/);
  assert.match(config, /location \/api\//);
  const dockerfile = fs.readFileSync(path.join(projectRoot, "Dockerfile.frontend"), "utf8");
  assert.match(dockerfile, /RUN npm ci/);
  assert.match(dockerfile, /COPY --from=build \/app\/dist\//);
});
