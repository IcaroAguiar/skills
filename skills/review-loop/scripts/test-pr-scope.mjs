#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const assessor = join(scriptDir, "assess-pr-scope.mjs");
const root = mkdtempSync(join(tmpdir(), "review-loop-pr-scope-"));
process.on("exit", () => rmSync(root, { recursive: true, force: true }));

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function commit(message) {
  git(["add", "."]);
  git(["commit", "-m", message]);
  return git(["rev-parse", "HEAD"]);
}

function assess(base, head, reviewPass = 1) {
  try {
    return {
      code: 0,
      receipt: JSON.parse(execFileSync(process.execPath, [assessor, "--root", root, "--base", base, "--head", head, "--review-pass", String(reviewPass), "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })),
    };
  } catch (error) {
    return { code: error.status, receipt: JSON.parse(error.stdout.toString()) };
  }
}

git(["init", "-q"]);
git(["config", "user.name", "Review Loop Test"]);
git(["config", "user.email", "review-loop@example.invalid"]);
writeFileSync(join(root, "base.txt"), "base\n");
const base = commit("base");

writeFileSync(join(root, "small.txt"), "one\ntwo\nthree\n");
const small = commit("small change");
const smallReceipt = assess(base, small);
if (smallReceipt.code !== 0 || smallReceipt.receipt.status !== "SINGLE_PR_ALLOWED") throw new Error("small PR should remain reviewable as one PR");

writeFileSync(join(root, "large.txt"), `${Array.from({ length: 601 }, (_, index) => `line ${index}`).join("\n")}\n`);
const large = commit("large change");
const largeReceipt = assess(small, large);
if (largeReceipt.code !== 20 || largeReceipt.receipt.status !== "STACK_REQUIRED" || largeReceipt.receipt.metrics.changedLines <= 600) {
  throw new Error("large changed-line count must require a GitHub PR stack");
}

for (let index = 0; index < 21; index += 1) writeFileSync(join(root, `file-${index}.txt`), `${index}\n`);
const wide = commit("wide change");
const wideReceipt = assess(large, wide);
if (wideReceipt.code !== 20 || wideReceipt.receipt.metrics.changedFiles !== 21) throw new Error("wide PR must require a GitHub PR stack");

for (let index = 0; index < 11; index += 1) writeFileSync(join(root, `final-file-${index}.txt`), `${index}\n`);
const finalWide = commit("final pass too wide");
const finalWideReceipt = assess(wide, finalWide, 3);
if (finalWideReceipt.code !== 20 || !finalWideReceipt.receipt.reasons.some((reason) => reason.includes("final pass files"))) {
  throw new Error("third reviewer pass must require at most 10 files");
}

writeFileSync(join(root, "final-lines.txt"), `${Array.from({ length: 301 }, (_, index) => `line ${index}`).join("\n")}\n`);
const finalLong = commit("final pass too long");
const finalLongReceipt = assess(finalWide, finalLong, 3);
if (finalLongReceipt.code !== 20 || !finalLongReceipt.receipt.reasons.some((reason) => reason.includes("final pass lines"))) {
  throw new Error("third reviewer pass must require at most 300 changed lines");
}

const finalPassReceipt = assess(base, small, 4);
if (finalPassReceipt.code !== 21 || finalPassReceipt.receipt.status !== "REVIEW_LIMIT_REACHED") throw new Error("a fourth reviewer pass must be rejected");

console.log("PASS pr-scope");
