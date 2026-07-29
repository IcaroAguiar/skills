#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [runId] = process.argv.slice(2);
if (!runId) {
  console.error('usage: bisect-cdp.mjs <run-id>');
  process.exit(2);
}
const runPath = path.join(path.resolve(process.env.O11Y_ROOT || '.o11y'), runId);
const networkPath = path.join(runPath, 'cdp', 'network');
const requestsPath = path.join(networkPath, 'requests.jsonl');
const responsesPath = path.join(networkPath, 'responses.jsonl');

function countLines(file) {
  if (!fs.existsSync(file)) return 0;
  const text = fs.readFileSync(file, 'utf8');
  return text.trim() ? text.trim().split('\n').length : 0;
}

const summary = {
  runId,
  runPath,
  generatedAt: new Date().toISOString(),
  requests: countLines(requestsPath),
  responses: countLines(responsesPath),
  requestsPath,
  responsesPath,
  browserToApiReady: fs.existsSync(requestsPath) && fs.existsSync(responsesPath),
};
fs.writeFileSync(path.join(networkPath, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
