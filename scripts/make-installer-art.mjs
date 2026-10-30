// Generates installer artwork (NSIS, WiX, DMG) and the MSI licence from branding/logo.svg.
// Run `npm run installer-art` after changing the logo; the output is committed.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const out = new URL("src-tauri/installer/", root);
mkdirSync(out, { recursive: true });

const logo = readFileSync(new URL("branding/logo.svg", root));
const logoUri = `data:image/svg+xml;base64,${logo.toString("base64")}`;
const FONT = "Segoe UI, Helvetica Neue, Arial, sans-serif";

const render = (svg, width) =>
  new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" },
  }).render();

/** 24-bit BMP, which is what NSIS and WiX expect; alpha is flattened onto white. */
function toBmp({ width, height, pixels }) {
  const row = Math.ceil((width * 3) / 4) * 4;
  const buf = Buffer.alloc(54 + row * height);
  buf.write("BM");
  buf.writeUInt32LE(buf.length, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(row * height, 34);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const a = pixels[s + 3] / 255;
      const d = 54 + (height - 1 - y) * row + x * 3;
      for (let c = 0; c < 3; c++) {
        buf[d + c] = Math.round(pixels[s + 2 - c] * a + 255 * (1 - a));
      }
    }
  }
  return buf;
}

function bmp(name, w, h, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  const r = render(svg, w);
  writeFileSync(new URL(name, out), toBmp({ width: r.width, height: r.height, pixels: r.pixels }));
}

const brand = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#8B7CFF"/><stop offset="0.55" stop-color="#4F5BFF"/><stop offset="1" stop-color="#0A4DDB"/>
</linearGradient>`;
const mark = (x, y, s) => `<image href="${logoUri}" x="${x}" y="${y}" width="${s}" height="${s}"/>`;
const text = (x, y, size, weight, fill, str, extra = "") =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${str}</text>`;

// Tall brand panel used on the NSIS welcome/finish pages and the MSI dialogs.
const panel = (w, h) => `<defs>${brand}</defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${mark((w - 96) / 2, 56, 96)}
  ${text(w / 2, 188, 22, 700, "#fff", "Katevazo", 'text-anchor="middle"')}
  ${text(w / 2, 212, 11, 400, "#E6EAFF", "Fast, simple video downloads", 'text-anchor="middle"')}`;

// NSIS
bmp("nsis-sidebar.bmp", 164, 314, panel(164, 314));
// NSIS stretches this to its fixed 150x57 slot, so keep that size; logo at the left edge.
bmp("nsis-header.bmp", 150, 57, `<rect width="150" height="57" fill="#fff"/>${mark(10, 6, 45)}`);

// WiX (MSI)
bmp("wix-dialog.bmp", 493, 312, `<rect width="493" height="312" fill="#fff"/>${panel(164, 312)}`);
bmp(
  "wix-banner.bmp",
  493,
  58,
  `<rect width="493" height="58" fill="#fff"/>
   ${text(20, 26, 15, 700, "#1D1D1F", "Katevazo")}
   ${text(20, 44, 10.5, 400, "#6E6E73", "Fast, simple video downloads")}
   ${mark(432, 7, 44)}`,
);

// DMG window: 660x400, app on the left, Applications on the right, an arrow between.
const dmg = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="400" viewBox="0 0 660 400">
  <defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F7F8FF"/><stop offset="1" stop-color="#E4E8FA"/></linearGradient></defs>
  <rect width="660" height="400" fill="url(#b)"/>
  ${text(330, 64, 22, 600, "#1D1D1F", "Install Katevazo", 'text-anchor="middle"')}
  ${text(330, 90, 13, 400, "#6E6E73", "Drag Katevazo to the Applications folder", 'text-anchor="middle"')}
  <path d="M278 215h104m-18-16 18 16-18 16" fill="none" stroke="#4F5BFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
writeFileSync(new URL("dmg-background.png", out), render(dmg, 660).asPng());
writeFileSync(new URL("dmg-background@2x.png", out), render(dmg, 1320).asPng());

// MSI needs an RTF licence.
const lic = readFileSync(new URL("LICENSE", root), "utf8")
  .replace(/\\/g, "\\\\")
  .replace(/[{}]/g, (c) => `\\${c}`)
  .split(/\r?\n/)
  .join("\\par\n");
writeFileSync(new URL("license.rtf", out), `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Segoe UI;}}\\f0\\fs20\n${lic}\n}`);

console.log("Installer art written to src-tauri/installer/");
