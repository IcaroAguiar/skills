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
const referenceIntegrity = readJson(args["reference-integrity"] || ".visual-fidelity/contracts/reference-integrity.json", null);
const closeoutGate = readJson(args["closeout-gate"], null);
const run = readJson(args.run, {});
const rubricReport = readJson(args["rubric-report"], null);
const regionalRubric = readJson(args["regional-rubric"], null);
const outPath = args.out || ".visual-fidelity/runs/fraud-proof-closeout.json";
const blockers = [];

if (!referenceIntegrity || referenceIntegrity.valid !== true) blockers.push("reference integrity missing or invalid");
if (!closeoutGate) blockers.push("closeout-gate.json missing");
if (!rubricReport) blockers.push("rubricReport null or incomplete");
if (!run.actual || !fs.existsSync(run.actual)) blockers.push("actual screenshot missing");
if (!run.reference && !run.approvedReference) blockers.push("actual not compared to approved source");
if (run.reference && run.actual && path.resolve(run.reference) === path.resolve(run.actual)) blockers.push("comparison appears actual vs actual");
if (run.diffRatio === 0 && (!referenceIntegrity || referenceIntegrity.valid !== true)) blockers.push("perfect diff with invalid provenance");
if (run.baselineUpdatedDuringRun === true) blockers.push("baseline updated during same execution");
if ((run.criticalLandmarksMissing || 0) > 0) blockers.push("critical landmark missing");
if ((run.forbiddenOmissions || []).length > 0) blockers.push("forbidden omission present");
if (regionalRubric?.regions) {
  const failed = regionalRubric.regions.filter((region) => region.passed === false || (region.score !== undefined && region.minScore !== undefined && region.score < region.minScore));
  for (const region of failed) blockers.push(`regional rubric failed: ${region.id || region.name || "unknown"}`);
}

const report = {
  status: blockers.length ? "blocked" : "ready",
  canSayDone: blockers.length === 0,
  blockers,
  evidence: {
    referenceIntegrity: args["reference-integrity"] || ".visual-fidelity/contracts/reference-integrity.json",
    closeoutGate: args["closeout-gate"] || null,
    run: args.run || null,
    rubricReport: args["rubric-report"] || null,
    regionalRubric: args["regional-rubric"] || null
  }
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.canSayDone) process.exitCode = 1;

