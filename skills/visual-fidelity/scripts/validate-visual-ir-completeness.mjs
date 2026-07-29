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
const irPath = args.ir || ".visual-fidelity/analysis/visual-ir.v2.json";
const checklistPath = args.checklist || ".visual-fidelity/analysis/visual-checklist.json";
const contractPath = args.contract || ".visual-fidelity/contracts/landmark-contract.json";
const outPath = args.out || ".visual-fidelity/contracts/visual-ir-completeness.json";

const ir = readJson(irPath, {});
const checklist = readJson(checklistPath, { items: [] });
const contract = readJson(contractPath, {});
const blockers = [];
const requiredArrays = [
  "sectionTree",
  "layoutGeometry",
  "typographyInventory",
  "colorInventory",
  "spacingInventory",
  "imageInventory",
  "ctaInventory",
  "forbiddenOmissions"
];

for (const key of requiredArrays) {
  if (!Array.isArray(ir[key])) blockers.push(`visual-ir.v2 missing array ${key}`);
}
if (!ir.sourceContext) blockers.push("visual-ir.v2 missing sourceContext");
if (!ir.viewport) blockers.push("visual-ir.v2 missing viewport");
if (!Array.isArray(checklist.items)) blockers.push("visual-checklist items missing");
const unresolvedChecklist = (checklist.items || []).filter((item) => !["represented", "intentionally_ignored_with_reason"].includes(item.status));
for (const item of unresolvedChecklist) blockers.push(`checklist unresolved: ${item.id || item.label || "unknown"}`);
const criticalLandmarks = contract.criticalLandmarks || [];
const representedIds = new Set([
  ...(ir.layoutGeometry || []).map((item) => item.id),
  ...(ir.ctaInventory || []).map((item) => item.id),
  ...(ir.imageInventory || []).map((item) => item.id),
  ...(checklist.items || []).filter((item) => item.status === "represented").map((item) => item.landmarkId || item.id)
]);
for (const id of criticalLandmarks) {
  if (!representedIds.has(id)) blockers.push(`critical landmark not represented: ${id}`);
}

const report = { version: 1, valid: blockers.length === 0, blockers };
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;

