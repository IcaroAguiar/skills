#!/usr/bin/env node
// End-to-end contract for review-t0 on throwaway repositories.
// Needs git, node, npm, gitleaks and semgrep; osv-scanner is not exercised (network).

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
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
  assert.deepEqual([report.route.effort, report.route.t1.run, report.route.reasons], ["high", true, []], "generated build/secret.ts does not make the change sensitive");
  assert.ok(report.head.tree, "the report pins the reviewed working tree");

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

  // ---- route: deep-review effort and T1 from the paths the diff touches -------
  newRepo("route");
  write("README.md", "# route\n");
  commit("base");
  const code = (count) => Array.from({ length: count }, (_, index) => `export const value${index} = ${index};\n`).join("");
  const routed = () => {
    const result = reviewT0(["--no-checks"]);
    assert.equal(result.status, 0, result.output);
    return { route: result.report.route, comments: result.report.comments, output: result.output };
  };
  write("src/tiny.ts", code(3));
  assert.deepEqual(routed().route.t1, { run: false, why: "under 20 changed lines" });
  rmSync(join(repo, "src/tiny.ts"));
  write("docs/guide.md", code(30));
  write("src/auth/session.test.ts", code(30));
  const docs = routed().route;
  assert.deepEqual([docs.effort, docs.t1.run], ["medium", false], "docs and tests only");
  write("src/design/designTokens.ts", code(30));
  const plain = routed().route;
  assert.deepEqual([plain.effort, plain.t1.run, plain.reasons], ["high", true, []], "design tokens and tests under auth/ are not sensitive code");
  write("src/billing/InvoiceService.ts", code(5));
  write("src/JWTStrategy.ts", code(5));
  write("db/migrations/001_init.sql", "create table t (id int);\n");
  const sensitive = routed();
  assert.equal(sensitive.route.effort, "xhigh");
  assert.deepEqual(sensitive.route.reasons.map((reason) => reason.area).sort(), ["auth", "migrations", "money"]);
  assert.match(sensitive.output, /ROUTE deep-review effort xhigh \(.*money: src\/billing\/InvoiceService\.ts/);

  newRepo("route-rename");
  write("src/auth/session.ts", code(30));
  commit("base");
  sh("git", ["mv", "src/auth/session.ts", "src/client.ts"]);
  const moved = routed().route;
  assert.deepEqual([moved.effort, moved.reasons.map((reason) => reason.area)], ["xhigh", ["auth"]], "moving code out of an auth path still touches auth");
  assert.deepEqual([moved.reviewLines, moved.reviewFiles], [0, 0], "a pure rename has nothing to read");

  // ---- size: only reviewable lines count, and past the limit T0 advises a split ----
  newRepo("route-size");
  write("README.md", "# size\n");
  commit("base");
  write("src/__snapshots__/a.test.ts.snap", code(2000));
  write("dist/bundle.js", code(1000));
  write("src/a.ts", code(500));
  const target = routed();
  assert.deepEqual([target.route.size, target.route.reviewLines, target.route.reviewFiles], ["medium", 500, 1], "snapshots and build output do not count");
  assert.ok(target.route.changedLines > 3000, "changed lines still count everything");
  assert.match(target.output, /SIZE 500 reviewable lines in 1 files: over the 400-line layer target/);
  write("src/b.ts", code(400));
  const large = routed();
  assert.equal(large.route.size, "large");
  assert.match(large.output, /SIZE 900 reviewable lines in 2 files: over 800 lines or 30 files\. Split it into a stack/);
  // ---- comments: a diff that documents every declaration gets a COMMENTS line ----
  newRepo("comments");
  write("README.md", "# comments\n");
  commit("base");
  const documented = (count) => Array.from({ length: count }, (_, index) => `/** The value ${index}. */\nexport const value${index} = ${index};\n`).join("");
  write("src/a.ts", documented(12) + code(100));
  for (const test of ["src/a.test.ts", "src/flow.e2e.ts", "e2e/login.ts", "scripts/test-run.mjs"]) write(test, "// a test may explain itself\n".repeat(50));
  write("src/b.ts", "// eslint-disable-next-line no-console\n// @ts-expect-error legacy\n*[Symbol.iterator]() {}\nimport eslint from 'eslint';\n" + code(10));
  const noisy = reviewT0(["--no-checks"]);
  assert.equal(noisy.status, 1, "past 5% the comments block T0");
  assert.deepEqual([noisy.report.comments.lines, noisy.report.comments.sourceLines], [12, 136], "tests and lint directives count on neither side; code naming a linter does");
  assert.match(noisy.output, /COMMENTS 12 new comment lines in 136 added source lines \(9%; 12 added, 0 removed; most in src\/a\.ts 12\): over the 5% limit/);
  assert.match(noisy.output, /RESULT BLOCKED \(comments: 12 new in 136 added source lines\)/);
  write("src/a.ts", documented(12) + code(300));
  const advised = routed();
  assert.match(advised.output, /COMMENTS 12 new comment lines in 336 added source lines \(4%.*the reviewer reports the rest/, "between 3% and 5% T0 only advises");
  write("src/a.ts", documented(3) + code(100));
  assert.doesNotMatch(routed().output, /COMMENTS/, "a few comments are no signal");
  // A cleanup that shortens comments adds a few while deleting more: no line.
  write("src/a.ts", documented(3) + code(100));
  commit("documented");
  write("src/a.ts", Array.from({ length: 12 }, (_, index) => `// v${index}\n`).join("") + code(100));
  write("src/[slug] c.ts", Array.from({ length: 40 }, (_, index) => `/** long ${index} */\nexport const c${index} = ${index};\n`).join(""));
  commit("more docs");
  write("src/[slug] c.ts", Array.from({ length: 40 }, (_, index) => `export const c${index} = ${index};\n`).join("") + "// c\n".repeat(10));
  const cleanup = routed();
  assert.ok(cleanup.comments.removed >= 40, "removed comment lines are counted");
  assert.doesNotMatch(cleanup.output, /COMMENTS/, "a net comment cleanup gets no COMMENTS line");
  // Splitting a commented module adds its comments in new files and removes them from the old one.
  const notes = (from, to) => Array.from({ length: to - from }, (_, index) => `// note ${from + index}\nexport const m${from + index} = ${from + index};\n`).join("");
  write("src/notes.ts", notes(0, 30));
  commit("notes");
  rmSync(join(repo, "src/notes.ts"));
  write("src/notes-a.ts", notes(0, 15) + code(40));
  write("src/notes-b.ts", notes(15, 30) + code(40).replaceAll("value", "other"));
  const split = routed();
  assert.deepEqual([split.comments.lines, split.comments.removed], [30, 30], "comments deleted from another file count as removed");
  assert.doesNotMatch(split.output, /COMMENTS/, "moving commented code to new files adds no comments on net");
  // A rename that rewrites its comments in place removes as many as it adds.
  rmSync(join(repo, "src/notes-a.ts"));
  rmSync(join(repo, "src/notes-b.ts"));
  write("src/notes.ts", notes(0, 30) + code(100));
  commit("long notes");
  sh("git", ["mv", "src/notes.ts", "src/renamed.ts"]);
  write("src/renamed.ts", notes(0, 30).replaceAll("// note", "// reworded") + code(100));
  const renamed = routed();
  assert.deepEqual([renamed.comments.lines, renamed.comments.removed], [30, 30], "a rename's removed comments are counted through its old path");
  assert.doesNotMatch(renamed.output, /COMMENTS/);
  // Lexical context: `//` inside a template literal is code, the body of a block comment is comment.
  commit("renamed");
  write("src/template.ts", "export const page = `\n" + "//cdn.example.com/lib.js\n".repeat(12) + "`;\n" + code(40));
  assert.equal(routed().comments.lines, 0, "lines inside a template literal are not comments");
  write("src/template.ts", "/*\n" + "plain block comment line\n".repeat(12) + "*/\n" + code(40));
  const block = reviewT0(["--no-checks"]);
  assert.equal(block.report.comments.lines, 14, "every line of a block comment counts");
  assert.equal(block.status, 1, block.output);
  write("src/template.ts", "const tick = \"`\";\n" + "// a real comment\n".repeat(12) + "export const page = `\n" + "//cdn.example.com/lib.js\n".repeat(12) + "${ { a: 1 }.a }\n`;\n" + code(40));
  const quoted = reviewT0(["--no-checks"]).report.comments;
  assert.equal(quoted.lines, 12, "a backtick in quotes opens no template; the template's lines are code");
  write("src/template.ts", "/*\n" + "\n".repeat(12) + "*/\n" + code(40));
  assert.equal(routed().comments.lines, 2, "blank lines inside a block comment are blank");
  write("src/template.ts", "export const special = /[/*]/;\nexport const half = 4 / 2; // why: halves\n" + code(40));
  assert.equal(routed().comments.lines, 0, "a regex literal opens no block comment; a trailing comment is a code line");
  write("src/template.ts", "export const n = count++ / 2; /*\n" + "a real block comment\n".repeat(12) + "*/\nexport const w = 4 /* scale */ / `\n" + "//cdn.example.com/lib.js\n".repeat(12) + "`;\n" + code(400));
  assert.equal(reviewT0(["--no-checks"]).report.comments.lines, 13, "a division after a value or a comment is no regex");
  newRepo("route-size-files");
  write("README.md", "# size\n");
  for (let index = 0; index < 31; index += 1) writeFileSync(join(repo, `asset${index}.bin`), Buffer.from([0, index]));
  write("src/generated\tmodule.ts", code(1));
  commit("base");
  for (let index = 0; index < 31; index += 1) writeFileSync(join(repo, `asset${index}.bin`), Buffer.from([0, index, 1]));
  rmSync(join(repo, "src/generated\tmodule.ts"));
  const binaries = routed().route;
  assert.deepEqual([binaries.size, binaries.reviewFiles, binaries.reviewLines], ["large", 32, 1], "binary edits count as files; a tab in a path keeps the whole path");
  commit("binary edits");
  for (let index = 0; index < 31; index += 1) sh("git", ["mv", `asset${index}.bin`, `moved${index}.bin`]);
  const movedBinaries = routed().route;
  assert.deepEqual([movedBinaries.size, movedBinaries.reviewFiles], ["small", 0], "pure binary renames have nothing to read");
  commit("binary renames");
  write("src/order.ts", Array.from({ length: 40 }, (_, index) => `export const line${index} = ${index};\n`).join(""));
  commit("ordered");
  sh("git", ["mv", "src/order.ts", "src/reordered.ts"]);
  write("src/reordered.ts", Array.from({ length: 40 }, (_, index) => `export const line${39 - index} = ${39 - index};\n`).join(""));
  const reordered = routed().route;
  assert.ok(reordered.reviewFiles >= 1 && reordered.reviewLines > 0, "a rename with reordered lines is read, even when git scores it R100");
  sh("git", ["reset", "-q", "--hard", "HEAD"]);
  sh("git", ["mv", "moved0.bin", "renamed0.bin"]);
  writeFileSync(join(repo, "renamed0.bin"), Buffer.from([0, 7, 7, 7]));
  assert.ok(routed().route.reviewFiles >= 1, "an edited binary rename still counts (git may show it as a delete and an add)");
  // routed() asserts exit 0, so a large change still passes: size advises, never blocks.

  // ---- Ctrl-C during a check starts no further check ---------------------------
  newRepo("cancel");
  const marks = join(workspace, "marks");
  mkdirSync(marks);
  write("first.mjs", `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(join(marks, "first"))}, "");\nsetTimeout(() => {}, 60000);\n`);
  write("second.mjs", `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(join(marks, "second"))}, "");\n`);
  write("package.json", `${JSON.stringify({ name: "cancel", private: true, scripts: { typecheck: "node first.mjs", lint: "node second.mjs" } }, null, 2)}\n`);
  commit("base");
  write("src/change.ts", "export const changed = 1;\n");
  const cancelled = spawn(process.execPath, [script, "-C", repo, "--json", join(workspace, "cancel.json"), "--no-tests"], { stdio: "ignore" });
  const exited = new Promise((done) => cancelled.on("exit", (code) => done(code)));
  for (let waited = 0; !existsSync(join(marks, "first")) && waited < 300; waited += 1) await new Promise((wake) => setTimeout(wake, 100));
  cancelled.kill("SIGINT");
  assert.equal(await exited, 130);
  await new Promise((wake) => setTimeout(wake, 500));
  assert.ok(!existsSync(join(marks, "second")), "a check started after Ctrl-C");

  console.log("PASS review-t0 contract");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
