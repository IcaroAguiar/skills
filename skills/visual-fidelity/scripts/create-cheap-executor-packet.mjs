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

function readActionQueue(filePath) {
  return fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

const args = parseArgs(process.argv);
const actionPath = args.action;
const actionId = args["action-id"];
const statePath = args.state || ".visual-fidelity/state.md";
const irPath = args.ir || ".visual-fidelity/visual-ir.json";
const componentMapPath = args["component-map"] || ".visual-fidelity/component-map.json";
const selectorMapPath = args["selector-map"] || ".visual-fidelity/selector-map.json";
const outPath = args.out || ".visual-fidelity/runs/cheap-executor-packet.md";

if (!actionPath) {
  console.error("Usage: node create-cheap-executor-packet.mjs --action run/action-queue.jsonl --action-id ACTION_ID --out run/cheap-executor-packet.md");
  process.exit(2);
}

const actions = readActionQueue(actionPath);
const action = actionId ? actions.find((item) => item.actionId === actionId) : actions[0];
if (!action) {
  throw new Error(`Action not found: ${actionId || "(first action)"}`);
}

const ir = readJson(irPath, { landmarks: [] });
const componentMap = readJson(componentMapPath, { entries: [] });
const selectorMap = readJson(selectorMapPath, { entries: [] });
const relevantLandmarks = (ir.landmarks || []).filter((landmark) => action.targetLandmarks.includes(landmark.id));
const relevantComponents = (componentMap.entries || []).filter((entry) => action.targetLandmarks.includes(entry.landmarkId));
const relevantSelectors = (selectorMap.entries || []).filter((entry) => action.targetLandmarks.includes(entry.landmarkId));
const state = fs.existsSync(statePath) ? fs.readFileSync(statePath, "utf8") : "";

const packet = `# Cheap Executor Packet

You are a bounded visual-fidelity implementation executor.
You are not the visual judge.
Implement only the selected action from this packet.
Do not reinterpret the original reference image.
Do not edit files outside the allowlist.
Do not change route, data flow, links, forms, state, accessibility, or copy unless the action explicitly requires it.

## Selected Action

\`\`\`json
${JSON.stringify(action, null, 2)}
\`\`\`

## Allowed Files

${(action.targetFiles || []).map((file) => `- ${file}`).join("\n") || "- none listed; stop and report blocker"}

## Relevant Landmarks

\`\`\`json
${JSON.stringify(relevantLandmarks, null, 2)}
\`\`\`

## Component Map Entries

\`\`\`json
${JSON.stringify(relevantComponents, null, 2)}
\`\`\`

## Selector Map Entries

\`\`\`json
${JSON.stringify(relevantSelectors, null, 2)}
\`\`\`

## Current State Excerpt

\`\`\`md
${state.slice(0, 4000)}
\`\`\`

## Validation Command

\`\`\`bash
${action.validationCommand || "No validation command provided; report this blocker."}
\`\`\`

## Return Format

- changed files
- what changed
- validation command result
- artifacts produced
- blockers
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, packet);
console.log(JSON.stringify({ out: path.resolve(outPath), actionId: action.actionId, targetFiles: action.targetFiles || [] }, null, 2));

