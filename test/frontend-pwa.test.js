const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { inflateSync } = require("node:zlib");
const test = require("node:test");
const os = require("node:os");
const express = require("express");
const { icons, renderIcon } = require("../scripts/generate-pwa-icons");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("PWA manifest defines stable root identity and public installation icons", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.name, "DECILO"); assert.equal(manifest.short_name, "DECILO");
  for (const field of ["id", "start_url", "scope"]) assert.equal(manifest[field], "/");
  assert.equal(manifest.display, "standalone"); assert.equal(manifest.lang, "es");
  assert.equal(manifest.theme_color, "#e06a42"); assert.equal(manifest.background_color, "#faf8f5");
  assert.equal(manifest.prefer_related_applications, false); assert.equal(manifest.orientation, undefined);
  assert.deepEqual(manifest.icons.map(({ sizes, purpose }) => [sizes, purpose]), [
    ["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]
  ]);
  for (const icon of manifest.icons) {
    assert.equal(icon.type, "image/png"); assert.match(icon.src, /^\/icons\/[a-z0-9-]+\.png$/);
    const png = fs.readFileSync(path.join(root, icon.src));
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
});

test("HTML links the manifest, favicon and Apple identity without PWA scripts", () => {
  const html = read("index.html");
  assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/);
  assert.match(html, /rel="icon" href="\/icons\/favicon-v1.png" type="image\/png" sizes="32x32"/);
  assert.match(html, /rel="apple-touch-icon" href="\/icons\/apple-touch-icon-v1.png" sizes="180x180"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="DECILO"/);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="theme-color" content="#e06a42"/);
  for (const source of [html, read("app.js"), read("notifications-client.js")]) {
    assert.doesNotMatch(source, /serviceWorker\s*\.\s*register|caches\s*\.\s*(open|match)|beforeinstallprompt/);
  }
});

for (const [name, size, opaque] of icons) {
  test(`PNG ${name} is reproducible RGBA with safe original artwork`, () => {
    const png = fs.readFileSync(path.join(root, "icons", name));
    assert.deepEqual(png, renderIcon(size, opaque));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[24], 8); assert.equal(png[25], 6);
    const chunks = [], compressed = [];
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset), type = png.toString("ascii", offset + 4, offset + 8);
      chunks.push(type);
      if (type === "IDAT") compressed.push(png.subarray(offset + 8, offset + 8 + length));
      offset += length + 12;
    }
    assert.deepEqual(chunks, ["IHDR", "IDAT", "IEND"]); // No embedded private metadata.
    const raw = inflateSync(Buffer.concat(compressed));
    assert.equal(raw.length, size * (1 + size * 4));
    let whitePixels = 0;
    for (let y = 0; y < size; y++) {
      assert.equal(raw[y * (size * 4 + 1)], 0);
      for (let x = 0; x < size; x++) {
        const offset = y * (size * 4 + 1) + 1 + 4 * x;
        if (opaque) assert.equal(raw[offset + 3], 255);
        if (raw[offset] === 255 && raw[offset + 1] === 255 && raw[offset + 2] === 255) {
          whitePixels++;
          assert.ok(Math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5) < 0.4);
        }
      }
    }
    assert.ok(whitePixels > size * size * 0.08);
    const center = Math.floor(size / 2) * (size * 4 + 1) + 1 + Math.floor(size / 2) * 4;
    assert.deepEqual([...raw.subarray(center, center + 4)], [224, 106, 66, 255]);
    assert.equal(raw[4], opaque ? 255 : 0);
  });
}

test("PWA Nginx policies revalidate only public resources and retain transport routes", () => {
  const nginx = read("nginx.conf");
  assert.match(nginx, /location = \/manifest\.webmanifest\s*\{\s*types \{ application\/manifest\+json webmanifest; \}\s*add_header Cache-Control "no-cache" always;\s*try_files \$uri =404;/);
  for (const route of ["location ^~ /icons/", "location = /index.html"]) {
    const block = nginx.slice(nginx.indexOf(route)).split("}")[0];
    assert.match(block, /Cache-Control "no-cache"/); assert.match(block, /try_files \$uri =404/);
  }
  for (const route of ["location /api/", "location /socket.io/"]) {
    const block = nginx.slice(nginx.indexOf(route)).split("}")[0];
    assert.match(block, /proxy_pass http:\/\/api:3000/);
    assert.doesNotMatch(block, /proxy_cache|Cache-Control|try_files/);
  }
  assert.match(read("Dockerfile.frontend"), /COPY icons\/\*\.png .\/icons\//);
});

test("a revalidated manifest discovers a versioned icon without changing app id", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "decilo-pwa-update-"));
  const app = express();
  app.use(express.static(directory, { setHeaders: (res) => res.setHeader("Cache-Control", "no-cache") }));
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const manifest = JSON.parse(read("manifest.webmanifest"));
  const file = path.join(directory, "manifest.webmanifest");
  fs.writeFileSync(file, JSON.stringify(manifest));
  const initial = await fetch(`${url}/manifest.webmanifest`);
  assert.equal(initial.status, 200); assert.equal(initial.headers.get("cache-control"), "no-cache");
  await initial.arrayBuffer();
  const etag = initial.headers.get("etag");
  // Explicit revalidation: Node fetch otherwise injects request no-cache with If-None-Match,
  // which tells Express to send a full 200 even when the ETag is unchanged.
  const unchanged = await fetch(`${url}/manifest.webmanifest`, { headers: { "If-None-Match": etag, "Cache-Control": "max-age=0" } });
  assert.equal(unchanged.status, 304);
  manifest.description = "Versión de prueba aislada";
  manifest.icons[0].src = "/icons/decilo-192-v2.png";
  fs.mkdirSync(path.join(directory, "icons"));
  const image = renderIcon(192, true);
  fs.writeFileSync(path.join(directory, "icons/decilo-192-v2.png"), image);
  fs.writeFileSync(file, JSON.stringify(manifest));
  const updated = await fetch(`${url}/manifest.webmanifest`, { headers: { "If-None-Match": etag, "Cache-Control": "max-age=0" } });
  assert.equal(updated.status, 200); assert.notEqual(updated.headers.get("etag"), etag);
  const next = await updated.json(); assert.equal(next.id, "/");
  const resource = await fetch(url + next.icons[0].src);
  assert.equal(resource.status, 200); assert.equal(resource.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await resource.arrayBuffer()), image);
});
