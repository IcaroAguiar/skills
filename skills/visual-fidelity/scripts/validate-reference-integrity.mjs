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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const args = parseArgs(process.argv);
const manifestPath = args.manifest || ".visual-fidelity/references/manifest.json";
const outPath = args.out || ".visual-fidelity/contracts/reference-integrity.json";
const currentRunId = args["run-id"] || process.env.VISUAL_FIDELITY_RUN_ID || null;
const blockers = [];

if (!fs.existsSync(manifestPath)) {
  blockers.push("reference manifest missing");
}

const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : { references: [] };
const references = manifest.references || [];
if (!references.length) blockers.push("reference manifest has no references");

for (const ref of references) {
  const prefix = ref.referenceId || "(missing referenceId)";
  for (const field of ["referenceId", "approvedSourceType", "approvedSourceLocation", "sourceHash", "approvedRevisionOrDesignId", "viewport", "reviewerOrApprovalMarker"]) {
    if (ref[field] === undefined || ref[field] === null || ref[field] === "") blockers.push(`${prefix}: missing ${field}`);
  }
  if (ref.createdFromRuntimeUnderTest !== false) blockers.push(`${prefix}: createdFromRuntimeUnderTest must be false`);
  if (ref.createdBeforeCurrentImplementation !== true) blockers.push(`${prefix}: createdBeforeCurrentImplementation must be true`);
  if (ref.baselineUpdatedDuringRun === true || (currentRunId && ref.updatedDuringRunId === currentRunId)) blockers.push(`${prefix}: baseline updated during current run`);
  if (String(ref.approvedSourceType || "").includes("runtime")) blockers.push(`${prefix}: approved source type is runtime-like`);

  const location = ref.approvedSourceLocation;
  if (location && fs.existsSync(location)) {
    const actualHash = hashFile(location);
    if (ref.sourceHash && ref.sourceHash !== actualHash) blockers.push(`${prefix}: sourceHash mismatch`);
  } else if (location && !/^figma:|^https?:/.test(location)) {
    blockers.push(`${prefix}: approved source location missing on disk`);
  }

  for (const artifact of ref.derivedArtifacts || []) {
    if (!artifact.sourceReferenceId && artifact !== ref.referenceId) blockers.push(`${prefix}: derived artifact missing sourceReferenceId`);
  }
}

const report = {
  version: 1,
  valid: blockers.length === 0,
  manifest: manifestPath,
  referenceCount: references.length,
  blockers
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;

