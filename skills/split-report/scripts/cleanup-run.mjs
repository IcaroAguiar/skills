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
let retainDirInput = null;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--confirm-run") {
    confirmation = argv[i + 1];
    i += 1;
  } else if (argv[i] === "--retain-dir") {
    retainDirInput = argv[i + 1];
    i += 1;
  } else positional.push(argv[i]);
}
const [ledgerPathInput] = positional;
if (!ledgerPathInput || !retainDirInput || !confirmation) fail("usage: cleanup-run.mjs <ledger.json> --retain-dir <final-evidence-dir> --confirm-run <run-id>");

const ledgerPath = path.resolve(ledgerPathInput);
const retainDir = path.resolve(retainDirInput);
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
if (retainDir === runDir || retainDir.startsWith(`${runDir}${path.sep}`)) fail("final evidence directory must be outside runDir");
if (!fs.existsSync(runDir) || !fs.statSync(runDir).isDirectory()) fail(`runDir is unavailable: ${runDir}`);

const retained = ledger.artifacts?.filter((artifact) => artifact.retain === true) ?? [];
fs.mkdirSync(retainDir, { recursive: true });
for (const artifact of retained) {
  if (!artifact.path) fail(`retained artifact has no path: ${artifact.id ?? "unknown"}`);
  const source = path.isAbsolute(artifact.path) ? path.resolve(artifact.path) : path.resolve(runDir, artifact.path);
  if (!source.startsWith(`${runDir}${path.sep}`)) fail(`retained artifact must be inside runDir: ${artifact.id ?? source}`);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`retained artifact is unavailable: ${artifact.id ?? source}`);
  const destination = path.join(retainDir, path.basename(source));
  if (fs.existsSync(destination)) fail(`retained artifact would overwrite an existing file: ${destination}`);
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  process.stdout.write(`RETAINED ${destination}\n`);
}

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
process.stdout.write(`CLEANED ${runDir}; retained ${retained.length} artifact(s) in ${retainDir}\n`);
