#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".visual-fidelity");
const required = [
  "visual-ir.json",
  "visual-rubric.json",
  "component-map.json",
  "selector-map.json"
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
const runsDir = path.join(root, "runs");
const runFiles = fs.existsSync(runsDir)
  ? fs.readdirSync(runsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((entry) => {
      const runRoot = path.join(runsDir, entry.name);
      return ["run.json", "dom-landmarks.json", "ir-dom-report.json", "action-queue.jsonl", "closeout-gate.json"]
        .filter((file) => fs.existsSync(path.join(runRoot, file)))
        .map((file) => path.join(entry.name, file));
    })
  : [];

const report = {
  root,
  protocolReady: missing.length === 0 && runFiles.length > 0,
  missing,
  runArtifactsFound: runFiles
};

console.log(JSON.stringify(report, null, 2));
if (!report.protocolReady) process.exitCode = 1;

