const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { randomBytes } = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");
const { Client } = require("pg");

function binary(name) {
  const suffix = process.platform === "win32" ? ".exe" : "";
  if (process.env.TEST_PG_BIN) return path.join(process.env.TEST_PG_BIN, name + suffix);
  if (process.platform === "win32") {
    const root = "C:/Program Files/PostgreSQL";
    if (fs.existsSync(root)) {
      for (const version of fs.readdirSync(root).sort((a, b) => Number(b) - Number(a))) {
        const candidate = path.join(root, version, "bin", name + suffix);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  try {
    const bin = execFileSync("pg_config", ["--bindir"], { encoding: "utf8", windowsHide: true }).trim();
    return path.join(bin, name + suffix);
  } catch (_) { throw new Error("Se necesitan binarios PostgreSQL locales (initdb/pg_ctl). Configurá TEST_PG_BIN."); }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function main() {
  const initdb = binary("initdb");
  const pgCtl = binary("pg_ctl");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "decilo-tests-"));
  const data = path.join(root, "pgdata");
  const passwordFile = path.join(root, "password");
  const config = { host: "127.0.0.1", port: await freePort(), user: "decilo_test",
    password: randomBytes(32).toString("hex"), database: `decilo_test_${randomBytes(16).toString("hex")}`,
    nonce: randomBytes(16).toString("hex") };
  const cleanEnv = { ...process.env };
  for (const key of Object.keys(cleanEnv)) {
    if (/^(PG|DB_|TEST_DB_|DATABASE_URL$|DECILO_TEST_DATABASE$)/.test(key)) delete cleanEnv[key];
  }
  const options = { env: cleanEnv, stdio: "ignore", windowsHide: true, timeout: 60000 };
  let started = false;
  try {
    fs.writeFileSync(passwordFile, config.password, { mode: 0o600 });
    execFileSync(initdb, ["-D", data, "-U", config.user, "--pwfile", passwordFile, "--auth=scram-sha-256", "--encoding=UTF8", "--no-locale"], options);
    fs.unlinkSync(passwordFile);
    fs.appendFileSync(path.join(data, "postgresql.conf"), `\nlisten_addresses = '127.0.0.1'\nport = ${config.port}\nunix_socket_directories = ''\n`);
    execFileSync(pgCtl, ["-D", data, "-l", path.join(root, "postgres.log"), "-w", "start"], options);
    started = true;
    const admin = new Client({ ...config, database: "postgres" });
    await admin.connect();
    try { await admin.query(`CREATE DATABASE ${config.database}`); } finally { await admin.end(); }
    const client = new Client(config);
    await client.connect();
    try {
      await client.query("CREATE TABLE public.decilo_test_guard (nonce TEXT NOT NULL)");
      await client.query("INSERT INTO public.decilo_test_guard VALUES ($1)", [config.nonce]);
    } finally { await client.end(); }
    console.log("PostgreSQL efímero aislado: sin conexiones a bases externas.");
    const files = fs.readdirSync(path.join(__dirname, "..", "test")).filter((file) => file.endsWith(".test.js"))
      .map((file) => path.join("test", file));
    const child = spawn(process.execPath, ["--test", ...files], {
      cwd: path.join(__dirname, ".."), env: { ...cleanEnv, DECILO_TEST_DATABASE: JSON.stringify(config) },
      stdio: "inherit", windowsHide: true
    });
    process.exitCode = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code) => resolve(code ?? 1)); });
  } finally {
    // Only stop/delete the freshly generated cluster, never a configured external path.
    const relative = path.relative(os.tmpdir(), root);
    if (relative.startsWith("..") || path.isAbsolute(relative) || !/^decilo-tests-[^\\/]+$/.test(relative)) {
      throw new Error("Directorio temporal de pruebas inválido");
    }
    if (started || fs.existsSync(path.join(data, "postmaster.pid"))) {
      execFileSync(pgCtl, ["-D", data, "-m", "immediate", "-w", "stop"], options);
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch(() => {
  console.error("No se pudo completar la ejecución aislada. Verificá los binarios PostgreSQL y TEST_PG_BIN; no se usó la base de DECILO.");
  process.exitCode = 1;
});
