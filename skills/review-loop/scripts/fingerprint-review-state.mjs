#!/usr/bin/env node
/**
 * Produce a read-only identity for the exact repository state a review saw.
 *
 * The SHA-256 is over an explicitly framed byte stream, not a formatted diff:
 *
 *   review-loop-candidate-state-v1\0
 *   <field-name>\0<byte-length-as-decimal>\0<raw-field-bytes>\0 ...
 *
 * Fields are emitted in the fixed order below. JSON fields use recursively
 * sorted keys; diff and file fields retain their original bytes. This makes
 * both embedded NULs and a change in a field boundary observable.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readlinkSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";

const VERSION = 1;
const MODES = new Set(["commit", "index", "worktree"]);
const NULL = Buffer.from([0]);
const DIFF_OPTIONS = ["--binary", "--full-index", "--no-ext-diff", "--no-textconv", "--find-renames=50%"];

function fail(message) {
  process.stderr.write(`review-loop fingerprint: ${message}\n`);
  process.exitCode = 1;
  throw new Error(message);
}

function runGit(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail = Buffer.isBuffer(error.stderr) ? error.stderr.toString("utf8").trim() : String(error.stderr ?? error.message);
    fail(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
}

function gitText(args, cwd) {
  return runGit(args, cwd).toString("utf8").trim();
}

function parseArgs(argv) {
  const parsed = { repo: process.cwd(), repositoryId: "", mode: "worktree", base: "", head: "", json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repo") parsed.repo = argv[++index] ?? "";
    else if (argument.startsWith("--repo=")) parsed.repo = argument.slice("--repo=".length);
    else if (argument === "--repository-id") parsed.repositoryId = argv[++index] ?? "";
    else if (argument.startsWith("--repository-id=")) parsed.repositoryId = argument.slice("--repository-id=".length);
    else if (argument === "--mode") parsed.mode = argv[++index] ?? "";
    else if (argument.startsWith("--mode=")) parsed.mode = argument.slice("--mode=".length);
    else if (argument === "--base") parsed.base = argv[++index] ?? "";
    else if (argument.startsWith("--base=")) parsed.base = argument.slice("--base=".length);
    else if (argument === "--head") parsed.head = argv[++index] ?? "";
    else if (argument.startsWith("--head=")) parsed.head = argument.slice("--head=".length);
    else if (argument === "--json") parsed.json = true;
    else if (argument === "--help" || argument === "-h") {
      process.stdout.write("Usage: fingerprint-review-state.mjs [--repo PATH] [--repository-id OWNER/REPO] --mode commit|index|worktree [--base SHA] [--head SHA] [--json]\n");
      process.exit(0);
    } else fail(`unknown argument ${argument}`);
  }
  if (!MODES.has(parsed.mode)) fail("--mode must be commit, index, or worktree");
  return parsed;
}

function resolveCommit(spec, cwd, label) {
  if (!spec) fail(`${label} is required`);
  const sha = gitText(["rev-parse", "--verify", `${spec}^{commit}`], cwd);
  if (!/^[0-9a-f]{40}$/i.test(sha)) fail(`${label} did not resolve to a full commit SHA`);
  return sha.toLowerCase();
}

function textFromPathBuffer(buffer, label) {
  const value = buffer.toString("utf8");
  if (!Buffer.from(value, "utf8").equals(buffer)) fail(`${label} contains a non-UTF-8 Git path; refuse an ambiguous JSON receipt`);
  return value;
}

function splitNul(buffer) {
  const entries = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    entries.push(buffer.subarray(start, index));
    start = index + 1;
  }
  if (start < buffer.length) entries.push(buffer.subarray(start));
  return entries;
}

function parseNameStatus(buffer, source) {
  const tokens = splitNul(buffer);
  const records = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const statusToken = tokens[index];
    if (statusToken.length === 0) continue;
    const status = statusToken.toString("ascii");
    const pathToken = tokens[++index];
    if (!pathToken) fail(`${source} returned an invalid --name-status record`);
    let path = textFromPathBuffer(pathToken, `${source} path`);
    const code = status[0];
    let previousPath;
    if (code === "R" || code === "C") {
      const destination = tokens[++index];
      if (!destination) fail(`${source} rename/copy record is missing its destination path`);
      previousPath = path;
      path = textFromPathBuffer(destination, `${source} destination path`);
    }
    records.push({ source, status, path, ...(previousPath ? { previousPath } : {}) });
  }
  return records;
}

function parsePorcelain(buffer) {
  const tokens = splitNul(buffer);
  const records = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.length === 0) continue;
    if (token.length < 4 || token[2] !== 32) fail("git status returned an invalid porcelain v1 record");
    const status = token.subarray(0, 2).toString("ascii");
    const path = textFromPathBuffer(token.subarray(3), "status path");
    let previousPath;
    if (status.includes("R") || status.includes("C")) {
      const previous = tokens[++index];
      if (!previous) fail("git status rename/copy record is missing its previous path");
      previousPath = textFromPathBuffer(previous, "status previous path");
    }
    records.push({ source: "worktree", status, path, ...(previousPath ? { previousPath } : {}) });
  }
  return records;
}

function sortedRecords(records) {
  return [...records].sort((left, right) => {
    for (const key of ["source", "status", "path", "previousPath"]) {
      const compared = String(left[key] ?? "").localeCompare(String(right[key] ?? ""));
      if (compared !== 0) return compared;
    }
    return 0;
  });
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function confinedPath(repoRoot, path) {
  if (!path || isAbsolute(path) || path.includes("\\")) fail(`unsafe changed path ${JSON.stringify(path)}`);
  const absolute = resolve(repoRoot, path);
  const local = relative(repoRoot, absolute);
  if (!local || local.startsWith("..") || isAbsolute(local)) fail(`changed path escapes repository root: ${JSON.stringify(path)}`);
  return absolute;
}

function snapshotWorkingPath(repoRoot, path) {
  const absolute = confinedPath(repoRoot, path);
  try {
    const stat = lstatSync(absolute);
    if (stat.isFile()) return { path, kind: "file", bytes: readFileSync(absolute) };
    if (stat.isSymbolicLink()) return { path, kind: "symlink", bytes: Buffer.from(readlinkSync(absolute), "utf8") };
    if (stat.isDirectory()) return { path, kind: "directory", bytes: Buffer.alloc(0) };
    return { path, kind: "other", bytes: Buffer.alloc(0) };
  } catch (error) {
    if (error?.code === "ENOENT") return { path, kind: "missing", bytes: Buffer.alloc(0) };
    throw error;
  }
}

function snapshotsFor(records, repoRoot) {
  const paths = new Set();
  for (const record of records) {
    if (record.status === "??" || !record.status.startsWith("D")) paths.add(record.path);
  }
  return [...paths].sort((left, right) => left.localeCompare(right)).map((path) => snapshotWorkingPath(repoRoot, path));
}

function hashSnapshotMetadata(snapshot) {
  return { path: snapshot.path, kind: snapshot.kind, sha256: createHash("sha256").update(snapshot.bytes).digest("hex"), bytes: snapshot.bytes.length };
}

function frame(parts, name, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  parts.push(Buffer.from(name, "utf8"), NULL, Buffer.from(String(bytes.length), "ascii"), NULL, bytes, NULL);
}

function buildIdentity({ repositoryId, mode, base, head, changedFiles, excluded, candidateBinaryFields, excludedBinaryFields = [], snapshots, excludedSnapshots = [] }) {
  const parts = [Buffer.from("review-loop-candidate-state-v1\0", "utf8")];
  frame(parts, "repositoryId", repositoryId);
  frame(parts, "mode", mode);
  frame(parts, "base", base ?? "");
  frame(parts, "head", head ?? "");
  frame(parts, "changedFiles", stableJson(sortedRecords(changedFiles)));
  frame(parts, "excluded", stableJson(excluded));
  for (const [name, bytes] of candidateBinaryFields) frame(parts, name, bytes);
  for (const snapshot of snapshots) {
    frame(parts, `snapshot:${snapshot.path}:kind`, snapshot.kind);
    frame(parts, `snapshot:${snapshot.path}:bytes`, snapshot.bytes);
  }
  for (const [name, bytes] of excludedBinaryFields) frame(parts, `excluded:${name}`, bytes);
  for (const snapshot of excludedSnapshots) {
    frame(parts, `excludedSnapshot:${snapshot.path}:kind`, snapshot.kind);
    frame(parts, `excludedSnapshot:${snapshot.path}:bytes`, snapshot.bytes);
  }
  const stream = Buffer.concat(parts);
  return {
    schemaVersion: VERSION,
    repositoryId,
    mode,
    base: base ?? null,
    head: head ?? null,
    sha256: createHash("sha256").update(stream).digest("hex"),
    changedFiles: sortedRecords(changedFiles),
    excluded,
    fileSnapshots: snapshots.map(hashSnapshotMetadata),
    excludedFileSnapshots: excludedSnapshots.map(hashSnapshotMetadata),
    canonicalByteLength: stream.length,
  };
}

function untrackedRecords(cwd) {
  return splitNul(runGit(["ls-files", "--others", "--exclude-standard", "-z"], cwd))
    .filter((entry) => entry.length > 0)
    .map((entry) => ({ source: "untracked", status: "??", path: textFromPathBuffer(entry, "untracked path") }));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repositoryRoot = gitText(["rev-parse", "--show-toplevel"], resolve(options.repo));
  const repositoryId = options.repositoryId || basename(repositoryRoot);
  if (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)?$/.test(repositoryId)) {
    fail("--repository-id must be a sanitized name or owner/repository identifier");
  }
  const base = options.base ? resolveCommit(options.base, repositoryRoot, "--base") : resolveCommit("HEAD", repositoryRoot, "HEAD");

  let identity;
  if (options.mode === "commit") {
    const head = resolveCommit(options.head, repositoryRoot, "--head");
    const statuses = parseNameStatus(runGit(["diff", "--name-status", "-z", "--find-renames=50%", base, head], repositoryRoot), "commit");
    const diff = runGit(["diff", ...DIFF_OPTIONS, base, head], repositoryRoot);
    identity = buildIdentity({
      repositoryId,
      mode: options.mode,
      base,
      head,
      changedFiles: statuses,
      excluded: { unstaged: [], untracked: [] },
      candidateBinaryFields: [["commitDiff", diff]],
      snapshots: [],
    });
  } else if (options.mode === "index") {
    const staged = parseNameStatus(runGit(["diff", "--cached", "--name-status", "-z", "--find-renames=50%", base], repositoryRoot), "index");
    const unstaged = parseNameStatus(runGit(["diff", "--name-status", "-z", "--find-renames=50%"], repositoryRoot), "unstaged");
    const untracked = untrackedRecords(repositoryRoot);
    const stagedDiff = runGit(["diff", "--cached", ...DIFF_OPTIONS, base], repositoryRoot);
    const unstagedDiff = runGit(["diff", ...DIFF_OPTIONS], repositoryRoot);
    const untrackedSnapshots = snapshotsFor(untracked, repositoryRoot);
    identity = buildIdentity({
      repositoryId,
      mode: options.mode,
      base,
      head: null,
      changedFiles: staged,
      excluded: { unstaged: sortedRecords(unstaged), untracked: sortedRecords(untracked) },
      candidateBinaryFields: [["indexDiff", stagedDiff]],
      excludedBinaryFields: [["unstagedDiff", unstagedDiff]],
      snapshots: [],
      excludedSnapshots: untrackedSnapshots,
    });
  } else {
    const status = parsePorcelain(runGit(["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=none"], repositoryRoot));
    const stagedDiff = runGit(["diff", "--cached", ...DIFF_OPTIONS, base], repositoryRoot);
    const unstagedDiff = runGit(["diff", ...DIFF_OPTIONS], repositoryRoot);
    const snapshots = snapshotsFor(status, repositoryRoot);
    identity = buildIdentity({
      repositoryId,
      mode: options.mode,
      base,
      head: null,
      changedFiles: status,
      excluded: { unstaged: [], untracked: [] },
      candidateBinaryFields: [["stagedDiff", stagedDiff], ["unstagedDiff", unstagedDiff]],
      snapshots,
    });
  }

  if (options.json) process.stdout.write(`${JSON.stringify(identity, null, 2)}\n`);
  else process.stdout.write(`${identity.sha256}\n`);
}

try {
  main();
} catch (error) {
  if (!process.exitCode) {
    process.stderr.write(`review-loop fingerprint: ${error.message}\n`);
    process.exitCode = 1;
  }
}
