#!/usr/bin/env node

import fs from "node:fs";
import sharp from "sharp";

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

function quantize(value, step = 16) {
  return Math.round(value / step) * step;
}

function hex(r, g, b) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const args = parseArgs(process.argv);
const imagePath = args.image;

if (!imagePath || !fs.existsSync(imagePath)) {
  console.error("Usage: node extract-image-metrics.mjs --image path/to/image.png");
  process.exit(2);
}

const image = sharp(imagePath);
const metadata = await image.metadata();
const sampleWidth = 96;
const sampleHeight = Math.max(1, Math.round((metadata.height / metadata.width) * sampleWidth));

const raw = await image
  .resize(sampleWidth, sampleHeight, { fit: "fill" })
  .removeAlpha()
  .raw()
  .toBuffer();

const counts = new Map();

for (let i = 0; i < raw.length; i += 3) {
  const r = quantize(raw[i]);
  const g = quantize(raw[i + 1]);
  const b = quantize(raw[i + 2]);
  const key = hex(r, g, b);
  counts.set(key, (counts.get(key) || 0) + 1);
}

const commonColors = [...counts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .map(([color, count]) => ({
    color,
    approximateCoverage: Number((count / (sampleWidth * sampleHeight)).toFixed(4))
  }));

const result = {
  path: imagePath,
  width: metadata.width,
  height: metadata.height,
  aspectRatio: Number((metadata.width / metadata.height).toFixed(4)),
  format: metadata.format,
  commonColors
};

console.log(JSON.stringify(result, null, 2));
