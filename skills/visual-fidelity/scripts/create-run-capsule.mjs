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
const gatePath = args.gate;
const actionsPath = args.actions;
const outPath = args.out || (runPath ? path.join(path.dirname(runPath), "run-capsule.md") : ".visual-fidelity/runs/run-capsule.md");
const run = readJson(runPath, {});
const gate = readJson(gatePath, {});
const actions = actionsPath && fs.existsSync(actionsPath)
  ? fs.readFileSync(actionsPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line))
  : [];

const capsule = `# Visual Fidelity Run Capsule

- run: ${run.runId || "unknown"}
- route: ${run.route || "unknown"}
- viewport: ${run.viewport || "unknown"}
- scroll stop: ${run.scrollStop || "unknown"}
- status: ${gate.status || "unknown"}
- can say done: ${gate.canSayDone === true}
- screenshot: ${run.actual || "none"}
- DOM landmarks: ${run.domLandmarks || "none"}
- ARIA snapshot: ${run.ariaSnapshot || "none"}
- diff: ${run.diff || "none"}
- blockers: ${(gate.blockingReasons || gate.blockers || []).join("; ") || "none"}
- next action: ${gate.nextActionId || actions[0]?.actionId || "none"}

## Open Actions

${actions.slice(0, 8).map((action) => `- ${action.actionId}: ${action.intent}`).join("\n") || "none"}
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, capsule);
console.log(JSON.stringify({ out: path.resolve(outPath) }, null, 2));
