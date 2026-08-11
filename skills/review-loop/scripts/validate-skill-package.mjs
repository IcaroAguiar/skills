#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const requestedRoot = process.argv[2] ? resolve(process.argv[2]) : resolve(scriptDir, "..");
const skillRoot = existsSync(requestedRoot) ? realpathSync.native(requestedRoot) : requestedRoot;
const failures = [];
const MAX_SKILL_LINES = 180;
const MAX_REFERENCE_LINES = 180;
const MAX_PUBLIC_CORPUS_LINES = 1_200;
const EXPECTED_TEMPLATES = [
  "engine-candidates.example.json",
  "harness-inventory.example.json",
  "qa-evidence.md",
  "qualification-ledger.example.json",
  "real-diff-corpus.example.json",
  "real-diff-corpus.schema.json",
  "review-loop.example.json",
  "review-loop.schema.json",
];

function fail(message) {
  failures.push(message);
}

function safePath(relativePath) {
  const candidate = resolve(skillRoot, relativePath);
  const relativeCandidate = relative(skillRoot, candidate);
  if (!relativeCandidate || relativeCandidate.startsWith("..") || isAbsolute(relativeCandidate)) {
    fail(`${relativePath} must stay under the skill root`);
    return "";
  }
  return candidate;
}

function readRequired(relativePath) {
  const path = safePath(relativePath);
  if (!path || !existsSync(path)) {
    fail(`${relativePath} is missing`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function expectIncludes(label, text, expected) {
  if (!text.includes(expected)) fail(`${label} must include ${JSON.stringify(expected)}`);
}

function expectNotIncludes(label, text, unexpected) {
  if (text.includes(unexpected)) fail(`${label} must not include ${JSON.stringify(unexpected)}`);
}

function lineCount(text) {
  if (!text) return 0;
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

function parseJson(relativePath) {
  const text = readRequired(relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath} is invalid JSON: ${error.message}`);
    return {};
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    fail("SKILL.md frontmatter is missing");
    return [];
  }
  return [...match[1].matchAll(/^([A-Za-z0-9_-]+):\s*(.+)$/gm)].map((entry) => entry[1]);
}

function listedReferences(text) {
  return [...text.matchAll(/`(references\/[^`]+\.md)`/g)].map((entry) => entry[1]);
}

function referencedSupportFiles(text) {
  return [...text.matchAll(/`((?:templates|scripts)\/[^`\s]+)`/g)].map((entry) => entry[1]);
}

const skillText = readRequired("SKILL.md");
const frontmatterKeys = parseFrontmatter(skillText);
if (frontmatterKeys.join(",") !== "name,description") {
  fail(`frontmatter keys must be exactly name,description; found ${frontmatterKeys.join(",") || "none"}`);
}
expectIncludes("SKILL.md", skillText, "name: review-loop");
for (const gate of ["CORRECTNESS", "SIMPLIFICATION", "SEMANTICS", "DOCUMENTATION", "VERIFICATION"]) {
  expectIncludes("SKILL.md", skillText, `\`${gate}\``);
}
for (const phrase of [
  "highest-sustainable qualified reviewer",
  "cheapest qualified fixer",
  "reviewer `gpt-5.6-sol`/`high`",
  "fixer `gpt-5.6-luna`/`xhigh|max`",
  "fresh, read-only reviewer",
  "fixing agent must never approve",
  "In a review-only task, return the findings without",
  "verdict never survives a changed candidate identity",
]) {
  expectIncludes("SKILL.md", skillText, phrase);
}

const actualReferences = existsSync(safePath("references"))
  ? readdirSync(safePath("references")).filter((file) => file.endsWith(".md")).sort().map((file) => `references/${file}`)
  : [];
const listed = [...new Set(listedReferences(skillText))].sort();
for (const reference of actualReferences) {
  if (!listed.includes(reference)) fail(`${reference} exists but is not listed in SKILL.md`);
}
for (const reference of listed) {
  if (!actualReferences.includes(reference)) fail(`${reference} is listed but missing`);
}

const referenceTexts = actualReferences.map((reference) => readRequired(reference));
const publicCorpus = [skillText, ...referenceTexts].join("\n");
const skillLines = lineCount(skillText);
const referenceMetrics = actualReferences.map((file, index) => ({ file, lines: lineCount(referenceTexts[index]) }));
const publicCorpusLines = skillLines + referenceMetrics.reduce((sum, referenceMetric) => sum + referenceMetric.lines, 0);
if (skillLines > MAX_SKILL_LINES) fail(`SKILL.md has ${skillLines} lines; max is ${MAX_SKILL_LINES}`);
for (const referenceMetric of referenceMetrics) {
  if (referenceMetric.lines > MAX_REFERENCE_LINES) fail(`${referenceMetric.file} has ${referenceMetric.lines} lines; max is ${MAX_REFERENCE_LINES}`);
}
if (publicCorpusLines > MAX_PUBLIC_CORPUS_LINES) {
  fail(`public skill corpus has ${publicCorpusLines} lines; max is ${MAX_PUBLIC_CORPUS_LINES}`);
}

for (const [label, phrase] of [
  ["correctness", "compatibility"],
  ["simplification", "Prefer deleting incidental complexity"],
  ["semantics", "roadmap phases"],
  ["documentation", "NOT_APPLICABLE"],
  ["engine selection", "Cheapest` never means cheapest overall"],
  ["engine adapters", "exact tuple `harness`, profile `id`, `modelId`, and"],
  ["benchmark", "at least 18 adjudicated merged PR cases"],
  ["benchmark", "accepted-state false blocker rate"],
  ["reviewer contract", "The fixer must not approve"],
  ["reviewer contract", "When the user requested review only"],
]) {
  expectIncludes(label, publicCorpus, phrase);
}

for (const relativePath of new Set(referencedSupportFiles(publicCorpus))) {
  const path = safePath(relativePath);
  if (path && !existsSync(path)) fail(`${relativePath} is referenced but missing`);
}
const actualTemplates = existsSync(safePath("templates"))
  ? readdirSync(safePath("templates")).filter((file) => !file.startsWith(".")).sort()
  : [];
if (actualTemplates.join(",") !== EXPECTED_TEMPLATES.join(",")) {
  fail(`templates must be the routed minimal set; found ${actualTemplates.join(",") || "none"}`);
}
for (const marker of ["/Users/", "/home/", "/private/tmp/"]) {
  expectNotIncludes("public corpus", publicCorpus, marker);
}

for (const requiredPath of [
  "scripts/collect-review-context.mjs",
  "scripts/compose-engine-registry.mjs",
  "scripts/select-review-engines.mjs",
  "scripts/fingerprint-review-state.mjs",
  "scripts/validate-real-diff-corpus.mjs",
  "scripts/smoke-review-toolbelt.mjs",
  "scripts/test-engine-selection.mjs",
  "scripts/test-harness-adapters.mjs",
  "scripts/test-quality-gate-ratchet.mjs",
  "scripts/test-real-diff-corpus.mjs",
  "scripts/test-real-diff-remote.mjs",
  "scripts/test-review-state-fingerprint.mjs",
  "scripts/test-smoke-cleanup.mjs",
  "templates/engine-candidates.example.json",
  "templates/harness-inventory.example.json",
  "templates/qualification-ledger.example.json",
  "templates/real-diff-corpus.schema.json",
  "templates/real-diff-corpus.example.json",
  "templates/review-loop.schema.json",
  "templates/review-loop.example.json",
  "agents/openai.yaml",
]) {
  readRequired(requiredPath);
}

const openaiText = readRequired("agents/openai.yaml");
expectIncludes("agents/openai.yaml", openaiText, "display_name: \"Review Loop\"");
expectIncludes("agents/openai.yaml", openaiText, "$review-loop");
expectIncludes("agents/openai.yaml", openaiText, "allow_implicit_invocation: true");

const selectorText = readRequired("scripts/select-review-engines.mjs");
for (const phrase of ["CODEX_DEFAULT_ENGINE_POLICY", "gpt-5.6-sol", "gpt-5.6-luna", "reasoningModes: [\"xhigh\", \"max\"]", "reviewerCostCeilingUsd", "no qualified", "premium candidate requires a non-empty --premium-reason", "fixture registry cannot select production engines", "lowest expected total cost among qualified capable fixers"]) {
  expectIncludes("select-review-engines.mjs", selectorText, phrase);
}
const composerText = readRequired("scripts/compose-engine-registry.mjs");
for (const phrase of ["no exact protected qualification", "fixture inputs require --allow-fixture", "Candidate-repository files are not trusted"]) {
  expectIncludes("compose-engine-registry.mjs", composerText, phrase);
}
const corpusValidatorText = readRequired("scripts/validate-real-diff-corpus.mjs");
for (const phrase of ["promotion requires at least 18 cases", "promotion requires at least six", "hidden adjudication artifact"]) {
  expectIncludes("validate-real-diff-corpus.mjs", corpusValidatorText, phrase);
}

const configSchema = parseJson("templates/review-loop.schema.json");
if (configSchema.title !== "Review Loop Config") fail("review-loop.schema.json title is stale");
const configExample = parseJson("templates/review-loop.example.json");
if (configExample.$schema !== "./review-loop.schema.json") fail("review-loop.example.json must use the local schema");
parseJson("templates/engine-candidates.example.json");
parseJson("templates/harness-inventory.example.json");
parseJson("templates/qualification-ledger.example.json");
parseJson("templates/real-diff-corpus.schema.json");
parseJson("templates/real-diff-corpus.example.json");

const result = {
  status: failures.length ? "failed" : "ok",
  metrics: { skillLines, publicCorpusLines, referenceMetrics },
  checks: {
    frontmatter: frontmatterKeys,
    references: actualReferences,
    mandatoryGates: 5,
    portableEnginePolicy: true,
    realDiffPolicy: true,
  },
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
