const fs = require("node:fs");
const path = require("node:path");

const projectRoot = __dirname;
const distDirectory = path.join(projectRoot, "dist");
const publicFiles = ["index.html", "app.js", "styles.css", "notifications-client.js"];
const apiPublicUrl = String(process.env.API_PUBLIC_URL || "").trim().replace(/\/$/, "");
if (apiPublicUrl) {
  const url = new URL(apiPublicUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("API_PUBLIC_URL debe ser un origen HTTP(S), sin credenciales, ruta ni parámetros.");
  }
}

fs.rmSync(distDirectory, { recursive: true, force: true });
fs.mkdirSync(distDirectory, { recursive: true });

for (const fileName of publicFiles) {
  fs.copyFileSync(path.join(projectRoot, fileName), path.join(distDirectory, fileName));
}

const configSource = `window.DECILO_CONFIG = Object.freeze({ apiPublicUrl: ${JSON.stringify(apiPublicUrl)} });\n`;
fs.writeFileSync(path.join(distDirectory, "config.js"), configSource, "utf8");

const clientDirectory = path.dirname(require.resolve("socket.io-client/package.json"));
fs.mkdirSync(path.join(distDirectory, "vendor"));
const client = fs.readFileSync(path.join(clientDirectory, "dist/socket.io.min.js"), "utf8")
  .replace(/^\/\/# sourceMappingURL=.*$/gm, "");
fs.writeFileSync(path.join(distDirectory, "vendor/socket.io.min.js"), client);
fs.copyFileSync(path.join(clientDirectory, "LICENSE"), path.join(distDirectory, "vendor/socket.io.LICENSE.txt"));

console.log(`Frontend generado en ${path.relative(projectRoot, distDirectory)}`);
