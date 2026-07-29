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

function readJson(filePath, fallback = null) {
  return filePath && fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : fallback;
}

const args = parseArgs(process.argv);
const runPath = args.run;
const irDomPath = args["ir-dom-report"];
const rubricReportPath = args["rubric-report"];
const fraudProofPath = args["fraud-proof"];
const referenceIntegrityPath = args["reference-integrity"] || ".visual-fidelity/contracts/reference-integrity.json";
const outPath = args.out || ".visual-fidelity/runs/closeout-gate.json";
const minScore = Number(args["min-score"] || 4.3);

const run = readJson(runPath, {});
const irDomReport = readJson(irDomPath, { summary: {}, landmarks: [] });
const rubricReport = readJson(rubricReportPath, null);
const fraudProof = readJson(fraudProofPath, null);
const referenceIntegrity = readJson(referenceIntegrityPath, null);
const blockingReasons = [];

if (!referenceIntegrity || referenceIntegrity.valid !== true) {
  blockingReasons.push("reference integrity missing or invalid");
}
if (!run.actual || !fs.existsSync(run.actual)) {
  blockingReasons.push("latest screenshot missing");
}
if (!run.domLandmarks || !fs.existsSync(run.domLandmarks)) {
  blockingReasons.push("DOM landmarks missing");
}
if (irDomReport.summary?.missingRequiredLandmarks > 0) {
  blockingReasons.push(`${irDomReport.summary.missingRequiredLandmarks} required landmarks missing`);
}
if (irDomReport.summary?.semanticFailures > 0) {
  blockingReasons.push(`${irDomReport.summary.semanticFailures} semantic failures`);
}
for (const item of run.blockingDivergences || []) {
  blockingReasons.push(item);
}
const rubricScore = rubricReport?.finalScore ?? rubricReport?.rubricScore ?? run.rubricScore ?? null;
if (rubricScore !== null && Number(rubricScore) < minScore) {
  blockingReasons.push(`rubric score ${rubricScore} below ${minScore}`);
}
if (rubricScore === null) {
  blockingReasons.push("rubric report missing or incomplete");
}
if (fraudProof && fraudProof.canSayDone === false) {
  for (const blocker of fraudProof.blockers || []) blockingReasons.push(`fraud-proof blocker: ${blocker}`);
}
const criticalCaps = rubricReport?.criticalCapsTriggered || run.criticalCapsTriggered || [];
for (const cap of criticalCaps) {
  blockingReasons.push(`critical cap triggered: ${typeof cap === "string" ? cap : cap.condition || JSON.stringify(cap)}`);
}

let status = "ready";
if (!run.actual || !fs.existsSync(run.actual)) {
  status = "screenshot validation blocked";
} else if (blockingReasons.some((reason) => /interaction|semantic|form|route|link|auth|data/i.test(reason))) {
  status = "functional correction still required";
} else if (blockingReasons.length) {
  status = "structural correction still required";
} else if (rubricScore !== null && Number(rubricScore) < minScore + 0.2) {
  status = "minor residual differences";
}

const nextActionId = args["next-action-id"] || null;
const gate = {
  status,
  canSayDone: status === "ready",
  blockingReasons,
  nextActionId,
  evidence: {
    latestScreenshot: run.actual || null,
    latestDiff: run.diff || null,
    domLandmarks: run.domLandmarks || null,
    irDomReport: irDomPath || null,
    rubricReport: rubricReportPath || null
  }
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(gate, null, 2)}\n`);
console.log(JSON.stringify(gate, null, 2));
if (!gate.canSayDone) process.exitCode = 1;
