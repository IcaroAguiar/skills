#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const failures = [];
const requestedRoot = process.argv[2] ? resolve(process.argv[2]) : resolve(scriptDir, "..");
const skillRoot = existsSync(requestedRoot) ? realpathSync.native(requestedRoot) : requestedRoot;
const referencesDir = safePath("references");

const MAX_SKILL_LINES = 180;
const MAX_REFERENCE_LINES = 140;
const MAX_PUBLIC_CORPUS_LINES = 540;

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

function readRequired(relativePath, label) {
  const path = safePath(relativePath);
  if (!path) return "";
  if (!existsSync(path)) {
    fail(`${label} is missing`);
    return "";
  }
  return readFileSync(path, "utf8");
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
    return [];
  }
  return [...match[1].matchAll(/^([A-Za-z0-9_-]+):\s*(.+)$/gm)].map((entry) => entry[1]);
}

function listedReferences(text) {
  return [...text.matchAll(/`(references\/[^`]+\.md)`/g)].map((entry) => entry[1]);
}

function referencedSupportFiles(text) {
  return [...text.matchAll(/`((?:templates|scripts)\/[^`]+)`/g)].map((entry) => entry[1]);
}

function validateReferences(skillText) {
  if (!existsSync(referencesDir)) {
    fail("references directory is missing");
    return [];
  }

  const actual = readdirSync(referencesDir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => `references/${file}`);
  const listed = [...new Set(listedReferences(skillText))].sort();

  for (const reference of actual) {
    if (!listed.includes(reference)) fail(`${reference} exists but is not listed in SKILL.md`);
  }
  for (const reference of listed) {
    if (!actual.includes(reference)) fail(`${reference} is listed in SKILL.md but missing on disk`);
  }
  return actual;
}

function validateSupportReferences(publicTexts) {
  const corpus = publicTexts.join("\n");
  for (const relativePath of new Set(referencedSupportFiles(corpus))) {
    const fullPath = safePath(relativePath);
    if (!fullPath) continue;
    if (!existsSync(fullPath)) fail(`${relativePath} is referenced but missing on disk`);
  }
}

function validateNoLocalPaths(label, text) {
  const slash = String.fromCharCode(47);
  const forbidden = [
    `${slash}Users${slash}`,
    `${slash}home${slash}`,
    `${slash}private${slash}tmp${slash}`,
  ];
  for (const marker of forbidden) expectNotIncludes(label, text, marker);
}

const skillText = readRequired("SKILL.md", "SKILL.md");
const frontmatterKeys = parseFrontmatter(skillText);
if (frontmatterKeys.join(",") !== "name,description") {
  fail(`SKILL.md frontmatter keys must be exactly name,description; found ${frontmatterKeys.join(",") || "none"}`);
}

expectIncludes("SKILL.md", skillText, "The deterministic collector is tool support for the reviewer. It is not the gate by itself.");
expectIncludes("SKILL.md", skillText, "one independent reviewer subagent");
expectIncludes("SKILL.md", skillText, "Do not bulk-load references by default.");
expectIncludes("SKILL.md", skillText, "## Definition Of Done Checklist");
expectIncludes("SKILL.md", skillText, "The deterministic hardening-agentic-code packet is clean, but the full hardening-agentic-code gate is incomplete");
expectIncludes("SKILL.md", skillText, "node ~/.agents/skills/hardening-agentic-code/scripts/smoke-review-toolbelt.mjs");

const referenceFiles = validateReferences(skillText);
const referenceTexts = referenceFiles.map((reference) => readRequired(reference, reference));
const publicCorpus = [skillText, ...referenceTexts].join("\n");

const skillLines = lineCount(skillText);
const referenceMetrics = referenceFiles.map((reference, index) => ({
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

expectIncludes("references/review-focus.md", publicCorpus, "When deterministic output is noisy, prioritize semantic and behavioral issues over style/context signals.");
expectIncludes("references/quality-gate-ratchet.md", publicCorpus, "Clean as You Code");
expectIncludes("references/quality-gate-ratchet.md", publicCorpus, "GitHub Actions Workflow Requirements");
expectIncludes("references/quality-gate-ratchet.md", publicCorpus, "concurrency");
expectIncludes("references/quality-gate-ratchet.md", publicCorpus, "minimal `permissions`");
expectIncludes("references/quality-gate-ratchet.md", publicCorpus, "persistent table comment");
expectIncludes("references/quality-gate-ratchet.md", publicCorpus, "PR changed-line coverage");
expectIncludes("references/runtime-proof-and-qa.md", publicCorpus, "do not accept \"login failed\" or \"stopped at login\" as sufficient evidence");
expectIncludes("references/reviewer-contract.md", publicCorpus, "Required Reviewer Input");
expectIncludes("references/maintainability-pressure.md", publicCorpus, "Passing tests are not enough when the diff clearly makes future behavior harder to reason about.");
expectIncludes("SKILL.md", skillText, "Test Obligation Matrix exists when material behavior changed");
expectIncludes("public corpus", publicCorpus, "calibration feedback insights");
expectIncludes("public corpus", publicCorpus, "False-negative detection");
validateNoLocalPaths("public corpus", publicCorpus);
validateSupportReferences([skillText, ...referenceTexts]);

const smokeRelativePath = "scripts/smoke-review-toolbelt.mjs";
const smokeText = readRequired(smokeRelativePath, basename(smokeRelativePath));
expectIncludes("smoke-review-toolbelt.mjs", smokeText, "skillCorpus");
expectIncludes("smoke-review-toolbelt.mjs", smokeText, "referenceFiles");
expectIncludes("smoke-review-toolbelt.mjs", smokeText, "self-scan-noise-budget");
expectIncludes("smoke-review-toolbelt.mjs", smokeText, "no-local-user-paths");

const openaiText = readRequired("agents/openai.yaml", "agents/openai.yaml");
expectIncludes("agents/openai.yaml", openaiText, "allow_implicit_invocation: true");

const generatorText = readRequired("scripts/generate-quality-gate-ratchet.mjs", "generate-quality-gate-ratchet.mjs");
expectIncludes("generate-quality-gate-ratchet.mjs", generatorText, "post-pr-comment.mjs");
expectIncludes("generate-quality-gate-ratchet.mjs", generatorText, "PR test coverage");
expectIncludes("generate-quality-gate-ratchet.mjs", generatorText, "Global test coverage");
expectIncludes("generate-quality-gate-ratchet.mjs", generatorText, "| Verificacao | Referencia/base | Medido nesta PR | Regra do gate | Diferenca/tempo | Decisao |");
expectIncludes("generate-quality-gate-ratchet.mjs", generatorText, "<!-- agentic-quality-gate -->");

const result = {
  status: failures.length ? "failed" : "ok",
  metrics: {
    skillLines,
    publicCorpusLines,
    referenceMetrics,
  },
  checks: {
    frontmatter: frontmatterKeys,
    references: referenceFiles,
    supportReferencesChecked: true,
    publicCorpusHasNoLocalPaths: true,
    smokeProtectsPublicContract: true,
  },
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
