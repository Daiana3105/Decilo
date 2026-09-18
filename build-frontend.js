const fs = require("node:fs");
const path = require("node:path");

const projectRoot = __dirname;
const distDirectory = path.join(projectRoot, "dist");
const publicFiles = ["index.html", "app.js", "styles.css"];
const apiPublicUrl = String(process.env.API_PUBLIC_URL || "").trim().replace(/\/$/, "");

fs.rmSync(distDirectory, { recursive: true, force: true });
fs.mkdirSync(distDirectory, { recursive: true });

for (const fileName of publicFiles) {
  fs.copyFileSync(path.join(projectRoot, fileName), path.join(distDirectory, fileName));
}

const configSource = `window.DECILO_CONFIG = Object.freeze({ apiPublicUrl: ${JSON.stringify(apiPublicUrl)} });\n`;
fs.writeFileSync(path.join(distDirectory, "config.js"), configSource, "utf8");

console.log(`Frontend generado en ${path.relative(projectRoot, distDirectory)}`);
