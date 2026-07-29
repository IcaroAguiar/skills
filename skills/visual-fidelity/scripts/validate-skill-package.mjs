#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const requestedRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(scriptDir, "..");
const skillRoot = fs.existsSync(requestedRoot) ? fs.realpathSync.native(requestedRoot) : requestedRoot;
const failures = [];

const MAX_SKILL_LINES = 190;
const MAX_REFERENCE_LINES = 130;
const MAX_PUBLIC_CORPUS_LINES = 1250;

const requiredScripts = [
  "scripts/scaffold-visual-fidelity.mjs",
  "scripts/run-visual-fidelity-matrix.mjs",
  "scripts/compare-ir-to-dom.mjs",
  "scripts/derive-next-actions.mjs",
  "scripts/create-executor-task-packet.mjs",
  "scripts/validate-executor-packet.mjs",
  "scripts/validate-reference-integrity.mjs",
  "scripts/validate-visual-ir-completeness.mjs",
  "scripts/validate-closeout-gate.mjs",
  "scripts/validate-fraud-proof-closeout.mjs",
  "scripts/benchmark-visual-fidelity-hardening.mjs",
  "scripts/benchmark-cheap-executor-protocol.mjs",
];

function fail(message) {
  failures.push(message);
}

function safePath(relativePath) {
  const candidate = path.resolve(skillRoot, relativePath);
  const relativeCandidate = path.relative(skillRoot, candidate);
  if (!relativeCandidate || relativeCandidate.startsWith("..") || path.isAbsolute(relativeCandidate)) {
    fail(`${relativePath} must stay under the skill root`);
    return "";
  }
  return candidate;
}

function readRequired(relativePath) {
  const fullPath = safePath(relativePath);
  if (!fullPath) return "";
  if (!fs.existsSync(fullPath)) {
    fail(`${relativePath} is missing`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function lineCount(text) {
  if (!text) return 0;
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

function expectIncludes(label, text, expected) {
  if (!text.includes(expected)) fail(`${label} must include ${JSON.stringify(expected)}`);
}

function expectNotIncludes(label, text, unexpected) {
  if (text.includes(unexpected)) fail(`${label} must not include ${JSON.stringify(unexpected)}`);
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    fail("SKILL.md frontmatter is missing");
    return { keys: [], values: {} };
  }
  const entries = [...match[1].matchAll(/^([A-Za-z0-9_-]+):\s*(.+)$/gm)];
  return {
    keys: entries.map((entry) => entry[1]),
    values: Object.fromEntries(entries.map((entry) => [entry[1], entry[2]])),
  };
}

function markdownReferences(text) {
  return [...text.matchAll(/`(references\/[^`]+\.md)`/g)].map((entry) => entry[1]);
}

function scriptReferences(text) {
  return [...text.matchAll(/(?:^|\s)(scripts\/[A-Za-z0-9._/-]+\.mjs)\b/g)].map((entry) => entry[1]);
}

function validateNoLocalPaths(label, text) {
  const slash = String.fromCharCode(47);
  for (const marker of [`${slash}Users${slash}`, `${slash}home${slash}`, `${slash}private${slash}tmp${slash}`]) {
    expectNotIncludes(label, text, marker);
  }
}

const skillText = readRequired("SKILL.md");
const frontmatter = parseFrontmatter(skillText);
if (frontmatter.keys.join(",") !== "name,description") {
  fail(`SKILL.md frontmatter keys must be exactly name,description; found ${frontmatter.keys.join(",") || "none"}`);
}
if (frontmatter.values.name !== "visual-fidelity") fail("SKILL.md frontmatter name must be visual-fidelity");

expectIncludes("SKILL.md", skillText, "Use this skill as a Visual Fidelity Harness, not as an open-ended prompt.");
expectIncludes("SKILL.md", skillText, "Never implement until source type, route/component target, viewport, execution mode, reference confidence, and iteration budget are in `state.md`.");
expectIncludes("SKILL.md", skillText, "Golden Reference Integrity");
expectIncludes("SKILL.md", skillText, "Do not send the original reference directly to a cheap executor.");
expectIncludes("SKILL.md", skillText, "Pixel diff is evidence, not final judgment.");
expectIncludes("SKILL.md", skillText, "Do not use `done`, `complete`, `ready`, or equivalent language when `canSayDone=false`.");

const listedReferences = [...new Set(markdownReferences(skillText))].sort();
const referencesDir = safePath("references");
const actualReferences = referencesDir && fs.existsSync(referencesDir)
  ? fs.readdirSync(referencesDir).filter((file) => file.endsWith(".md")).sort().map((file) => `references/${file}`)
  : [];
if (!actualReferences.length) fail("references directory has no markdown references");

for (const reference of actualReferences) {
  if (!listedReferences.includes(reference)) fail(`${reference} exists but is not listed in SKILL.md`);
}
for (const reference of listedReferences) {
  if (!actualReferences.includes(reference)) fail(`${reference} is listed in SKILL.md but missing on disk`);
}

const referenceTexts = actualReferences.map((reference) => readRequired(reference));
const publicCorpus = [skillText, ...referenceTexts].join("\n");

for (const requiredScript of requiredScripts) {
  if (!fs.existsSync(safePath(requiredScript))) fail(`${requiredScript} is missing`);
}
for (const scriptRef of new Set(scriptReferences(publicCorpus))) {
  if (!fs.existsSync(safePath(scriptRef))) fail(`${scriptRef} is referenced but missing on disk`);
}

expectIncludes("public corpus", publicCorpus, "reference manifest");
expectIncludes("public corpus", publicCorpus, "actual vs actual");
expectIncludes("public corpus", publicCorpus, "baseline updated during same execution");
expectIncludes("public corpus", publicCorpus, "packet includes open reference image");
expectIncludes("public corpus", publicCorpus, "regional rubric");
expectIncludes("public corpus", publicCorpus, "Code Connect");
expectIncludes("public corpus", publicCorpus, "browser-use first");
expectIncludes("public corpus", publicCorpus, "Cheap executors are implementation workers, not visual judges.");
validateNoLocalPaths("public corpus", publicCorpus);

const packageJson = JSON.parse(readRequired("package.json") || "{}");
if (packageJson.scripts?.validate !== "node scripts/validate-skill-package.mjs") {
  fail("package.json must expose scripts.validate");
}
if (packageJson.scripts?.benchmark !== "node scripts/benchmark-visual-fidelity-hardening.mjs") {
  fail("package.json must expose scripts.benchmark");
}

const skillLines = lineCount(skillText);
const referenceMetrics = actualReferences.map((reference, index) => ({
  file: reference,
  lines: lineCount(referenceTexts[index]),
}));
const publicCorpusLines = skillLines + referenceMetrics.reduce((sum, metric) => sum + metric.lines, 0);

if (skillLines > MAX_SKILL_LINES) fail(`SKILL.md has ${skillLines} lines; max is ${MAX_SKILL_LINES}`);
for (const metric of referenceMetrics) {
  if (metric.lines > MAX_REFERENCE_LINES) fail(`${metric.file} has ${metric.lines} lines; max is ${MAX_REFERENCE_LINES}`);
}
if (publicCorpusLines > MAX_PUBLIC_CORPUS_LINES) {
  fail(`public skill corpus has ${publicCorpusLines} lines; max is ${MAX_PUBLIC_CORPUS_LINES}`);
}

const report = {
  status: failures.length ? "failed" : "ok",
  metrics: {
    skillLines,
    publicCorpusLines,
    referenceMetrics,
    references: actualReferences.length,
    requiredScripts: requiredScripts.length,
  },
  checks: {
    frontmatter: frontmatter.keys,
    referencesRouted: true,
    requiredScriptsPresent: true,
    supportScriptsResolved: true,
    noLocalPathsInPublicCorpus: true,
    packageScriptsPresent: true,
  },
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
