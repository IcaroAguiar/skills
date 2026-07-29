#!/usr/bin/env node

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalize(text) {
  return String(text || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function center(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function boxDrift(referenceBox, actualBox) {
  return {
    dx: Math.round(actualBox.x - referenceBox.x),
    dy: Math.round(actualBox.y - referenceBox.y),
    dw: Math.round(actualBox.w - referenceBox.w),
    dh: Math.round(actualBox.h - referenceBox.h)
  };
}

function driftMagnitude(drift) {
  return Math.max(Math.abs(drift.dx), Math.abs(drift.dy), Math.abs(drift.dw), Math.abs(drift.dh));
}

function expectedFontPx(hint) {
  const value = String(hint || "").match(/(\d+(?:\.\d+)?)/)?.[1];
  return value ? Number(value) : null;
}

function actualFontPx(style) {
  const value = String(style?.fontSize || "").match(/(\d+(?:\.\d+)?)/)?.[1];
  return value ? Number(value) : null;
}

function matchDom(landmark, dom) {
  const pools = {
    text: dom.texts || [],
    button: dom.buttons || [],
    input: dom.controls || [],
    nav: dom.regions || [],
    image: dom.images || [],
    section: dom.regions || [],
    card: dom.regions || [],
    decorative: dom.regions || []
  };
  const candidates = pools[landmark.kind] || dom.texts || [];
  const expectedText = normalize(landmark.text);

  if (expectedText) {
    const exact = candidates.find((item) => normalize(item.text || item.alt || item.ariaLabel).includes(expectedText));
    if (exact) return exact;
    const anyText = [...(dom.texts || []), ...(dom.buttons || []), ...(dom.links || [])].find((item) =>
      normalize(item.text || item.ariaLabel).includes(expectedText),
    );
    if (anyText) return anyText;
  }

  if (landmark.approxBox) {
    const all = [...(dom.texts || []), ...(dom.buttons || []), ...(dom.links || []), ...(dom.images || []), ...(dom.regions || [])].filter((item) => item.box);
    const refCenter = center(landmark.approxBox);
    return all.sort((a, b) => {
      const ac = center(a.box);
      const bc = center(b.box);
      return Math.hypot(ac.x - refCenter.x, ac.y - refCenter.y) - Math.hypot(bc.x - refCenter.x, bc.y - refCenter.y);
    })[0];
  }

  return null;
}

const args = parseArgs(process.argv);
const irPath = args.ir || ".visual-fidelity/visual-ir.json";
const domPath = args.dom;
const ariaPath = args.aria;
const outPath = args.out || ".visual-fidelity/runs/ir-dom-report.json";

if (!domPath) {
  console.error("Usage: node compare-ir-to-dom.mjs --ir .visual-fidelity/visual-ir.json --dom run/dom-landmarks.json --out run/ir-dom-report.json");
  process.exit(2);
}

const ir = readJson(irPath);
const dom = readJson(domPath);
const ariaText = ariaPath && fs.existsSync(ariaPath) ? fs.readFileSync(ariaPath, "utf8") : "";
const landmarks = [];
let requiredLandmarks = 0;
let matchedRequiredLandmarks = 0;
let semanticFailures = 0;
let maxBoxDriftPx = 0;
let totalBoxDriftPx = 0;
let driftCount = 0;

for (const landmark of ir.landmarks || []) {
  if (landmark.required) requiredLandmarks++;
  const match = matchDom(landmark, dom);
  const referenceBox = landmark.approxBox || null;
  const actualBox = match?.box || null;
  const drift = referenceBox && actualBox ? boxDrift(referenceBox, actualBox) : null;
  const driftPx = drift ? driftMagnitude(drift) : null;
  if (driftPx !== null) {
    totalBoxDriftPx += driftPx;
    driftCount++;
    maxBoxDriftPx = Math.max(maxBoxDriftPx, driftPx);
  }

  const expectedText = normalize(landmark.text);
  const actualText = normalize(match?.text || match?.alt || match?.ariaLabel);
  const textMatches = !expectedText || actualText.includes(expectedText);
  const ariaMatches = !expectedText || !ariaText || normalize(ariaText).includes(expectedText);
  const expectedFont = expectedFontPx(landmark.styleHints?.fontSize);
  const actualFont = actualFontPx(match?.style);
  const fontDelta = expectedFont && actualFont ? Math.round(actualFont - expectedFont) : null;
  const styleDrift = {};
  if (fontDelta !== null && Math.abs(fontDelta) >= 3) {
    styleDrift.fontSize = { expected: landmark.styleHints.fontSize, actual: match?.style?.fontSize, severity: Math.abs(fontDelta) >= 8 ? "high" : "medium" };
  }

  let status = "matched";
  if (!match) status = landmark.required ? "missing_required" : "missing_optional";
  else if (!textMatches || !ariaMatches) status = landmark.required ? "semantic_failure" : "matched_with_semantic_drift";
  else if (driftPx !== null && driftPx >= 12) status = "matched_with_drift";
  else if (Object.keys(styleDrift).length) status = "matched_with_style_drift";

  if (landmark.required && match && status !== "missing_required") matchedRequiredLandmarks++;
  if (status === "semantic_failure") semanticFailures++;

  landmarks.push({
    id: landmark.id,
    status,
    required: Boolean(landmark.required),
    referenceBox,
    actualBox,
    boxDrift: drift,
    styleDrift,
    textDrift: expectedText && !textMatches ? { expected: landmark.text, actual: match?.text || null } : null,
    semanticFailure: status === "semantic_failure",
    recommendedFix:
      status === "missing_required"
        ? `Restore required landmark ${landmark.id}.`
        : status === "matched_with_drift"
          ? `Adjust ${landmark.id} layout/box alignment.`
          : status === "matched_with_style_drift"
            ? `Adjust ${landmark.id} typography/style.`
            : status === "semantic_failure"
              ? `Restore semantic text/accessibility for ${landmark.id}.`
              : null
  });
}

const missingRequiredLandmarks = landmarks.filter((item) => item.status === "missing_required").length;
const blockingFailures = landmarks.filter((item) => ["missing_required", "semantic_failure"].includes(item.status)).length;
const report = {
  version: 1,
  runId: path.basename(path.dirname(outPath)) || new Date().toISOString(),
  summary: {
    requiredLandmarks,
    matchedRequiredLandmarks,
    missingRequiredLandmarks,
    blockingFailures,
    meanBoxDriftPx: driftCount ? Number((totalBoxDriftPx / driftCount).toFixed(2)) : 0,
    maxBoxDriftPx,
    semanticFailures
  },
  landmarks
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
