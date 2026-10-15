#!/usr/bin/env node
// End-to-end contract for review-t0 on throwaway repositories.
// Needs git, node, npm, gitleaks and semgrep; osv-scanner is not exercised (network).

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script = resolve(dirname(fileURLToPath(import.meta.url)), "review-t0.mjs");
const workspace = mkdtempSync(join(tmpdir(), "review-t0-fixture-"));
let repo = "";

function sh(command, args) {
  const result = spawnSync(command, args, { cwd: repo, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function write(file, content) {
  mkdirSync(dirname(join(repo, file)), { recursive: true });
  writeFileSync(join(repo, file), content);
}

function newRepo(name) {
  repo = join(workspace, name);
  mkdirSync(repo);
  sh("git", ["init", "-q", "-b", "main"]);
  // Hostile user settings that must not change what T0 sees.
  for (const [key, value] of [["user.email", "t0@example.invalid"], ["user.name", "t0 fixture"], ["commit.gpgsign", "false"], ["diff.noprefix", "true"], ["diff.mnemonicPrefix", "true"]]) {
    sh("git", ["config", key, value]);
  }
}

function commit(message) {
  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-q", "--no-verify", "-m", message]);
}

function reviewT0(args = [], env = {}) {
  const reportPath = join(workspace, "report.json");
  rmSync(reportPath, { force: true });
  const result = spawnSync(process.execPath, [script, "-C", repo, "--json", reportPath, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  const raw = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
  return { ...result, output: result.stdout + result.stderr, report: raw ? JSON.parse(raw) : null, raw };
}

function located(report) {
  return report.findings.map((finding) => `${finding.rule}@${finding.file}:${finding.line ?? ""}`);
}

const silentCatch = "export async function f() {\n  try {\n    return await load();\n  } catch {\n    return [];\n  }\n}\n";
// Built at runtime so this file never contains a credential-shaped literal.
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const key = (seed) => `AKIA${Array.from({ length: 16 }, (_, index) => alphabet[(index * 7 + seed) % alphabet.length]).join("")}`;

try {
  // ---- main scenario: scanners, checks, skips -------------------------------
  newRepo("main");
  write("package.json", `${JSON.stringify({
    name: "fixture",
    private: true,
    scripts: {
      typecheck: "node -e \"process.exit(0)\"",
      lint: "node lint.mjs",
      "lint:fix": "biome check --write .",
      "lint:smells": "node -e \"process.exit(0)\"",
      "lint:smells:update": "node -e \"process.exit(0)\"",
      "lint:baseline": "node ratchet.mjs --update",
      "lint:snap": "jest --updateSnapshot",
      "lint:all": "npm run lint:fixit",
      "lint:fixit": "node writer.mjs --fix",
      "lint:structure": "npm run lint:deps && npm run lint:size",
      "lint:deps": "node -e \"process.exit(0)\"",
      "lint:size": "node -e \"process.env.T0_SNEAKY && require('fs').appendFileSync('src/app.ts', '// touched\\n')\"",
    },
    dependencies: { left: "1.0.0" },
  }, null, 2)}\n`);
  write("package-lock.json", "{}\n");
  write(".gitattributes", "package-lock.json -diff\n");
  write("lint.mjs", "import { readFileSync } from 'node:fs';\nif (readFileSync('src/app.ts', 'utf8').includes('LINT_FAIL')) { console.error('lint: LINT_FAIL found'); process.exit(1); }\n");
  write("src/app.ts", silentCatch);
  write("src/legacy.ts", silentCatch);
  commit("base");

  const noChanges = reviewT0();
  assert.equal(noChanges.status, 0, noChanges.output);
  assert.match(noChanges.output, /nothing to check/);
  assert.equal(noChanges.report?.verdict, "PASS", "a report is written even without changes");

  sh("git", ["checkout", "-q", "-b", "feature"]);
  write("src/app.ts", `${silentCatch}export async function capabilities() {\n  try {\n    return await load();\n  } catch {\n    return EMPTY;\n  }\n}\n// LINT_FAIL\n`);
  write("src/cache.ts", "const byTenant = new Map();\nexport function remember(id, value) {\n  byTenant.set(id, value);\n}\n");
  write("src/evicting.ts", "const byTenant = new Map();\nexport function remember(id, value) {\n  byTenant.set(id, value);\n}\nexport function forget(id) {\n  byTenant.delete(id);\n}\n");
  write("src/unrelated-delete.ts", "const byTenant = new Map();\nexport function remember(id, value) {\n  byTenant.set(id, value);\n}\nexport async function drop(id) {\n  await prisma.user.delete({ where: { id } });\n}\n");
  write("src/app.test.ts", silentCatch);
  write("src/my file.ts", silentCatch);
  write("src/--config=nope.ts", silentCatch);
  write(".semgrepignore", "# generated\n**/generated/\n");
  write("src/generated/client.ts", silentCatch);
  write("src/docs.test.ts", "const update = process.env.UPDATE_API_DOCS === '1';\n");
  write("src/poll.ts", "export const every = process.env.UPDATE_INTERVAL;\n");
  write("src/removed.ts", `export const leaked = "${key(5)}";\n`);
  commit("feature");
  rmSync(join(repo, "src/removed.ts"));
  commit("remove leaked key");
  // Uncommitted and untracked work is part of the review.
  write("src/config.ts", `export const awsAccessKeyId = "${key(3)}";\n`);
  write("build/secret.ts", `export const buildKey = "${key(11)}";\n`);
  write("src/ignored.ts", `export const fixtureKey = "${key(13)}";\n`);
  write(".gitleaksignore", "src/ignored.ts:aws-access-token:1\n");
  write("notes.md", "<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature\n");
  const manifest = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
  manifest.dependencies.right = "2.0.0";
  write("package.json", `${JSON.stringify(manifest, null, 2)}\n`);
  write("package-lock.json", "{\"lockfileVersion\": 3}\n");

  const blocked = reviewT0([], { T0_SNEAKY: "" });
  assert.equal(blocked.status, 1, blocked.output);
  const { report } = blocked;
  assert.equal(report.verdict, "BLOCKED");
  assert.equal(report.base.ref, "main");
  const rules = located(report);
  const has = (entry) => assert.ok(rules.includes(entry), `missing ${entry}\n${rules.join("\n")}`);
  const lacks = (fragment, why) => assert.ok(!rules.some((rule) => rule.includes(fragment)), `${why}\n${rules.join("\n")}`);
  has("silent-catch-default@src/app.ts:9");
  lacks("src/app.ts:2", "pre-existing code must not be reported");
  lacks("src/legacy.ts", "untouched files must not be reported");
  lacks("src/app.test.ts", "rule path exclusions apply");
  has("silent-catch-default@src/my file.ts:2");
  has("silent-catch-default@src/--config=nope.ts:2");
  lacks("src/generated/", ".semgrepignore applies to explicit targets");
  has("unbounded-module-cache@src/cache.ts:3");
  lacks("src/evicting.ts", "eviction on the same receiver suppresses");
  has("unbounded-module-cache@src/unrelated-delete.ts:3");
  has("regen-flag-without-ci-guard@src/docs.test.ts:1");
  lacks("src/poll.ts", "regeneration flags only matter in tests and scripts");
  has("conflict-marker@notes.md:1");
  lacks("manifest-without-lockfile", "a lockfile hidden by -diff still counts as changed");
  for (const file of ["src/config.ts", "build/secret.ts", "src/removed.ts"]) {
    const secret = report.findings.find((finding) => finding.source === "gitleaks" && finding.file === file);
    assert.equal(secret?.severity, "error", `secret in ${file} must block\n${rules.join("\n")}`);
  }
  assert.match(report.findings.find((finding) => finding.file === "src/removed.ts").message, /branch history/);
  lacks("src/ignored.ts", ".gitleaksignore fingerprints apply");
  for (const seed of [3, 5, 11, 13]) assert.ok(!blocked.output.includes(key(seed)) && !blocked.raw.includes(key(seed)), "secret values never leave the scanner");

  const checks = Object.fromEntries(report.checks.map((check) => [check.name, check.status]));
  assert.deepEqual(checks, { typecheck: "pass", lint: "fail", "lint:smells": "pass", "lint:structure": "pass" });
  for (const mutating of ["lint:fix", "lint:smells:update", "lint:baseline", "lint:snap", "lint:all"]) {
    assert.ok(report.skippedChecks.some((skipped) => skipped.startsWith(`${mutating} `)), `${mutating} must never run\n${report.skippedChecks.join("\n")}`);
  }
  assert.match(blocked.output, /lint: LINT_FAIL found/);

  const sneaky = reviewT0(["--no-tests"], { T0_SNEAKY: "1" });
  assert.equal(sneaky.status, 1, sneaky.output);
  assert.equal(sneaky.report.checks.find((check) => check.name === "lint:structure").status, "modified", "a check that rewrites the tree blocks");
  write("src/app.ts", readFileSync(join(repo, "src/app.ts"), "utf8").replace("// touched\n", ""));

  write(".review-t0.json", "{\"checks\": [{\"name\": \"x\"}]}\n");
  const badConfig = reviewT0();
  assert.equal(badConfig.status, 2, badConfig.output);
  assert.match(badConfig.output, /\.review-t0\.json must be/);
  rmSync(join(repo, ".review-t0.json"));

  // ---- --base uses the merge-base ------------------------------------------
  sh("git", ["stash", "-q", "--include-untracked"]);
  sh("git", ["checkout", "-q", "main"]);
  write("src/legacy.ts", "export const legacy = 1;\n");
  commit("main moves on");
  sh("git", ["checkout", "-q", "feature"]);
  const merged = reviewT0(["--base", "main", "--no-checks"]);
  assert.equal(merged.report.base.sha, sh("git", ["merge-base", "HEAD", "main"]).trim());
  assert.ok(!located(merged.report).some((rule) => rule.includes("src/legacy.ts")), "lines main deleted are not added by the branch");

  // ---- static mutation detection: callees, wildcards, hooks, no over-skip -----
  const plan = (scripts) => {
    newRepo(`plan-${Object.keys(scripts).join("-").replace(/[^a-z]/g, "")}`.slice(0, 60));
    write("package.json", `${JSON.stringify({ name: "plan", private: true, scripts }, null, 2)}\n`);
    commit("base");
    const result = spawnSync(process.execPath, [script, "-C", repo, "--plan", "--no-tests"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout;
  };
  const checkOnly = plan({ lint: "npm run lint:format && npm run lint:types", "lint:format": "prettier --check \"**/*.md\"", "lint:types": "node -e 0" });
  assert.match(checkOnly, /run\s+lint\s/, "a --check formatter is not a fixer");
  assert.doesNotMatch(checkOnly, /run\s+lint:types/, "scripts the lint script runs are not run twice");
  const wildcard = plan({ lint: "run-p lint:*", "lint:fix": "eslint --fix .", "lint:a": "node -e 0" });
  assert.match(wildcard, /skip lint \(rewrites files\)/);
  assert.match(wildcard, /run\s+lint:a/, "safe lint:* scripts still run when the aggregate is skipped");
  const hooked = plan({ lint: "node -e 0", prelint: "node writer.mjs --write" });
  assert.match(hooked, /skip lint \(rewrites files\)/, "npm pre hooks count");

  // ---- deletion-only change still runs the checks ----------------------------
  newRepo("deletion");
  write("package.json", `${JSON.stringify({ name: "deletion", private: true, scripts: { typecheck: "node -e \"require('fs').accessSync('used.ts')\"" } }, null, 2)}\n`);
  write("used.ts", "export const used = 1;\n");
  commit("base");
  sh("git", ["checkout", "-q", "-b", "drop"]);
  sh("git", ["rm", "-q", "used.ts"]);
  const deletion = reviewT0();
  assert.equal(deletion.status, 1, deletion.output);
  assert.equal(deletion.report.checks[0].status, "fail", "a deletion that breaks typecheck blocks");

  console.log("PASS review-t0 contract");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
