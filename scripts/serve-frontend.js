// Serve only generated public files; never expose the project root or backend config.js.
const express = require("express");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
execFileSync(process.execPath, [path.join(__dirname, "../build-frontend.js")], {
  env: { ...process.env, API_PUBLIC_URL: process.env.API_PUBLIC_URL || "http://localhost:3000" }, stdio: "inherit"
});
const app = express();
app.use(express.static(path.join(__dirname, "../dist")));
const port = Number(process.env.FRONTEND_PORT || 8080);
app.listen(port, "127.0.0.1", () => console.log(`DECILO frontend: http://localhost:${port}`));
