#!/usr/bin/env node
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const TRUSTED_SOURCES = new Set(["protected-harness-config", "trusted-base-artifact"]);
const MAX_CLOCK_SKEW_MS = 60 * 60 * 1000;
const DEFAULT_MAX_INVENTORY_AGE_HOURS = 24;

function option(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function has(name) {
  return args.includes(name);
}

function die(message) {
  console.error(`review-forge registry composition failed: ${message}`);
  process.exit(1);
}

function readJson(label, path) {
  if (!path || !existsSync(path)) die(`${label} file is missing`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    die(`${label} is invalid JSON: ${error.message}`);
  }
}

function requireTrust(label, value) {
  if (!value || typeof value !== "object" || !TRUSTED_SOURCES.has(value.sourceClass)) {
    die(`${label}.trust must use protected-harness-config or trusted-base-artifact`);
  }
  if (typeof value.identifier !== "string" || !value.identifier.trim()) {
    die(`${label}.trust.identifier must be non-empty`);
  }
}

function requireIdentity(label, value) {
  for (const field of ["harness", "id", "modelId", "reasoningMode"]) {
    if (typeof value?.[field] !== "string" || !value[field].trim()) {
      die(`${label}.${field} must be a non-empty observed value or not_observable`);
    }
  }
}

function identity(value) {
  return [value.harness, value.id, value.modelId, value.reasoningMode].join("\u001f");
}

function isInside(root, path) {
  const local = relative(root, path);
  return !local || (!local.startsWith("..") && !isAbsolute(local));
}

function lexicalBoundaryPath(path) {
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

function canonicalBoundaryPath(label, path, { mustExist = true } = {}) {
  const lexicalPath = lexicalBoundaryPath(path);
  if (existsSync(lexicalPath)) return realpathSync.native(lexicalPath);
  if (mustExist) return lexicalPath;
  const parent = dirname(lexicalPath);
  if (!existsSync(parent)) die(`${label} parent directory does not exist`);
  return resolve(realpathSync.native(parent), basename(lexicalPath));
}

function rejectCandidateRepositoryPath(label, path, options) {
  const lexicalPath = lexicalBoundaryPath(path);
  if (label === "output" && isSymbolicLink(lexicalPath)) die("output must not be a symbolic link");
  const canonicalPath = canonicalBoundaryPath(label, path, options);
  if (isInside(candidateRootLexical, lexicalPath) || isInside(candidateRootCanonical, canonicalPath)) {
    die(`${label} must stay outside the candidate repository`);
  }
  return { lexicalPath, canonicalPath };
}

function writeAtomically(path, serialized) {
  if (isSymbolicLink(path)) {
    die("output must not be a symbolic link");
  }
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
  console.log(`review-forge registry composition

Usage:
  node compose-engine-registry.mjs --inventory <protected-json> --qualifications <protected-json>
    --reviewer-cost-ceiling-usd <positive-number> [--candidate-root <repo>]
    [--output <protected-json>] [--allow-fixture]

The active harness exports only profiles it currently exposes. This command
joins each exact harness/profile/model/reasoning identity to protected benchmark
evidence. Candidate-repository files are not trusted inventory or qualification
sources.`);
  process.exit(0);
}

const inventoryPath = option("--inventory");
const qualificationPath = option("--qualifications");
const outputPath = option("--output");
const candidateRootLexical = lexicalBoundaryPath(option("--candidate-root", process.cwd()));
if (!existsSync(candidateRootLexical)) die("--candidate-root must exist");
const candidateRootCanonical = realpathSync.native(candidateRootLexical);
const ceiling = Number(option("--reviewer-cost-ceiling-usd"));
const maxInventoryAgeHours = Number(option("--max-inventory-age-hours", String(DEFAULT_MAX_INVENTORY_AGE_HOURS)));
if (!Number.isFinite(ceiling) || ceiling <= 0) die("--reviewer-cost-ceiling-usd must be a finite positive number");
if (!Number.isFinite(maxInventoryAgeHours) || maxInventoryAgeHours <= 0) die("--max-inventory-age-hours must be a finite positive number");
for (const [label, path, mustExist] of [["inventory", inventoryPath, true], ["qualifications", qualificationPath, true], ["output", outputPath, false]]) {
  if (path) rejectCandidateRepositoryPath(label, path, { mustExist });
}

const inventory = readJson("inventory", inventoryPath);
const qualifications = readJson("qualifications", qualificationPath);
requireTrust("inventory", inventory.trust);
requireTrust("qualifications", qualifications.trust);

const fixture = inventory.fixture === true || qualifications.fixture === true;
if (fixture && !has("--allow-fixture")) die("fixture inputs require --allow-fixture and cannot select production engines");
if (!Array.isArray(inventory.engines) || inventory.engines.length === 0) die("inventory.engines must be a non-empty array");
if (!Array.isArray(qualifications.records) || qualifications.records.length === 0) die("qualifications.records must be a non-empty array");

const observedAt = Date.parse(inventory.observedAt ?? "");
const ageMs = Date.now() - observedAt;
if (!fixture && (!Number.isFinite(observedAt) || ageMs < -MAX_CLOCK_SKEW_MS || ageMs > maxInventoryAgeHours * 60 * 60 * 1000)) {
  die("inventory is missing, stale, or dated in the future; export it again from the active harness");
}

const records = new Map();
for (const [index, record] of qualifications.records.entries()) {
  requireIdentity(`qualifications.records[${index}]`, record);
  const key = identity(record);
  if (records.has(key)) die(`duplicate qualification identity for ${record.harness}/${record.id}`);
  if (!record.qualification || typeof record.qualification !== "object") die(`qualification is missing for ${record.harness}/${record.id}`);
  records.set(key, record.qualification);
}

const seen = new Set();
const candidates = inventory.engines.map((engine, index) => {
  requireIdentity(`inventory.engines[${index}]`, engine);
  const key = identity(engine);
  if (seen.has(key)) die(`duplicate inventory identity for ${engine.harness}/${engine.id}`);
  seen.add(key);
  const qualification = records.get(key);
  if (!qualification) {
    die(`no exact protected qualification for ${engine.harness}/${engine.id}/${engine.modelId}/${engine.reasoningMode}`);
  }
  if (!Array.isArray(engine.roles) || engine.roles.length === 0) die(`roles are missing for ${engine.harness}/${engine.id}`);
  return {
    id: engine.id,
    harness: engine.harness,
    modelId: engine.modelId,
    roles: engine.roles,
    reasoningMode: engine.reasoningMode,
    capabilities: engine.capabilities,
    cost: engine.cost,
    qualification,
  };
});

const registry = {
  version: 1,
  ...(fixture ? { fixture: true } : {}),
  observedAt: inventory.observedAt,
  trust: {
    sourceClass: inventory.trust.sourceClass,
    identifier: `${inventory.trust.identifier}+${qualifications.trust.identifier}`,
  },
  policy: { reviewerCostCeilingUsd: ceiling },
  candidates,
};

const serialized = `${JSON.stringify(registry, null, 2)}\n`;
if (outputPath) {
  writeAtomically(lexicalBoundaryPath(outputPath), serialized);
} else {
  process.stdout.write(serialized);
}
