#!/usr/bin/env node
// Contract for review-t1 with stand-in reviewers, so no model is called.
// Needs git, node, gitleaks and semgrep: review-t0 runs first.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scripts = dirname(fileURLToPath(import.meta.url));
const workspace = mkdtempSync(join(tmpdir(), "review-t1-fixture-"));
// Default report paths (T1 finds T0's report there) stay inside the workspace.
const env = { ...process.env, TMPDIR: workspace };
const bin = join(workspace, "bin");
let repo = "";

function sh(command, args) {
  const result = spawnSync(command, args, { cwd: repo, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function write(file, content, root = repo) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), content);
}

function newRepo(name) {
  repo = join(workspace, name);
  mkdirSync(repo);
  sh("git", ["init", "-q", "-b", "main"]);
  for (const [key, value] of [["user.email", "t1@example.invalid"], ["user.name", "t1 fixture"], ["commit.gpgsign", "false"]]) sh("git", ["config", key, value]);
  write("README.md", "# fixture\n");
  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-q", "--no-verify", "-m", "base"]);
}

function tool(script, args) {
  const result = spawnSync(process.execPath, [join(scripts, script), "-C", repo, ...args], { encoding: "utf8", env });
  return { ...result, output: result.stdout + result.stderr };
}

function reviewT0(expected = 0) {
  const result = tool("review-t0.mjs", ["--no-checks"]);
  assert.equal(result.status, expected, result.output);
}

function reviewT1(args) {
  const reportPath = join(workspace, "t1.json");
  rmSync(reportPath, { force: true });
  const result = tool("review-t1.mjs", ["--json", reportPath, ...args]);
  return { ...result, report: existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null };
}

// A stand-in reviewer: saves the prompt it received, then prints a canned answer.
const reviewer = (name, answer) => {
  write(`${name}.answer`, answer, bin);
  return ["--reviewer-cmd", `${name}=cat > '${join(bin, `${name}.prompt`)}'; cat '${join(bin, `${name}.answer`)}'`];
};
const code = (count) => Array.from({ length: count }, (_, index) => `export const value${index} = ${index};\n`).join("");
const silentCatch = "export async function load() {\n  try {\n    return await fetchAll();\n  } catch {\n    return [];\n  }\n}\n";

try {
  newRepo("main");
  sh("git", ["checkout", "-q", "-b", "feature"]);
  write("src/feature.ts", code(30) + silentCatch);
  write("package-lock.json", `{"lockfileVersion": 3, "marker": "LOCK-CONTENT"}\n`);
  write("dist/bundle.js", "GENERATED-CONTENT\n");
  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-q", "--no-verify", "-m", "feat: add feature\n\nIntent marker INTENT-42."]);
  write("README.md", "# fixture\nUNSTAGED-EDIT\n");
  write("src/extra.ts", "export const UNTRACKED_MARKER = 1;\n");

  const early = reviewT1(reviewer("never", "{}"));
  assert.equal(early.status, 2, early.output);
  assert.match(early.output, /run review-t0 on this tree first/);

  reviewT0();
  const fenced = `Here is my review.\n\`\`\`json\n${JSON.stringify({ findings: [
    { severity: "P2", lens: "correctness", file: "src/feature.ts", line: 10, title: "a-title", why: "a-why" },
    { severity: "P3", lens: "CLEAN", file: "other/file.ts", line: 5, title: "outside", why: "not in the diff" },
  ] })}\n\`\`\`\nThanks.`;
  const raw = JSON.stringify({ findings: [
    { severity: "P2", lens: "SEC", file: "./src/feature.ts", line: 12, title: "b-title", why: "b-why" },
    { severity: "P1", lens: "SEC", file: `${repo}/src/extra.ts`, line: 1, title: "absolute", why: "absolute path" },
    { severity: "P2", lens: "SEC", file: "src/feature.ts" },
  ] });
  const run = reviewT1([
    "--timeout", "5",
    ...reviewer("a", fenced),
    ...reviewer("b", raw),
    "--reviewer-cmd", "slow=node -e 'setTimeout(() => {}, 60000)'",
    "--reviewer-cmd", "broken=echo crashed >&2; exit 3",
    ...reviewer("junk", "no json here"),
  ]);
  assert.equal(run.status, 0, run.output);
  const statuses = Object.fromEntries(run.report.reviewers.map((entry) => [entry.name, entry.status]));
  assert.deepEqual(statuses, { a: "ok", b: "ok", slow: "timeout", broken: "error", junk: "malformed" });
  assert.equal(run.report.reviewers.find((entry) => entry.name === "b").dropped, 1, "a finding without a title is dropped");
  const spots = run.report.findings.map((spot) => [spot.severity, spot.file, spot.line, spot.reviewers.join("+"), spot.inDiff]);
  assert.deepEqual(spots, [
    ["P1", "src/extra.ts", 1, "b", true],
    ["P2", "src/feature.ts", 10, "a+b", true],
    ["P3", "other/file.ts", 5, "a", false],
  ], "same spot grouped across reviewers, absolute paths made relative, severity first");
  assert.equal(run.report.findings[1].items[0].lens, "CORRECTNESS");
  assert.match(run.output, /RESULT 4 finding\(s\) at 3 spot\(s\) from 2\/5 reviewers/);

  const prompt = readFileSync(join(bin, "a.prompt"), "utf8");
  for (const expected of ["INTENT-42", "src/feature.ts", "UNSTAGED-EDIT", "UNTRACKED_MARKER", "silent-catch-default src/feature.ts:32", "package-lock.json (lockfile)", "dist/bundle.js (generated or vendored)"]) {
    assert.ok(prompt.includes(expected), `prompt lacks ${expected}`);
  }
  for (const omitted of ["LOCK-CONTENT", "GENERATED-CONTENT"]) assert.ok(!prompt.includes(omitted), `prompt includes ${omitted}`);

  const none = reviewT1(["--reviewer-cmd", "x=exit 1"]);
  assert.equal(none.status, 1, none.output);
  assert.match(none.output, /RESULT no reviewer answered/);

  const promptFile = join(workspace, "prompt.md");
  const promptOnly = reviewT1(["--prompt", promptFile, ...reviewer("unused", "{}")]);
  assert.equal(promptOnly.status, 0, promptOnly.output);
  assert.ok(readFileSync(promptFile, "utf8").includes("INTENT-42"));
  assert.ok(!existsSync(join(bin, "unused.prompt")), "--prompt calls no reviewer");

  write("src/extra.ts", "export const UNTRACKED_MARKER = 2;\n");
  const stale = reviewT1(reviewer("stale", "{}"));
  assert.equal(stale.status, 2, stale.output);
  assert.match(stale.output, /changed since review-t0/);

  write("notes.md", "<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature\n");
  reviewT0(1);
  const blocked = reviewT1(reviewer("blocked", "{}"));
  assert.equal(blocked.status, 2, blocked.output);
  assert.match(blocked.output, /review-t0 is BLOCKED/);

  // ---- the route skips T1 for docs-only changes unless forced -----------------
  newRepo("docs");
  write("docs/guide.md", code(40));
  reviewT0();
  const skipped = reviewT1(reviewer("skipped", '{"findings":[]}'));
  assert.equal(skipped.status, 0, skipped.output);
  assert.match(skipped.report.skipped, /docs, tests/);
  assert.ok(!existsSync(join(bin, "skipped.prompt")), "a skipped T1 calls no reviewer");
  const forced = reviewT1(["--force", ...reviewer("forced", '{"findings":[]}')]);
  assert.equal(forced.status, 0, forced.output);
  assert.equal(forced.report.reviewers[0].status, "ok");

  console.log("PASS review-t1 contract");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
