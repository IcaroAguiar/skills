#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const requestedRoot = process.argv[2] ? resolve(process.argv[2]) : resolve(new URL("..", import.meta.url).pathname);
const skillRoot = existsSync(requestedRoot) ? realpathSync.native(requestedRoot) : requestedRoot;
const failures = [];
const MAX_SKILL_LINES = 160;
const MAX_REFERENCE_LINES = 180;
const MAX_PUBLIC_CORPUS_LINES = 1200;
const EXPECTED_TEMPLATES = [
  "engine-candidates.example.json",
  "harness-inventory.example.json",
  "qa-evidence.md",
  "qualification-ledger.example.json",
  "real-diff-corpus.example.json",
  "real-diff-corpus.schema.json",
  "review-loop.example.json",
  "review-loop.schema.json",
  "role-map.example.json",
];
const REQUIRED_SUPPORT = [
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
  "templates/role-map.example.json",
  "agents/openai.yaml",
];
const HARDCODED_MODEL_LITERAL = /["']?modelId["']?\s*:\s*["'](?!not_observable["'])[^"']+["']/i;
const jsonModelIdProbe = `${JSON.stringify("modelId")}: ${JSON.stringify(["opaque", "id"].join("-"))}`;
if (!HARDCODED_MODEL_LITERAL.test(jsonModelIdProbe)) failures.push("model ID guard must detect quoted JSON keys");

function fail(message) {
  failures.push(message);
}

function safePath(relativePath) {
  const path = resolve(skillRoot, relativePath);
  const local = relative(skillRoot, path);
  if (!local || local.startsWith("..") || isAbsolute(local)) {
    fail(`${relativePath} must stay under the skill root`);
    return "";
  }
  return path;
}

function readRequired(relativePath) {
  const path = safePath(relativePath);
  if (!path || !existsSync(path)) {
    fail(`${relativePath} is missing`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function lineCount(text) {
  return text ? (text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length) : 0;
}

function expectIncludes(label, text, phrase) {
  if (!text.includes(phrase)) fail(`${label} must include ${JSON.stringify(phrase)}`);
}

function expectNotIncludes(label, text, phrase) {
  if (text.includes(phrase)) fail(`${label} must not include ${JSON.stringify(phrase)}`);
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

function referencesIn(text) {
  return [...text.matchAll(/`(references\/[^`]+\.md)`/g)].map((match) => match[1]);
}

const skill = readRequired("SKILL.md");
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
const frontmatterKeys = frontmatter ? [...frontmatter[1].matchAll(/^([A-Za-z0-9_-]+):/gm)].map((match) => match[1]) : [];
if (frontmatterKeys.join(",") !== "name,description") fail(`frontmatter keys must be exactly name,description; found ${frontmatterKeys.join(",") || "none"}`);
expectIncludes("SKILL.md", skill, "name: review-loop");
for (const gate of ["CORRECTNESS", "SIMPLIFICATION", "SEMANTICS", "DOCUMENTATION", "VERIFICATION"]) expectIncludes("SKILL.md", skill, `\`${gate}\``);
for (const phrase of [
  "self-audits and stabilizes",
  "focused checks run concurrently",
  "fast-reviewer",
  "deep-reviewer",
  "delta-first",
  "There is no fixed review-pass cap",
  "does not need permission",
  "visible residuals",
  "CODE READY",
  "CHECKS GREEN",
  "FORMAL REVIEW",
  "MERGE READY",
  "External PR reviewers and providers are outside this skill and are never waited",
  "watcher",
  "no verdict or approval authority",
  "harness-native",
  "Missing role maps",
  "never a prerequisite",
]) expectIncludes("FAST contract", skill, phrase);

const actualReferences = existsSync(safePath("references"))
  ? readdirSync(safePath("references")).filter((file) => file.endsWith(".md")).sort().map((file) => `references/${file}`)
  : [];
const listedReferences = [...new Set(referencesIn(skill))].sort();
for (const reference of actualReferences) if (!listedReferences.includes(reference)) fail(`${reference} exists but is not listed in SKILL.md`);
for (const reference of listedReferences) if (!actualReferences.includes(reference)) fail(`${reference} is listed but missing`);
const referenceTexts = actualReferences.map((reference) => readRequired(reference));
const publicCorpus = [skill, ...referenceTexts].join("\n");
const referenceMetrics = actualReferences.map((file, index) => ({ file, lines: lineCount(referenceTexts[index]) }));
const skillLines = lineCount(skill);
const publicCorpusLines = skillLines + referenceMetrics.reduce((sum, metric) => sum + metric.lines, 0);
if (skillLines > MAX_SKILL_LINES) fail(`SKILL.md has ${skillLines} lines; max is ${MAX_SKILL_LINES}`);
for (const metric of referenceMetrics) if (metric.lines > MAX_REFERENCE_LINES) fail(`${metric.file} has ${metric.lines} lines; max is ${MAX_REFERENCE_LINES}`);
if (publicCorpusLines > MAX_PUBLIC_CORPUS_LINES) fail(`public skill corpus has ${publicCorpusLines} lines; max is ${MAX_PUBLIC_CORPUS_LINES}`);

for (const phrase of [
  "fresh independent",
  "CORRECTNESS",
  "SIMPLIFICATION",
  "SEMANTICS",
  "DOCUMENTATION",
  "VERIFICATION",
  "NOT_APPLICABLE",
  "residual uncertainty",
]) expectIncludes("public corpus", publicCorpus, phrase);
for (const marker of ["/Users/", "/home/", "/private/tmp/", "CODEX_DEFAULT_ENGINE_POLICY"]) expectNotIncludes("public corpus", publicCorpus, marker);
if (HARDCODED_MODEL_LITERAL.test(publicCorpus)) fail("public corpus contains a hardcoded model ID");

const actualTemplates = existsSync(safePath("templates"))
  ? readdirSync(safePath("templates")).filter((file) => !file.startsWith(".")).sort()
  : [];
if (actualTemplates.join(",") !== EXPECTED_TEMPLATES.join(",")) fail(`templates must be the routed portable set; found ${actualTemplates.join(",") || "none"}`);
for (const relativePath of REQUIRED_SUPPORT) readRequired(relativePath);
for (const template of EXPECTED_TEMPLATES) if (template.endsWith(".json")) parseJson(`templates/${template}`);

const selector = readRequired("scripts/select-review-engines.mjs");
for (const phrase of [
  '"fast-reviewer", "deep-reviewer", "fixer", "watcher"',
  "role map",
  "no exact live candidate",
  "must not be a symbolic link",
  "fallback",
  "harness-native",
  "candidateFingerprint",
  "verdictAuthority",
  "codex",
  "claude-code",
  "cursor",
  "opencode",
]) expectIncludes("selector", selector, phrase);
if (HARDCODED_MODEL_LITERAL.test(selector)) fail("selector contains a hardcoded model ID");
for (const forbidden of ["CODEX_DEFAULT_ENGINE_POLICY", "reviewerCostCeilingUsd"]) expectNotIncludes("selector", selector, forbidden);

const selectorTests = readRequired("scripts/test-engine-selection.mjs");
for (const phrase of ["fast-reviewer", "deep-reviewer", "fixer", "watcher", "codex", "claude-code", "cursor", "opencode", "runNative", "harness-native", "no-ranking-fallback", "watcher-no-authority", "role-map-symlink"]) expectIncludes("selector tests", selectorTests, phrase);
if (HARDCODED_MODEL_LITERAL.test(selectorTests)) fail("selector tests contain a hardcoded model ID");

const roleMap = parseJson("templates/role-map.example.json");
if (!roleMap.mappings || !roleMap.mappings.codex) fail("role-map.example.json must show a protected codex mapping");
for (const role of ["fast-reviewer", "deep-reviewer", "fixer", "watcher"]) if (!roleMap.mappings.codex[role]) fail(`role-map.example.json is missing ${role}`);
const openai = readRequired("agents/openai.yaml");
expectIncludes("agents/openai.yaml", openai, "display_name: \"Review Loop\"");
expectIncludes("agents/openai.yaml", openai, "$review-loop");
expectIncludes("agents/openai.yaml", openai, "allow_implicit_invocation: true");

const result = {
  status: failures.length ? "failed" : "ok",
  metrics: { skillLines, publicCorpusLines, referenceMetrics },
  checks: {
    frontmatter: frontmatterKeys,
    references: actualReferences,
    mandatoryGates: 5,
    fastDefault: true,
    autonomousCriticalHighCorrection: true,
    portableNativeRoles: true,
    protectedOverrides: true,
    noHardcodedModelIds: true,
    externalWatcherHasNoVerdictAuthority: true,
    freshIndependentApproval: true,
  },
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
