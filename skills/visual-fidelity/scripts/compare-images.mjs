#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

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

function readPng(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Missing image file: ${filePath}`);
  }

  return PNG.sync.read(fs.readFileSync(filePath));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const args = parseArgs(process.argv);

const refPath = args.ref;
const actualPath = args.actual;
const outPath = args.out || ".visual-fidelity/runs/diff.png";
const jsonPath = args.json || ".visual-fidelity/runs/report.json";
const threshold = Number(args.threshold ?? 0.1);
const maxDiffRatio = Number(args.maxDiffRatio ?? 0.03);
const allowSizeMismatch = args.allowSizeMismatch === true || args.allowSizeMismatch === "true";
const referenceIntegrityPath = args.referenceIntegrity || args["reference-integrity"];
const allowSuspiciousSameOrigin = args.allowSuspiciousSameOrigin === true || args.allowSuspiciousSameOrigin === "true";

if (!refPath || !actualPath) {
  console.error(`
Usage:
  node compare-images.mjs --ref reference.png --actual actual.png --out diff.png --json report.json --maxDiffRatio 0.03

Options:
  --threshold 0.1
  --maxDiffRatio 0.03
  --allowSizeMismatch false
`);
  process.exit(2);
}

if (path.resolve(refPath) === path.resolve(actualPath) && !allowSuspiciousSameOrigin) {
  const report = {
    passed: false,
    reason: "same_origin_reference_and_actual",
    reference: refPath,
    actual: actualPath,
    message: "Reference and actual point to the same file. This is likely actual-vs-actual comparison fraud."
  };
  ensureDir(jsonPath);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

if (referenceIntegrityPath) {
  const integrity = JSON.parse(fs.readFileSync(referenceIntegrityPath, "utf8"));
  if (integrity.valid !== true) {
    const report = {
      passed: false,
      reason: "invalid_reference_integrity",
      referenceIntegrity: referenceIntegrityPath,
      blockers: integrity.blockers || []
    };
    ensureDir(jsonPath);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
}

const ref = readPng(refPath);
const actual = readPng(actualPath);

if ((ref.width !== actual.width || ref.height !== actual.height) && !allowSizeMismatch) {
  const report = {
    passed: false,
    reason: "dimension_mismatch",
    reference: { path: refPath, width: ref.width, height: ref.height },
    actual: { path: actualPath, width: actual.width, height: actual.height },
    message: "Reference and actual screenshots have different dimensions. Use the same viewport before pixel comparison."
  };

  ensureDir(jsonPath);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

const width = Math.min(ref.width, actual.width);
const height = Math.min(ref.height, actual.height);

const refComparable = ref.width === width && ref.height === height ? ref : new PNG({ width, height });
const actualComparable = actual.width === width && actual.height === height ? actual : new PNG({ width, height });

if (refComparable !== ref) {
  PNG.bitblt(ref, refComparable, 0, 0, width, height, 0, 0);
}

if (actualComparable !== actual) {
  PNG.bitblt(actual, actualComparable, 0, 0, width, height, 0, 0);
}

const diff = new PNG({ width, height });
const diffPixels = pixelmatch(refComparable.data, actualComparable.data, diff.data, width, height, { threshold });
const totalPixels = width * height;
const diffRatio = diffPixels / totalPixels;
const passed = diffRatio <= maxDiffRatio;

ensureDir(outPath);
ensureDir(jsonPath);

fs.writeFileSync(outPath, PNG.sync.write(diff));

const report = {
  passed,
  reference: { path: refPath, width: ref.width, height: ref.height },
  actual: { path: actualPath, width: actual.width, height: actual.height },
  compared: { width, height },
  threshold,
  maxDiffRatio,
  diffPixels,
  totalPixels,
  diffRatio,
  diffImage: outPath
};

if (diffRatio === 0 && !referenceIntegrityPath) {
  report.passed = false;
  report.reason = "perfect_diff_without_reference_integrity";
  report.message = "diffRatio is 0 without reference-integrity evidence; treat as suspicious.";
}

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (!report.passed) {
  process.exit(1);
}
