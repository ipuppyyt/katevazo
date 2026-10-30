// Fetches yt-dlp and ffmpeg for the host platform into src-tauri/binaries using the
// `<name>-<target-triple>[.exe]` naming that Tauri's `externalBin` requires.
// Run on each OS (CI does this per matrix entry): `npm run sidecars`.
import { execSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src-tauri", "binaries");
mkdirSync(outDir, { recursive: true });

const triple = execSync("rustc -vV").toString().match(/^host: (.+)$/m)?.[1];
if (!triple) throw new Error("Could not determine Rust host target triple");
const ext = process.platform === "win32" ? ".exe" : "";

const YTDLP_ASSET = {
  win32: "yt-dlp.exe",
  darwin: "yt-dlp_macos",
  linux: process.arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux",
}[process.platform];
if (!YTDLP_ASSET) throw new Error(`Unsupported platform: ${process.platform}`);

async function fetchYtDlp() {
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${YTDLP_ASSET}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`yt-dlp download failed: ${res.status} ${url}`);
  const dest = join(outDir, `yt-dlp-${triple}${ext}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  chmodSync(dest, 0o755);
  console.log("yt-dlp ->", dest);
}

function copyFfmpeg() {
  const src = createRequire(import.meta.url)("ffmpeg-static");
  if (!src) throw new Error("ffmpeg-static has no binary for this platform");
  const dest = join(outDir, `ffmpeg-${triple}${ext}`);
  copyFileSync(src, dest);
  chmodSync(dest, 0o755);
  console.log("ffmpeg ->", dest);
}

await fetchYtDlp();
copyFfmpeg();
