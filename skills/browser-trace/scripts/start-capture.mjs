#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [target, runId] = process.argv.slice(2);
if (!target || !runId) {
  console.error('usage: start-capture.mjs <target-port|debugger-url> <run-id>');
  process.exit(2);
}

const root = path.resolve(process.env.O11Y_ROOT || '.o11y');
const runPath = path.join(root, runId);
const networkPath = path.join(runPath, 'cdp', 'network');
const rawPath = path.join(runPath, 'cdp', 'raw');
fs.mkdirSync(networkPath, { recursive: true });
fs.mkdirSync(rawPath, { recursive: true });

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const daemon = path.join(scriptDir, 'capture-daemon.mjs');
const logPath = path.join(runPath, 'capture.log');
const out = fs.openSync(logPath, 'a');
const child = spawn(process.execPath, [daemon, target, runPath], {
  detached: true,
  stdio: ['ignore', out, out],
  env: { ...process.env },
});
child.unref();

const state = {
  pid: child.pid,
  target,
  runId,
  runPath,
  startedAt: new Date().toISOString(),
  status: 'running',
};
fs.writeFileSync(path.join(runPath, 'capture-state.json'), JSON.stringify(state, null, 2));
console.log(JSON.stringify(state, null, 2));
