#!/usr/bin/env node
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const SUPPORTED_HARNESSES = new Set(["codex", "cursor", "claude-code", "opencode"]);
const TRUSTED_SOURCES = new Set(["protected-harness-config", "trusted-base-artifact"]);

function option(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function has(name) {
  return args.includes(name);
}

function die(message) {
  console.error(`review-loop harness inventory export failed: ${message}`);
  process.exit(1);
}

function isInside(root, path) {
  const local = relative(root, path);
  return !local || (!local.startsWith("..") && !isAbsolute(local));
}

function lexicalPath(path) {
  return resolve(path);
}

function isSymbolicLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function canonicalPath(label, path, { mustExist = true } = {}) {
  const lexical = lexicalPath(path);
  if (existsSync(lexical)) return realpathSync.native(lexical);
  if (mustExist) return lexical;
  const parent = dirname(lexical);
  if (!existsSync(parent)) die(`${label} parent directory does not exist`);
  return resolve(realpathSync.native(parent), basename(lexical));
}

function rejectCandidateRepositoryPath(label, path, options) {
  const lexical = lexicalPath(path);
  if (label === "output" && isSymbolicLink(lexical)) die("output must not be a symbolic link");
  const canonical = canonicalPath(label, path, options);
  if (isInside(candidateRootLexical, lexical) || isInside(candidateRootCanonical, canonical)) {
    die(`${label} must stay outside the candidate repository`);
  }
  return lexical;
}

function requireString(label, value) {
  if (typeof value !== "string" || !value.trim()) die(`${label} must be a non-empty observed value or not_observable`);
  return value;
}

function requireTrust(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !TRUSTED_SOURCES.has(value.sourceClass)) {
    die("input.trust must use protected-harness-config or trusted-base-artifact");
  }
  if (typeof value.identifier !== "string" || !value.identifier.trim()) die("input.trust.identifier must be non-empty");
}

function normalizeProfile(profile, index, harness) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) die(`profiles[${index}] must be an object`);
  const id = requireString(`profiles[${index}].id`, profile.id);
  const modelId = requireString(`profiles[${index}].modelId`, profile.modelId);
  const reasoningMode = requireString(`profiles[${index}].reasoningMode`, profile.reasoningMode);
  if (!Array.isArray(profile.roles) || profile.roles.length === 0 || profile.roles.some((role) => typeof role !== "string" || !role.trim())) {
    die(`profiles[${index}].roles must be a non-empty string array`);
  }
  if (!profile.capabilities || typeof profile.capabilities !== "object" || Array.isArray(profile.capabilities)) {
    die(`profiles[${index}].capabilities must be a normalized object`);
  }
  if (!profile.cost || typeof profile.cost !== "object" || Array.isArray(profile.cost)) {
    die(`profiles[${index}].cost must be a normalized object`);
  }
  return {
    harness,
    id,
    modelId,
    reasoningMode,
    roles: profile.roles,
    capabilities: profile.capabilities,
    cost: profile.cost,
  };
}

function writeAtomically(path, serialized) {
  if (isSymbolicLink(path)) die("output must not be a symbolic link");
  const temporaryPath = join(dirname(path), `.${basename(path)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
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
    die(`cannot write output safely: ${error.message}`);
  }
}

if (has("--help")) {
  console.log(`review-loop harness inventory export

Usage:
  node export-harness-inventory.mjs --harness codex|cursor|claude-code|opencode
    --input <protected-harness-export.json> --output <protected-inventory.json>
    [--candidate-root <repository>] [--allow-fixture]

This adapter does not discover models or profiles. Its protected input must be
an export from the active harness integration, containing the exact observed
profile id, modelId, reasoningMode, roles, capabilities, and cost. Use
not_observable only when the active harness did not expose that field.`);
  process.exit(0);
}

const harness = option("--harness");
const inputPath = option("--input");
const outputPath = option("--output");
if (!SUPPORTED_HARNESSES.has(harness)) die("--harness must be codex, cursor, claude-code, or opencode");
if (!inputPath) die("--input is required");
if (!outputPath) die("--output is required");
const candidateRootLexical = lexicalPath(option("--candidate-root", process.cwd()));
if (!existsSync(candidateRootLexical)) die("--candidate-root must exist");
const candidateRootCanonical = realpathSync.native(candidateRootLexical);
const protectedInputPath = rejectCandidateRepositoryPath("input", inputPath, { mustExist: true });
const protectedOutputPath = rejectCandidateRepositoryPath("output", outputPath, { mustExist: false });

if (!existsSync(protectedInputPath)) die("input file is missing");
let input;
try {
  input = JSON.parse(readFileSync(protectedInputPath, "utf8"));
} catch (error) {
  die(`input is invalid JSON: ${error.message}`);
}
if (!input || typeof input !== "object" || Array.isArray(input)) die("input must be an object");
if (input.harness !== harness) die("input.harness must exactly match --harness");
requireTrust(input.trust);
if (input.fixture === true && !has("--allow-fixture")) die("fixture input requires --allow-fixture and cannot export production inventory");
if (!Array.isArray(input.profiles) || input.profiles.length === 0) die("input.profiles must be a non-empty array");
if (!Number.isFinite(Date.parse(input.observedAt ?? ""))) die("input.observedAt must be an ISO timestamp from the active harness export");

const engines = input.profiles.map((profile, index) => normalizeProfile(profile, index, harness));
const identities = new Set();
for (const engine of engines) {
  const identity = [engine.harness, engine.id, engine.modelId, engine.reasoningMode].join("\u001f");
  if (identities.has(identity)) die(`duplicate exact engine identity for ${engine.id}`);
  identities.add(identity);
}

const inventory = {
  version: 1,
  ...(input.fixture === true ? { fixture: true } : {}),
  observedAt: input.observedAt,
  trust: input.trust,
  engines,
};
writeAtomically(protectedOutputPath, `${JSON.stringify(inventory, null, 2)}\n`);
