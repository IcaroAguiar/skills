#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { lstatSync, mkdtempSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const fingerprintScript = join(scriptDirectory, "fingerprint-review-state.mjs");
const fixtureDirectory = mkdtempSync(join(tmpdir(), "review-loop-fingerprint-"));

function removeOwnedTree(path) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    for (const entry of readdirSync(path)) removeOwnedTree(join(path, entry));
    rmdirSync(path);
    return;
  }
  unlinkSync(path);
}

function git(args) {
  return execFileSync("git", args, { cwd: fixtureDirectory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function fingerprint(mode, argumentsAfterMode = []) {
  return JSON.parse(execFileSync(process.execPath, [fingerprintScript, "--repo", fixtureDirectory, "--repository-id", "example/repository", "--mode", mode, ...argumentsAfterMode, "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }));
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  git(["init", "--quiet"]);
  git(["config", "user.email", "review-loop-test@example.invalid"]);
  git(["config", "user.name", "Review Loop Test"]);
  writeFileSync(join(fixtureDirectory, "tracked.txt"), "base\n");
  writeFileSync(join(fixtureDirectory, "deleted.txt"), "delete me\n");
  writeFileSync(join(fixtureDirectory, "rename-from.txt"), "rename me\n");
  git(["add", "tracked.txt", "deleted.txt", "rename-from.txt"]);
  git(["commit", "--quiet", "-m", "base"]);

  writeFileSync(join(fixtureDirectory, "tracked.txt"), "staged-one\n");
  git(["add", "tracked.txt"]);
  const staged = fingerprint("index");
  const worktreeAtStagedContent = fingerprint("worktree");
  expect(staged.changedFiles.some((entry) => entry.path === "tracked.txt" && entry.status.startsWith("M")), "staged content was not represented by index identity");
  expect(staged.repositoryId === "example/repository", "receipt did not use the protected portable repository identifier");
  expect(!JSON.stringify(staged).includes(fixtureDirectory), "receipt leaked its machine-specific repository root");

  writeFileSync(join(fixtureDirectory, "tracked.txt"), "unstaged-two\n");
  const indexWithUnstaged = fingerprint("index");
  const worktreeWithChangedContent = fingerprint("worktree");
  expect(indexWithUnstaged.sha256 !== staged.sha256, "index identity did not record a changed excluded unstaged state");
  expect(worktreeWithChangedContent.sha256 !== worktreeAtStagedContent.sha256, "changed worktree file bytes did not alter worktree identity");
  expect(indexWithUnstaged.excluded.unstaged.some((entry) => entry.path === "tracked.txt"), "index identity did not explicitly report unstaged exclusion");
  expect(indexWithUnstaged.changedFiles.every((entry) => entry.source === "index"), "index candidate accidentally included unstaged files");

  const worktreeBeforeUntracked = worktreeWithChangedContent;
  writeFileSync(join(fixtureDirectory, "untracked.txt"), "untracked-one\n");
  unlinkSync(join(fixtureDirectory, "deleted.txt"));
  git(["mv", "rename-from.txt", "rename-to.txt"]);
  const worktreeWithUntracked = fingerprint("worktree");
  expect(worktreeWithUntracked.sha256 !== worktreeBeforeUntracked.sha256, "untracked file bytes did not alter worktree identity");
  const untrackedSnapshot = worktreeWithUntracked.fileSnapshots.find((entry) => entry.path === "untracked.txt");
  expect(untrackedSnapshot?.kind === "file" && untrackedSnapshot.bytes > 0, "worktree identity did not include untracked file bytes");
  expect(worktreeWithUntracked.changedFiles.some((entry) => entry.path === "deleted.txt" && entry.status.includes("D")), "worktree identity did not preserve deletion status");
  expect(worktreeWithUntracked.changedFiles.some((entry) => entry.path === "rename-to.txt" && entry.previousPath === "rename-from.txt"), "worktree identity did not preserve rename status");

  const indexWithUntracked = fingerprint("index");
  expect(indexWithUntracked.excluded.untracked.some((entry) => entry.path === "untracked.txt"), "index identity did not explicitly report untracked exclusion");
  const excludedUntrackedSnapshot = indexWithUntracked.excludedFileSnapshots.find((entry) => entry.path === "untracked.txt");
  expect(excludedUntrackedSnapshot?.kind === "file" && excludedUntrackedSnapshot.bytes > 0 && /^[0-9a-f]{64}$/.test(excludedUntrackedSnapshot.sha256), "index identity did not record an excluded untracked file fingerprint");
  expect(indexWithUntracked.changedFiles.every((entry) => entry.path !== "untracked.txt"), "index candidate accidentally included an untracked file");
  expect(indexWithUntracked.changedFiles.some((entry) => entry.path === "rename-to.txt" && entry.previousPath === "rename-from.txt"), "index identity reversed rename source and destination");

  writeFileSync(join(fixtureDirectory, "tracked.txt"), "unstaged-three\n");
  const indexWithSecondUnstagedChange = fingerprint("index");
  expect(indexWithSecondUnstagedChange.sha256 !== indexWithUntracked.sha256, "index identity did not invalidate when excluded unstaged bytes changed with the same path and status");
  expect(JSON.stringify(indexWithSecondUnstagedChange.excluded).includes("tracked.txt"), "second unstaged change lost its excluded path receipt");

  writeFileSync(join(fixtureDirectory, "untracked.txt"), "untracked-two\n");
  const indexWithSecondUntrackedChange = fingerprint("index");
  expect(indexWithSecondUntrackedChange.sha256 !== indexWithSecondUnstagedChange.sha256, "index identity did not invalidate when excluded untracked bytes changed with the same path and status");
  const secondExcludedUntrackedSnapshot = indexWithSecondUntrackedChange.excludedFileSnapshots.find((entry) => entry.path === "untracked.txt");
  expect(secondExcludedUntrackedSnapshot?.sha256 !== excludedUntrackedSnapshot.sha256, "excluded untracked fingerprint did not change after its bytes changed");
  expect(!JSON.stringify(indexWithSecondUntrackedChange).includes(fixtureDirectory), "index receipt leaked its machine-specific repository root");

  git(["add", "tracked.txt"]);
  const restaged = fingerprint("index");
  expect(restaged.sha256 !== indexWithSecondUntrackedChange.sha256, "changed staged content did not alter index identity");
  git(["commit", "--quiet", "-m", "candidate"]);
  const commit = fingerprint("commit", ["--base", "HEAD~1", "--head", "HEAD"]);
  expect(/^[0-9a-f]{40}$/.test(commit.base ?? "") && /^[0-9a-f]{40}$/.test(commit.head ?? ""), "commit identity did not resolve pinned base and head SHAs");
  expect(commit.changedFiles.some((entry) => entry.source === "commit"), "commit identity did not contain the pinned commit change set");
  expect(commit.changedFiles.some((entry) => entry.path === "rename-to.txt" && entry.previousPath === "rename-from.txt"), "commit identity reversed rename source and destination");
  console.log("PASS review-state-fingerprint");
} finally {
  removeOwnedTree(fixtureDirectory);
}
