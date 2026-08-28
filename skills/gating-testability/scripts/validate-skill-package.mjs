#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const TEXT_ENCODING = "utf8";
const FRONTMATTER_KEYS = ["name", "description"];
const REQUIRED_FILES = [
  "references/obligation-matrix.md",
  "references/test-quality-calibration.md",
  "references/browser-visual-evidence.md",
  "references/ci-monorepo-gates.md",
  "references/code-review-integration.md",
  "references/pressure-tests.md",
  "references/research-notes.md",
  "agents/openai.yaml",
  "tests/smoke-pressure-scenarios.test.mjs",
];
const MATRIX_COLUMNS = [
  "Obligation",
  "Level",
  "Required",
  "Existing coverage",
  "Execution",
  "Result",
  "Evidence",
  "Residual risk",
];
const GATE_STATUSES = ["PASS", "PASS_WITH_RISK", "BLOCKED", "FAIL"];
const QUALITY_SECTIONS = [
  "Regression-First",
  "Coverage Rule",
  "Flake Rule",
  "Negative And Boundary Evidence",
  "Promotion Rule",
];
const BROWSER_TERMS = ["semantic", "auto-waiting", "Screenshots", "Accessibility", "real browser"];
const CI_TERMS = ["Microservice", "Monorepo", "affected", "Artifacts", "CI"];
const PRESSURE_SCENARIOS = [
  "Targeted-Only",
  "UI Change",
  "Bugfix Without Regression",
  "Auth Boundary",
  "Flaky",
  "Contract Change",
];

function read(rel) {
  return readFileSync(join(root, rel), TEXT_ENCODING);
}

function assert(condition, message) {
  if (!condition) {
    process.stderr.write(`FAIL: ${message}\n`);
    process.exitCode = 1;
  }
}

const skill = read("SKILL.md");
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
assert(frontmatter, "SKILL.md must start with YAML frontmatter");

if (frontmatter) {
  const keys = frontmatter[1]
    .split("\n")
    .filter((line) => /^[A-Za-z0-9_-]+:/.test(line))
    .map((line) => line.split(":")[0]);
  assert(
    keys.join(",") === FRONTMATTER_KEYS.join(","),
    `frontmatter keys must be exactly name,description; got ${keys.join(",")}`,
  );
}

assert(skill.length < 9000, "SKILL.md should remain concise; move detail into references");
assert(skill.includes("Test Obligation Matrix"), "SKILL.md must require the Test Obligation Matrix");
assert(skill.includes("Final Testability Gate Result") || skill.includes("Testability gate:"), "SKILL.md must define final gate output");
assert(skill.includes("code-review"), "SKILL.md must explain code-review integration");
assert(skill.includes("browser evidence"), "SKILL.md must require browser evidence for UI/visual work");

for (const file of REQUIRED_FILES) {
  assert(existsSync(join(root, file)), `${file} must exist`);
}

const matrix = read("references/obligation-matrix.md");
for (const term of MATRIX_COLUMNS) {
  assert(matrix.includes(term), `obligation matrix must include ${term}`);
}
for (const status of GATE_STATUSES) {
  assert(matrix.includes(status), `obligation matrix must define ${status}`);
}

const quality = read("references/test-quality-calibration.md");
for (const term of QUALITY_SECTIONS) {
  assert(quality.includes(term), `test quality calibration must include ${term}`);
}

const browser = read("references/browser-visual-evidence.md");
for (const term of BROWSER_TERMS) {
  assert(browser.toLowerCase().includes(term.toLowerCase()), `browser reference must include ${term}`);
}

const ci = read("references/ci-monorepo-gates.md");
for (const term of CI_TERMS) {
  assert(ci.toLowerCase().includes(term.toLowerCase()), `CI reference must include ${term}`);
}

const pressure = read("references/pressure-tests.md");
for (const term of PRESSURE_SCENARIOS) {
  assert(pressure.includes(term), `pressure tests must include ${term}`);
}

const openai = read("agents/openai.yaml");
assert(openai.includes("allow_implicit_invocation: true"), "openai.yaml must allow implicit invocation");

if (!process.exitCode) {
  process.stdout.write("PASS: gating-testability package checks passed\n");
}
