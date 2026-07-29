#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const skillRoot = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-hardening-"));
const vf = path.join(tmp, ".visual-fidelity");
const runs = path.join(vf, "runs", "bench");
fs.mkdirSync(path.join(vf, "references"), { recursive: true });
fs.mkdirSync(path.join(vf, "contracts"), { recursive: true });
fs.mkdirSync(path.join(vf, "analysis"), { recursive: true });
fs.mkdirSync(path.join(vf, "packets"), { recursive: true });
fs.mkdirSync(runs, { recursive: true });

function parseJsonOutput(name, output) {
  try {
    return JSON.parse(output);
  } catch (error) {
    return {
      parseError: `${name}: expected JSON output: ${error.message}`,
      rawOutput: output
    };
  }
}

function blockerText(parsed) {
  return [
    ...(parsed.blockers || []),
    ...(parsed.blockingReasons || []),
    ...(parsed.failures || [])
  ].join("\n");
}

function runScript(name, args, options = {}) {
  const expectExit = options.expectExit ?? 0;
  try {
    const output = execFileSync("node", [path.join(skillRoot, "scripts", name), ...args], { cwd: tmp, encoding: "utf8" });
    const trimmed = output.trim();
    const parsed = parseJsonOutput(name, trimmed);
    const expectedBlockers = options.expectedBlockers || [];
    const blockers = blockerText(parsed);
    const passed = expectExit === 0
      && !parsed.parseError
      && expectedBlockers.every((blocker) => blockers.includes(blocker));
    return { name, passed, exitCode: 0, expectedExit: expectExit, expectedBlockers, output: trimmed };
  } catch (error) {
    const exitCode = typeof error.status === "number" ? error.status : 1;
    const trimmed = String(error.stdout || error.stderr || error.message).trim();
    const parsed = parseJsonOutput(name, trimmed);
    const expectedBlockers = options.expectedBlockers || [];
    const blockers = blockerText(parsed);
    const passed = expectExit !== 0
      && exitCode !== 0
      && !parsed.parseError
      && expectedBlockers.every((blocker) => blockers.includes(blocker));
    return { name, passed, exitCode, expectedExit: expectExit, expectedBlockers, output: trimmed };
  }
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const results = [];

function fixturePath(...segments) {
  const fullPath = path.resolve(tmp, ...segments);
  const relativePath = path.relative(tmp, fullPath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`fixture path escaped benchmark root: ${segments.join("/")}`);
  }
  return fullPath;
}

function writeText(relativePath, content) {
  const fullPath = fixturePath(relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

function writeJson(relativePath, value) {
  return writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

results.push(runScript("validate-skill-package.mjs", [skillRoot]));

results.push(runScript("validate-reference-integrity.mjs", ["--manifest", path.join(vf, "references", "manifest.json"), "--out", path.join(vf, "contracts", "reference-integrity.json")], {
  expectExit: 1,
  expectedBlockers: ["reference manifest missing", "reference manifest has no references"]
}));

writeJson(".visual-fidelity/analysis/visual-ir.v2.json", { version: 2, sourceContext: {}, viewport: {}, sectionTree: [], layoutGeometry: [], typographyInventory: [], colorInventory: [], spacingInventory: [], imageInventory: [], ctaInventory: [], forbiddenOmissions: [] });
writeJson(".visual-fidelity/analysis/visual-checklist.json", { version: 1, items: [{ id: "ornament", status: "omitted" }] });
writeJson(".visual-fidelity/contracts/landmark-contract.json", { criticalLandmarks: ["hero-title"] });
results.push(runScript("validate-visual-ir-completeness.mjs", ["--ir", path.join(vf, "analysis", "visual-ir.v2.json"), "--checklist", path.join(vf, "analysis", "visual-checklist.json"), "--contract", path.join(vf, "contracts", "landmark-contract.json")], {
  expectExit: 1,
  expectedBlockers: ["checklist unresolved: ornament", "critical landmark not represented: hero-title"]
}));

writeJson(".visual-fidelity/packets/executor-task-1.json", { taskId: "bad", objective: "bad" });
results.push(runScript("validate-executor-packet.mjs", [path.join(vf, "packets", "executor-task-1.json")], {
  expectExit: 1,
  expectedBlockers: ["packet missing targetFiles", "packet missing doneWhen"]
}));

writeJson(".visual-fidelity/packets/executor-task-open-reference.json", {
  taskId: "bad-open-reference",
  objective: "bad",
  targetFiles: ["src/App.tsx"],
  forbiddenChanges: [],
  targetLandmarks: ["hero-title"],
  expectedVisualChange: "bad",
  doneWhen: "bad",
  validationCommand: "npm test",
  maxFiles: 1,
  maxLinesChanged: 20,
  escalateIf: ["needs image judgment"],
  includesOpenReferenceImage: true
});
results.push(runScript("validate-executor-packet.mjs", [path.join(vf, "packets", "executor-task-open-reference.json")], {
  expectExit: 1,
  expectedBlockers: ["packet includes open reference image"]
}));

writeJson(".visual-fidelity/runs/bench/run.json", { runId: "bench", actual: null, domLandmarks: null, reference: null });
writeJson(".visual-fidelity/runs/bench/ir-dom-report.json", { summary: { missingRequiredLandmarks: 1, semanticFailures: 0 } });
results.push(runScript("validate-closeout-gate.mjs", ["--run", path.join(runs, "run.json"), "--ir-dom-report", path.join(runs, "ir-dom-report.json"), "--out", path.join(runs, "closeout-gate.json")], {
  expectExit: 1,
  expectedBlockers: ["reference integrity missing or invalid", "latest screenshot missing", "DOM landmarks missing", "1 required landmarks missing"]
}));
results.push(runScript("validate-fraud-proof-closeout.mjs", ["--run", path.join(runs, "run.json"), "--ir-dom-report", path.join(runs, "ir-dom-report.json"), "--closeout-gate", path.join(runs, "closeout-gate.json"), "--rubric-report", path.join(runs, "rubric-report.json"), "--out", path.join(runs, "fraud-proof-closeout.json")], {
  expectExit: 1,
  expectedBlockers: ["reference integrity missing or invalid", "actual screenshot missing", "actual not compared to approved source"]
}));

const referenceSource = path.join(vf, "references", "approved-source.txt");
writeText(".visual-fidelity/references/approved-source.txt", "approved visual reference\n");
writeJson(".visual-fidelity/references/manifest-baseline-update.json", {
  references: [{
    referenceId: "hero",
    approvedSourceType: "user-provided screenshot",
    approvedSourceLocation: referenceSource,
    sourceHash: hashFile(referenceSource),
    approvedRevisionOrDesignId: "approved-before-change",
    viewport: { width: 1440, height: 900 },
    reviewerOrApprovalMarker: "bench",
    createdFromRuntimeUnderTest: false,
    createdBeforeCurrentImplementation: true,
    baselineUpdatedDuringRun: true
  }]
});
results.push(runScript("validate-reference-integrity.mjs", ["--manifest", path.join(vf, "references", "manifest-baseline-update.json"), "--out", path.join(vf, "contracts", "reference-integrity-baseline-update.json")], {
  expectExit: 1,
  expectedBlockers: ["hero: baseline updated during current run"]
}));

writeJson(".visual-fidelity/analysis/visual-ir-multiturn.json", {
  version: 2,
  sourceContext: {},
  viewport: {},
  sectionTree: [],
  layoutGeometry: [{ id: "hero-title" }],
  typographyInventory: [],
  colorInventory: [],
  spacingInventory: [],
  imageInventory: [],
  ctaInventory: [],
  forbiddenOmissions: []
});
writeJson(".visual-fidelity/analysis/visual-checklist-multiturn.json", {
  version: 1,
  items: [{ id: "hero-title", status: "represented" }]
});
writeJson(".visual-fidelity/contracts/landmark-contract-multiturn.json", {
  criticalLandmarks: ["hero-title", "pricing-card"]
});
results.push(runScript("validate-visual-ir-completeness.mjs", ["--ir", path.join(vf, "analysis", "visual-ir-multiturn.json"), "--checklist", path.join(vf, "analysis", "visual-checklist-multiturn.json"), "--contract", path.join(vf, "contracts", "landmark-contract-multiturn.json")], {
  expectExit: 1,
  expectedBlockers: ["critical landmark not represented: pricing-card"]
}));

const regionalRun = path.join(vf, "runs", "regional");
fs.mkdirSync(regionalRun, { recursive: true });
const actual = path.join(regionalRun, "actual.png");
const reference = path.join(vf, "references", "approved.png");
writeText(".visual-fidelity/runs/regional/actual.png", "actual");
writeText(".visual-fidelity/references/approved.png", "reference");
writeJson(".visual-fidelity/runs/regional/run.json", { runId: "regional", actual, reference, diffRatio: 0.01 });
writeJson(".visual-fidelity/runs/regional/closeout-gate.json", { status: "ready", canSayDone: true, blockingReasons: [] });
writeJson(".visual-fidelity/runs/regional/rubric-report.json", { finalScore: 4.8 });
writeJson(".visual-fidelity/runs/regional/regional-rubric.json", { regions: [{ id: "hero-cta", score: 0.6, minScore: 0.9 }] });
writeJson(".visual-fidelity/contracts/reference-integrity-valid.json", { valid: true, blockers: [] });
results.push(runScript("validate-fraud-proof-closeout.mjs", ["--run", path.join(regionalRun, "run.json"), "--closeout-gate", path.join(regionalRun, "closeout-gate.json"), "--rubric-report", path.join(regionalRun, "rubric-report.json"), "--regional-rubric", path.join(regionalRun, "regional-rubric.json"), "--reference-integrity", path.join(vf, "contracts", "reference-integrity-valid.json"), "--out", path.join(regionalRun, "fraud-proof-closeout.json")], {
  expectExit: 1,
  expectedBlockers: ["regional rubric failed: hero-cta"]
}));

const report = {
  tmp,
  passed: results.every((result) => result.passed),
  results
};

console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
