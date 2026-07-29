#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const runPath = process.argv[2] || ".visual-fidelity/runs/latest/run.json";

if (!fs.existsSync(runPath)) {
  throw new Error(`Missing run report: ${runPath}`);
}

const run = JSON.parse(fs.readFileSync(runPath, "utf8"));
const lines = [
  `# Visual Fidelity Run Summary`,
  ``,
  `- run: ${run.runId || path.basename(path.dirname(runPath))}`,
  `- iteration: ${run.iteration ?? "unknown"}`,
  `- route: ${run.route || "unknown"}`,
  `- viewport: ${run.viewport || "unknown"}`,
  `- scroll stop: ${run.scrollStop || "unknown"}`,
  `- actual screenshot: ${run.actual || "none"}`,
  `- diff: ${run.diff || "none"}`,
  `- DOM landmarks: ${run.domLandmarks || "none"}`,
  `- rubric report: ${run.rubricReport || "none"}`,
  `- diff ratio: ${run.diffRatio ?? "unknown"}`,
  `- rubric score: ${run.rubricScore ?? "unknown"}`,
  `- critical caps: ${(run.criticalCapsTriggered || []).join(", ") || "none"}`,
  `- blocking divergences: ${(run.blockingDivergences || []).join("; ") || "none"}`,
  `- next priority adjustment: ${run.nextPriorityAdjustment || "unknown"}`
];

console.log(lines.join("\n"));

