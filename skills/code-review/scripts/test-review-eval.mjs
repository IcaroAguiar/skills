#!/usr/bin/env node
// Contract for review-eval with a stand-in reviewer, so no model is called.
// Needs git, node, gitleaks and semgrep: review-t0 runs inside each case.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scripts = dirname(fileURLToPath(import.meta.url));
const workspace = mkdtempSync(join(tmpdir(), "review-eval-fixture-"));
const cases = join(workspace, "cases.jsonl");
const env = { ...process.env, TMPDIR: workspace, AGENT_REVIEW_STATE: join(workspace, "state"), AGENT_REVIEW_POLICY: join(workspace, "no-policy.json"), REVIEW_T1_CLAUDE: "" };
const repo = join(workspace, "clone");

function sh(command, args) {
  const result = spawnSync(command, args, { cwd: repo, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function write(file, content) {
  mkdirSync(dirname(join(repo, file)), { recursive: true });
  writeFileSync(join(repo, file), content);
}

function commit(message) {
  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-q", "--no-verify", "-m", message]);
  return sh("git", ["rev-parse", "HEAD"]);
}

const evalTool = (args) => {
  const result = spawnSync(process.execPath, [join(scripts, "review-eval.mjs"), ...args], { encoding: "utf8", env });
  return { ...result, output: result.stdout + result.stderr };
};

try {
  mkdirSync(repo);
  sh("git", ["init", "-q", "-b", "main"]);
  for (const [key, value] of [["user.email", "eval@example.invalid"], ["user.name", "eval fixture"], ["commit.gpgsign", "false"]]) sh("git", ["config", key, value]);
  const lines = (bug) => Array.from({ length: 10 }, (_, index) => (index === 4 && bug ? bug : `export const value${index} = ${index};`)).join("\n") + "\n";
  write("README.md", "# fixture\n");
  write("src/bug.ts", lines());
  const base = commit("base");
  write("src/bug.ts", lines("export const value4 = BUGMARK / 0;"));
  const buggy = commit("feat: introduce the bug");
  write("README.md", "# fixture\n\nMore words.\n");
  const clean = commit("docs: words");

  // The stand-in reports the bug when the prompt carries its marker and nothing otherwise.
  const stub = join(workspace, "stub.sh");
  const finding = JSON.stringify({ findings: [{ severity: "P1", lens: "CORRECTNESS", file: "src/bug.ts", line: 8, title: "division by zero", why: "BUGMARK divides by zero." }] });
  writeFileSync(stub, `#!/bin/sh\nif cat | grep -q BUGMARK; then printf '%s' '${finding}'; else printf '%s' '{"findings":[]}'; fi\n`);
  chmodSync(stub, 0o755);

  const bad = evalTool(["add", "--cases", cases, "--id", "bad", "--repo", repo, "--base", "0".repeat(40), "--head", buggy, "--clean"]);
  assert.equal(bad.status, 2, bad.output);
  assert.match(bad.output, /is not a commit/);
  assert.equal(evalTool(["add", "--cases", cases, "--id", "none", "--repo", repo, "--base", base, "--head", buggy]).status, 2, "a case needs --expect or --clean");
  assert.equal(evalTool(["add", "--cases", cases, "--id", "nogit", "--repo", workspace, "--base", base, "--head", buggy, "--clean"]).status, 2, "the repo must be a git repo");
  assert.equal(evalTool(["frobnicate"]).status, 2);

  const added = evalTool(["add", "--cases", cases, "--id", "escaped", "--repo", repo, "--base", base, "--head", buggy, "--expect", "src/bug.ts:5:division: by zero", "--note", "incident"]);
  assert.equal(added.status, 0, added.output);
  assert.equal(evalTool(["add", "--cases", cases, "--id", "quiet", "--repo", repo, "--base", buggy, "--head", clean, "--clean"]).status, 0);
  assert.equal(evalTool(["add", "--cases", cases, "--id", "quiet", "--repo", repo, "--base", buggy, "--head", clean, "--clean"]).status, 2, "ids are unique");
  const stored = readFileSync(cases, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(stored.map((entry) => [entry.id, entry.expected.length, entry.head]), [["escaped", 1, buggy], ["quiet", 0, clean]]);
  assert.deepEqual(stored[0].expected, [{ file: "src/bug.ts", line: 5, title: "division: by zero" }]);

  const out = join(workspace, "results.json");
  const result = evalTool(["run", "--cases", cases, "--json", out, "--config", `stub=--reviewer-cmd 'stub=${stub}'`]);
  assert.equal(result.status, 0, result.output);
  const report = JSON.parse(readFileSync(out, "utf8"));
  assert.deepEqual(report.results.map((r) => [r.id, r.config, r.status, r.hits, r.expected, r.noise]), [["escaped", "stub", "ok", 1, 1, null], ["quiet", "stub", "ok", 0, 0, 0]]);
  const [summary] = report.summaries;
  assert.deepEqual([summary.cases, summary.failed, summary.recall, summary.noisePerCleanPr], [2, 0, 1, 0]);
  assert.match(result.stdout, /stub\s+2\s+0\s+1\.00\s+0\.00/);

  const only = evalTool(["run", "--cases", cases, "--only", "quiet", "--config", `stub=--reviewer-cmd 'stub=${stub}'`]);
  assert.equal(only.status, 0, only.output);
  assert.doesNotMatch(only.stdout, /escaped/);

  const worktrees = sh("git", ["worktree", "list", "--porcelain"]).split("\n").filter((line) => line.startsWith("worktree "));
  assert.equal(worktrees.length, 1, `worktrees left behind:\n${worktrees.join("\n")}`);

  const broken = evalTool(["run", "--cases", cases, "--config", "dead=--reviewer-cmd 'dead=exit 3'"]);
  assert.equal(broken.status, 1, broken.output);
  assert.equal(sh("git", ["worktree", "list", "--porcelain"]).split("\n").filter((line) => line.startsWith("worktree ")).length, 1, "failed runs remove their worktrees");

  // --keep with two configs of the same case keeps two worktrees, and both runs complete.
  const kept = evalTool(["run", "--cases", cases, "--only", "quiet", "--keep", "--config", `a=--reviewer-cmd 'stub=${stub}'`, "--config", `b=--reviewer-cmd 'stub=${stub}'`]);
  assert.equal(kept.status, 0, kept.output);
  const keptPaths = [...kept.stdout.matchAll(/^kept (.+)$/gm)].map((match) => match[1]);
  assert.equal(new Set(keptPaths).size, 2, kept.output);
  for (const path of keptPaths) sh("git", ["worktree", "remove", "--force", path]);

  console.log("PASS review-eval contract");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
