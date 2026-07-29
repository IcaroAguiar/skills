#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key.startsWith("--")) {
      args[key.slice(2)] = value && !value.startsWith("--") ? value : true;
      if (value && !value.startsWith("--")) i++;
    }
  }
  return args;
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const args = parseArgs(process.argv);
const source = args.source;
const referenceId = args["reference-id"] || "reference";
const outDir = args.out || ".visual-fidelity/references/atlas";

if (!source || !fs.existsSync(source)) {
  console.error("Usage: node create-reference-atlas.mjs --source approved-reference.png --reference-id home-desktop");
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });
const ext = path.extname(source) || ".png";
const originalOut = path.join(outDir, `${referenceId}-original${ext}`);
if (!fs.existsSync(originalOut)) fs.copyFileSync(source, originalOut);

const metadata = {
  version: 1,
  referenceId,
  original: originalOut,
  originalHash: hashFile(originalOut),
  crops: [],
  note: "Static atlas scaffold. Add section/high-risk crops from approved source only; do not crop from current runtime."
};
const metadataPath = path.join(outDir, `${referenceId}.atlas.json`);
fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify({ metadata: path.resolve(metadataPath), original: path.resolve(originalOut) }, null, 2));

