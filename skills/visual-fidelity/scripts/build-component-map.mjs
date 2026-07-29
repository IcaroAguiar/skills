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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const args = parseArgs(process.argv);
const irPath = args.ir || ".visual-fidelity/visual-ir.json";
const outPath = args.out || ".visual-fidelity/component-map.json";
const route = args.route || "/";
const ir = readJson(irPath);

const entries = (ir.landmarks || []).map((landmark) => {
  const target = landmark.implementationTarget || {};
  const files = Array.isArray(target.files)
    ? target.files
    : target.file
      ? [target.file]
      : [];
  return {
    landmarkId: landmark.id,
    visualRole: landmark.visualRole || landmark.kind || "unknown",
    component: target.component || "unknown",
    files,
    preservedBehavior: landmark.preservedBehavior || [],
    safeEditTypes: ["className", "CSS variables", "local CSS", "layout wrapper"],
    forbiddenEditTypes: ["data source", "routing", "copy removal", "semantic downgrade"]
  };
});

const componentMap = { version: 1, route, entries };
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(componentMap, null, 2)}\n`);
console.log(JSON.stringify({ out: path.resolve(outPath), entries: entries.length }, null, 2));
