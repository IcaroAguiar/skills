#!/usr/bin/env node
import { existsSync, lstatSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const skillName = "record-real-dev-e2e";
const home = homedir();
const canonical = join(home, ".agents", "skills", skillName);

if (!existsSync(canonical)) {
  console.error(`FAIL canonical package missing: ${canonical}`);
  process.exit(1);
}

const canonicalReal = realpathSync(canonical);
const skillDirs = [];

function scan(path, depth) {
  if (depth > 4) return;
  let entries;
  try {
    entries = readdirSync(path, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (depth === 0 && !entry.name.startsWith(".")) continue;
    if ([".cache", ".npm", ".local", ".Trash", "node_modules"].includes(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.name === "skills") skillDirs.push(child);
    if (entry.name !== "skills") scan(child, depth + 1);
  }
}

scan(home, 0);

const installed = new Set([canonical]);
const failures = [];
for (const dir of skillDirs) {
  const candidate = join(dir, skillName);
  if (!existsSync(candidate)) continue;
  installed.add(candidate);
  const actual = realpathSync(candidate);
  if (actual !== canonicalReal) failures.push(`${candidate} -> ${actual}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL divergent package: ${failure}`);
  process.exit(1);
}

const explicitLinks = [...installed].filter((path) => path !== canonical && lstatSync(path).isSymbolicLink()).length;
console.log(`Global install audit passed: canonical=1 explicit_links=${explicitLinks} divergent=0`);
console.log(`Canonical package: ${basename(canonicalReal)}`);
