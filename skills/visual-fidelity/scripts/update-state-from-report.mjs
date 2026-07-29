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

const args = parseArgs(process.argv);
const runPath = args.run || ".visual-fidelity/runs/latest/run.json";
const statePath = args.state || ".visual-fidelity/state.md";

if (!fs.existsSync(runPath)) {
  throw new Error(`Missing run report: ${runPath}`);
}

const run = JSON.parse(fs.readFileSync(runPath, "utf8"));
const previous = fs.existsSync(statePath) ? fs.readFileSync(statePath, "utf8") : "# Visual Fidelity State\n";
const archiveMarker = "\n\n## Run Ledger Update\n";
const base = previous.includes(archiveMarker) ? previous.slice(0, previous.indexOf(archiveMarker)) : previous;
const update = `${archiveMarker}
- latest run: ${run.runId || path.basename(path.dirname(runPath))}
- current iteration: ${run.iteration ?? "unknown"}
- latest screenshot artifact: ${run.actual || "none"}
- latest diff/report artifact: ${run.diff || run.rubricReport || "none"}
- latest diff ratio: ${run.diffRatio ?? "unknown"}
- latest rubric score: ${run.rubricScore ?? "unknown"}
- critical caps triggered: ${(run.criticalCapsTriggered || []).join(", ") || "none"}
- blocking divergences: ${(run.blockingDivergences || []).join("; ") || "none"}
- next priority adjustment: ${run.nextPriorityAdjustment || "unknown"}
`;

fs.mkdirSync(path.dirname(statePath), { recursive: true });
fs.writeFileSync(statePath, `${base.trimEnd()}${update}\n`);
console.log(JSON.stringify({ statePath: path.resolve(statePath), runPath: path.resolve(runPath) }, null, 2));

