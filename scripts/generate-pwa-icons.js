// Original geometric DECILO mark. No fonts, network, runtime dependency or metadata.
// Run with Node 22: node scripts/generate-pwa-icons.js [--check]
const fs = require("node:fs");
const path = require("node:path");
const { deflateSync, constants } = require("node:zlib");

const icons = [
  ["favicon-v1.png", 32, false],
  ["apple-touch-icon-v1.png", 180, true],
  ["decilo-192-v1.png", 192, false],
  ["decilo-512-v1.png", 512, false],
  ["decilo-maskable-512-v1.png", 512, true]
];

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function renderIcon(size, opaque) {
  const raw = Buffer.alloc(size * (size * 4 + 1)); // RGBA, PNG filter 0 on each row.
  const samples = 4;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let covered = 0, white = 0;
    for (let sy = 0; sy < samples; sy++) for (let sx = 0; sx < samples; sx++) {
      const u = (x + (sx + 0.5) / samples) / size;
      const v = (y + (sy + 0.5) / samples) / size;
      // Rounded square for any/favicon; Apple and maskable let the OS apply its mask.
      const dx = Math.max(0.22 - u, 0, u - 0.78);
      const dy = Math.max(0.22 - v, 0, v - 0.78);
      if (!opaque && dx * dx + dy * dy > 0.22 ** 2) continue;
      covered++;
      // D: straight stem and elliptical bowl, centered within the safe circle.
      const outer = u >= 0.28 && (u <= 0.47 ? v >= 0.23 && v <= 0.77 :
        ((u - 0.47) / 0.25) ** 2 + ((v - 0.5) / 0.27) ** 2 <= 1);
      const inner = u >= 0.39 && (u <= 0.47 ? v > 0.34 && v < 0.66 :
        ((u - 0.47) / 0.14) ** 2 + ((v - 0.5) / 0.16) ** 2 < 1);
      if (outer && !inner) white++;
    }
    const offset = y * (size * 4 + 1) + 1 + x * 4;
    const fraction = covered ? white / covered : 0;
    [224, 106, 66].forEach((color, channel) => { raw[offset + channel] = Math.round(color + (255 - color) * fraction); });
    raw[offset + 3] = Math.round(255 * covered / (samples * samples));
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9, strategy: constants.Z_FIXED })), chunk("IEND", Buffer.alloc(0))]);
}

if (require.main === module) {
  const directory = path.join(__dirname, "../icons");
  const check = process.argv.includes("--check");
  if (!check) fs.mkdirSync(directory, { recursive: true });
  for (const [name, size, opaque] of icons) {
    const bytes = renderIcon(size, opaque), file = path.join(directory, name);
    if (check) {
      if (!fs.existsSync(file) || !fs.readFileSync(file).equals(bytes)) throw new Error(`Regenerar ${name}`);
    } else fs.writeFileSync(file, bytes);
    console.log(`${check ? "Verificado" : "Generado"}: ${name} (${size}x${size} PNG)`);
  }
}
module.exports = { icons, renderIcon };
