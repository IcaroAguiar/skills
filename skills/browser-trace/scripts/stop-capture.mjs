#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [runId] = process.argv.slice(2);
if (!runId) {
  console.error('usage: stop-capture.mjs <run-id>');
  process.exit(2);
}
const runPath = path.join(path.resolve(process.env.O11Y_ROOT || '.o11y'), runId);
const statePath = path.join(runPath, 'capture-state.json');
if (!fs.existsSync(statePath)) {
  console.error(`capture state not found: ${statePath}`);
  process.exit(1);
}
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
fs.writeFileSync(path.join(runPath, '.stop'), new Date().toISOString());

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

const started = Date.now();
while (alive(state.pid) && Date.now() - started < 5000) {
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (alive(state.pid)) {
  try { process.kill(state.pid, 'SIGTERM'); } catch {}
}
const next = { ...state, status: 'stopped', stoppedAt: new Date().toISOString() };
fs.writeFileSync(statePath, JSON.stringify(next, null, 2));
console.log(JSON.stringify(next, null, 2));
