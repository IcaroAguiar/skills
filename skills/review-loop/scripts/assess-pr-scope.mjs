#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const MAX_SINGLE_PR_FILES = 20;
const MAX_SINGLE_PR_CHANGED_LINES = 600;
const MAX_FINAL_PASS_FILES = 10;
const MAX_FINAL_PASS_CHANGED_LINES = 300;
const MAX_REVIEW_PASSES = 3;

function option(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function has(name) {
  return args.includes(name);
}

function die(message) {
  console.error(`review-loop PR scope assessment failed: ${message}`);
  process.exit(1);
}

function git(commandArgs, cwd) {
  try {
    return execFileSync("git", commandArgs, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    }).trim();
  } catch (error) {
    die(error.stderr?.toString().trim() || error.message);
  }
}

function parseNumstat(output) {
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [rawAdditions, rawDeletions, ...pathParts] = line.split("\t");
    const binary = rawAdditions === "-" || rawDeletions === "-";
    const additions = binary ? 0 : Number.parseInt(rawAdditions, 10);
    const deletions = binary ? 0 : Number.parseInt(rawDeletions, 10);
    if (!binary && (!Number.isSafeInteger(additions) || !Number.isSafeInteger(deletions))) {
      die(`cannot parse numstat line for ${pathParts.join("\t") || "unknown path"}`);
    }
    return { path: pathParts.join("\t"), additions, deletions, binary };
  });
}

if (has("--help")) {
  console.log(`review-loop pull-request scope gate

Usage:
  node assess-pr-scope.mjs --base <sha> --head <sha> [--review-pass <1..n>]
    [--root <repository>] [--json]

The gate requires a GitHub-native gh stack before review when one PR exceeds
20 changed files or 600 changed lines. A third and final reviewer pass is
reserved for small cohesive diffs (at most 10 files and 300 changed lines).
No fourth reviewer pass is permitted.`);
  process.exit(0);
}

const root = resolve(option("--root", process.cwd()));
if (!existsSync(root)) die("--root must exist");
const repositoryRoot = realpathSync.native(git(["rev-parse", "--show-toplevel"], root));
const base = option("--base").trim();
const head = option("--head").trim();
if (!base || !head) die("--base and --head are required pinned commit identities");
git(["rev-parse", "--verify", `${base}^{commit}`], repositoryRoot);
git(["rev-parse", "--verify", `${head}^{commit}`], repositoryRoot);
const reviewPass = Number.parseInt(option("--review-pass", "1"), 10);
if (!Number.isSafeInteger(reviewPass) || reviewPass < 1) die("--review-pass must be a positive integer");

const files = parseNumstat(git(["diff", "--numstat", "--find-renames", base, head], repositoryRoot));
const changedLines = files.reduce((total, file) => total + file.additions + file.deletions, 0);
const binaryFiles = files.filter((file) => file.binary).length;
const reasons = [];
if (files.length > MAX_SINGLE_PR_FILES) reasons.push(`changed files ${files.length} exceed ${MAX_SINGLE_PR_FILES}`);
if (changedLines > MAX_SINGLE_PR_CHANGED_LINES) reasons.push(`changed lines ${changedLines} exceed ${MAX_SINGLE_PR_CHANGED_LINES}`);
if (reviewPass === MAX_REVIEW_PASSES && files.length > MAX_FINAL_PASS_FILES) reasons.push(`final pass files ${files.length} exceed ${MAX_FINAL_PASS_FILES}`);
if (reviewPass === MAX_REVIEW_PASSES && changedLines > MAX_FINAL_PASS_CHANGED_LINES) reasons.push(`final pass lines ${changedLines} exceed ${MAX_FINAL_PASS_CHANGED_LINES}`);

let status = "SINGLE_PR_ALLOWED";
let exitCode = 0;
let requiredAction = "continue the bounded review loop on this exact candidate";
if (reviewPass > MAX_REVIEW_PASSES) {
  status = "REVIEW_LIMIT_REACHED";
  exitCode = 21;
  reasons.push(`review pass ${reviewPass} exceeds the hard limit of ${MAX_REVIEW_PASSES}`);
  requiredAction = "do not dispatch another reviewer; return BLOCKED, or split multi-concern work with gh stack";
} else if (reasons.length > 0) {
  status = "STACK_REQUIRED";
  exitCode = 20;
  requiredAction = "load $gh-stack, design reviewable layers, submit a GitHub PR stack, and review each layer bottom-to-top";
}

const receipt = {
  status,
  candidate: { base, head },
  reviewPass,
  limits: {
    maxReviewPasses: MAX_REVIEW_PASSES,
    maxSinglePrFiles: MAX_SINGLE_PR_FILES,
    maxSinglePrChangedLines: MAX_SINGLE_PR_CHANGED_LINES,
    maxFinalPassFiles: MAX_FINAL_PASS_FILES,
    maxFinalPassChangedLines: MAX_FINAL_PASS_CHANGED_LINES,
  },
  metrics: { changedFiles: files.length, changedLines, binaryFiles },
  reasons,
  requiredAction,
};

if (has("--json")) console.log(JSON.stringify(receipt, null, 2));
else {
  console.log(`${status}: ${files.length} files, ${changedLines} changed lines, review pass ${reviewPass}/${MAX_REVIEW_PASSES}`);
  if (reasons.length > 0) console.log(`reasons: ${reasons.join("; ")}`);
  console.log(`required action: ${requiredAction}`);
}
process.exit(exitCode);
