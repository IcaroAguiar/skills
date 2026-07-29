#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function fail(message) {
  process.stderr.write(`split-report-cleanup: ${message}\n`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const positional = [];
let confirmation = null;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--confirm-run") {
    confirmation = argv[i + 1];
    i += 1;
  } else positional.push(argv[i]);
}
const [ledgerPathInput, reportPathInput] = positional;
if (!ledgerPathInput || !reportPathInput || !confirmation) fail("usage: cleanup-run.mjs <ledger.json> <report.html> --confirm-run <run-id>");

const ledgerPath = path.resolve(ledgerPathInput);
const reportPath = path.resolve(reportPathInput);
let ledger;
try {
  ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
} catch (error) {
  fail(`cannot read ledger: ${error.message}`);
}
if (ledger.runId !== confirmation) fail(`confirmation ${confirmation} does not match ledger runId ${ledger.runId}`);
if (!ledger.runDir) fail("ledger has no runDir");
const runDir = path.resolve(ledger.runDir);
if (path.basename(runDir) !== ledger.runId) fail(`runDir basename must equal runId: ${runDir}`);
if (ledgerPath !== runDir && !ledgerPath.startsWith(`${runDir}${path.sep}`)) fail("ledger must be inside the exact runDir");
if (reportPath === runDir || reportPath.startsWith(`${runDir}${path.sep}`)) fail("final report must be outside runDir");
if (!fs.existsSync(reportPath) || !fs.statSync(reportPath).isFile()) fail(`final report is unavailable: ${reportPath}`);
const report = fs.readFileSync(reportPath, "utf8");
if (!report.includes(`Run ${ledger.runId}`) || !report.includes('id="split-ledger"')) fail("final report does not contain the confirmed run and embedded ledger");
if (!fs.existsSync(runDir) || !fs.statSync(runDir).isDirectory()) fail(`runDir is unavailable: ${runDir}`);

const files = [];
const directories = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) fail(`refusing to clean symlink: ${target}`);
    if (entry.isDirectory()) {
      walk(target);
      directories.push(target);
    } else if (entry.isFile()) files.push(target);
    else fail(`refusing to clean non-file entry: ${target}`);
  }
}
walk(runDir);
for (const file of files) {
  fs.unlinkSync(file);
  process.stdout.write(`REMOVED ${file}\n`);
}
for (const directory of directories.sort((a, b) => b.length - a.length)) fs.rmdirSync(directory);
fs.rmdirSync(runDir);
process.stdout.write(`CLEANED ${runDir}; preserved ${reportPath}\n`);
