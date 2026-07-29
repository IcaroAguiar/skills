#!/usr/bin/env node

import fs from "node:fs";

const packetPath = process.argv[2] || ".visual-fidelity/packets/executor-task-1.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : null;
const blockers = [];

if (!packet) blockers.push("packet missing");
for (const field of ["taskId", "objective", "targetFiles", "forbiddenChanges", "targetLandmarks", "expectedVisualChange", "doneWhen", "validationCommand", "maxFiles", "maxLinesChanged", "escalateIf"]) {
  if (!packet || packet[field] === undefined || packet[field] === null || packet[field] === "") blockers.push(`packet missing ${field}`);
}
if (packet && (!Array.isArray(packet.targetFiles) || packet.targetFiles.length === 0)) blockers.push("packet targetFiles must be non-empty");
if (packet && packet.requiresVisualJudgment === true) blockers.push("packet requires visual judgment and is invalid for cheap executor");
if (packet && packet.includesOpenReferenceImage === true) blockers.push("packet includes open reference image");
if (packet && packet.maxFiles && packet.targetFiles && packet.targetFiles.length > packet.maxFiles) blockers.push("targetFiles exceeds maxFiles");

const report = { valid: blockers.length === 0, blockers, packet: packetPath };
console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;

