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

function componentEntry(componentMap, landmarkId) {
  return (componentMap.entries || []).find((entry) => entry.landmarkId === landmarkId) || {};
}

function priorityFor(item) {
  if (item.status === "missing_required") return 1;
  if (item.semanticFailure) return 2;
  const drift = item.boxDrift || {};
  const maxDrift = Math.max(Math.abs(drift.dx || 0), Math.abs(drift.dy || 0), Math.abs(drift.dw || 0), Math.abs(drift.dh || 0));
  if (maxDrift >= 48) return 3;
  if (maxDrift >= 12) return 4;
  if (item.styleDrift && Object.keys(item.styleDrift).length) return 5;
  return 8;
}

function categoryFor(item) {
  if (item.status === "missing_required") return "core_completeness";
  if (item.semanticFailure) return "interaction_preservation";
  if (item.boxDrift) return "structure_layout";
  if (item.styleDrift && Object.keys(item.styleDrift).length) return "visual_tokens";
  return "render_cleanliness";
}

function severityFor(priority) {
  if (priority <= 2) return "blocking";
  if (priority <= 4) return "high";
  if (priority <= 6) return "medium";
  return "low";
}

const args = parseArgs(process.argv);
const reportPath = args["ir-dom-report"];
const componentMapPath = args["component-map"] || ".visual-fidelity/component-map.json";
const outPath = args.out || ".visual-fidelity/runs/action-queue.jsonl";
const validationCommand = args["validation-command"] || process.env.VISUAL_FIDELITY_VALIDATION_COMMAND || "";

if (!reportPath) {
  console.error("Usage: node derive-next-actions.mjs --ir-dom-report run/ir-dom-report.json --component-map .visual-fidelity/component-map.json --out run/action-queue.jsonl");
  process.exit(2);
}

const report = readJson(reportPath);
const componentMap = readJson(componentMapPath, { entries: [] });
const actions = (report.landmarks || [])
  .filter((item) => item.status !== "matched")
  .map((item) => {
    const entry = componentEntry(componentMap, item.id);
    const priority = priorityFor(item);
    return {
      actionId: `${item.status}-${item.id}`,
      priority,
      status: "open",
      category: categoryFor(item),
      severity: severityFor(priority),
      intent: item.recommendedFix || `Repair visual divergence for ${item.id}.`,
      targetLandmarks: [item.id],
      targetFiles: entry.files || [],
      allowedEditTypes: entry.safeEditTypes || ["className", "local CSS", "layout wrapper"],
      forbiddenEditTypes: entry.forbiddenEditTypes || ["routing", "data source", "copy removal", "semantic downgrade"],
      constraints: {
        maxFiles: Math.max(1, (entry.files || []).length || 1),
        maxDiffScope: "local layout/style only"
      },
      evidence: {
        referenceBox: item.referenceBox,
        actualBox: item.actualBox,
        boxDrift: item.boxDrift,
        severity: severityFor(priority)
      },
      validationCommand,
      stopAfter: "one focused patch and one validation run"
    };
  })
  .sort((a, b) => a.priority - b.priority);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, actions.map((action) => JSON.stringify(action)).join("\n") + (actions.length ? "\n" : ""));
console.log(JSON.stringify({ out: path.resolve(outPath), actions: actions.length, nextActionId: actions[0]?.actionId || null }, null, 2));

