// Builds the extension zips for the browser stores into dist/.
//
// The two families disagree about the background script in Manifest V3: Chrome and Edge only
// accept `service_worker`, Firefox only accepts `scripts`. extension/manifest.json is the
// Chromium one; the Firefox one is derived from it here.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dir = join(root, "extension");
const out = join(root, "dist");

const chromium = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const firefox = {
  ...chromium,
  background: { scripts: [chromium.background.service_worker] },
  browser_specific_settings: {
    gecko: {
      id: "send-to-katevazo@katevazo.app",
      data_collection_permissions: { required: ["none"] },
    },
  },
};

/** A zip with forward-slash names and the files at the top level, as the stores expect. */
function zip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBytes = Buffer.from(name);
    const packed = deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(0x00210000, 10); // a fixed date, so the zip is reproducible
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    parts.push(local, nameBytes, packed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(0x00210000, 12);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);
    offset += local.length + nameBytes.length + packed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
}

const shared = readdirSync(dir)
  .filter((f) => f !== "manifest.json" && f !== "README.md")
  .map((name) => ({ name, data: readFileSync(join(dir, name)) }));

mkdirSync(out, { recursive: true });
for (const [label, manifest] of [["chromium", chromium], ["firefox", firefox]]) {
  const file = join(out, `katevazo-extension-${chromium.version}-${label}.zip`);
  const manifestFile = { name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2) + "\n") };
  writeFileSync(file, zip([manifestFile, ...shared]));
  console.log(file);
}
