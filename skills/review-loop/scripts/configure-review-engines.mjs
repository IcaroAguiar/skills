#!/usr/bin/env node
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const SUPPORTED_HARNESSES = new Set(["codex", "cursor", "claude-code"]);

function option(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function has(name) {
  return args.includes(name);
}

function die(message) {
  console.error(`review-loop engine configuration failed: ${message}`);
  process.exit(1);
}

function isInside(root, path) {
  const local = relative(root, path);
  return !local || (!local.startsWith("..") && !isAbsolute(local));
}

function harnessRoot(harness) {
  if (harness === "codex") return resolve(process.env.CODEX_HOME || join(homedir(), ".codex"));
  if (harness === "cursor") return resolve(process.env.CURSOR_HOME || join(homedir(), ".cursor"));
  return resolve(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"));
}

function defaultOutput(harness) {
  return join(harnessRoot(harness), "review-loop", "engine-choice.json");
}

function canonicalizeProspectivePath(path) {
  const missingSegments = [];
  let existing = path;
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) die(`cannot resolve output path ${path}`);
    missingSegments.unshift(basename(existing));
    existing = parent;
  }
  return resolve(realpathSync.native(existing), ...missingSegments);
}

function isSymbolicLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function requireIdentity(role) {
  const values = {
    id: option(`--${role}-id`).trim(),
    modelId: option(`--${role}-model`).trim(),
    reasoningMode: option(`--${role}-reasoning`).trim(),
  };
  for (const [field, value] of Object.entries(values)) {
    if (!value || /[\u0000-\u001f\u007f]/.test(value)) die(`--${role}-${field === "modelId" ? "model" : field === "reasoningMode" ? "reasoning" : field} must be an exact non-empty harness value`);
  }
  return values;
}

function writeAtomically(path, serialized) {
  const parent = dirname(path);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  if (isSymbolicLink(path)) die("output must not be a symbolic link");
  const temporaryPath = join(parent, `.${basename(path)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(temporaryPath, "wx", 0o600);
    writeFileSync(descriptor, serialized, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, path);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    die(`cannot write engine choice safely: ${error.message}`);
  }
}

if (has("--help")) {
  console.log(`review-loop explicit engine configuration

Usage:
  node configure-review-engines.mjs --harness codex|cursor|claude-code
    --reviewer-id <profile> --reviewer-model <model> --reviewer-reasoning <mode>
    --fixer-id <profile> --fixer-model <model> --fixer-reasoning <mode>
    [--output <protected-file>] [--candidate-root <repository>] [--replace]

The caller must ask the user to choose both exact harness profiles before this
command runs. Existing choices are reused and are never replaced without an
explicit --replace operation authorized by the user.`);
  process.exit(0);
}

const harness = option("--harness").trim();
if (!SUPPORTED_HARNESSES.has(harness)) die("--harness must be codex, cursor, or claude-code");
const reviewer = requireIdentity("reviewer");
const fixer = requireIdentity("fixer");
const candidateRootLexical = resolve(option("--candidate-root", process.cwd()));
if (!existsSync(candidateRootLexical)) die("--candidate-root must exist");
const candidateRootCanonical = realpathSync.native(candidateRootLexical);
const outputLexical = resolve(option("--output", defaultOutput(harness)));
const outputCanonical = canonicalizeProspectivePath(outputLexical);
if (isInside(candidateRootLexical, outputLexical) || isInside(candidateRootCanonical, outputCanonical)) {
  die("engine choice must stay outside the candidate repository");
}
if (existsSync(outputLexical) && !has("--replace")) {
  die("engine choice already exists; reuse it or obtain explicit user authorization and pass --replace");
}

const configuredAt = new Date().toISOString();
const choice = {
  version: 1,
  harness,
  source: "explicit-user-choice",
  configuredAt,
  reviewer,
  fixer,
};
writeAtomically(outputLexical, `${JSON.stringify(choice, null, 2)}\n`);

const verified = JSON.parse(readFileSync(outputLexical, "utf8"));
if (verified.harness !== harness || verified.reviewer.id !== reviewer.id || verified.fixer.id !== fixer.id) {
  die("written engine choice could not be verified");
}
console.log(JSON.stringify({ status: "configured", harness, configuredAt, reviewer, fixer }, null, 2));
