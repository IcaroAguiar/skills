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

function readActionQueue(filePath) {
  return fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

const args = parseArgs(process.argv);
const actionQueue = args.action || args.queue;
const actionId = args["action-id"];
const outPath = args.out || ".visual-fidelity/packets/executor-task-1.json";

if (!actionQueue) {
  console.error("Usage: node create-executor-task-packet.mjs --action run/action-queue.jsonl --action-id ID --out .visual-fidelity/packets/executor-task-1.json");
  process.exit(2);
}

const actions = readActionQueue(actionQueue);
const action = actionId ? actions.find((item) => item.actionId === actionId) : actions[0];
if (!action) throw new Error(`Action not found: ${actionId || "(first action)"}`);

const packet = {
  version: 1,
  taskId: action.actionId,
  objective: action.intent,
  targetFiles: action.targetFiles || [],
  allowedEditScope: action.allowedEditTypes || [],
  forbiddenChanges: action.forbiddenEditTypes || [],
  referenceCrops: action.referenceCrops || [],
  targetLandmarks: action.targetLandmarks || [],
  expectedDomOrAria: action.expectedDomOrAria || [],
  expectedVisualChange: action.intent,
  doneWhen: action.doneWhen || action.stopAfter || "one focused patch and one validation run completed",
  validationCommand: action.validationCommand || "",
  maxFiles: action.constraints?.maxFiles ?? Math.max(1, (action.targetFiles || []).length),
  maxLinesChanged: action.maxLinesChanged ?? 120,
  escalateIf: action.escalateIf || [
    "target files are insufficient",
    "visual judgment is required",
    "forbidden behavior must change",
    "validation command cannot run"
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`);
console.log(JSON.stringify({ out: path.resolve(outPath), taskId: packet.taskId }, null, 2));

