// Helpers shared by review-t0, review-t1 and review-run: git access, child processes in
// their own group, the working-tree fingerprint and report files.

import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { closeSync, lstatSync, mkdirSync, openSync, readlinkSync, readSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

export const LOCKFILES = new Set([
  "pnpm-lock.yaml", "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "bun.lock",
  "Cargo.lock", "go.mod", "poetry.lock", "uv.lock", "Pipfile.lock", "requirements.txt",
  "Gemfile.lock", "composer.lock", "pubspec.lock", "mix.lock", "gradle.lockfile",
]);
const GENERATED_DIRS = new Set(["node_modules", "dist", "build", "out", "vendor", "coverage", ".next", ".turbo", "generated", "__generated__"]);
// Process groups still running, so a signal handler can stop them. Once stopping,
// run() starts nothing new, so a step that ends during shutdown cannot spawn the next.
export const activeGroups = new Set();
let stopping = false;

// Pathspecs are literal and user diff settings (noprefix, external diff, colors) never apply.
// `okStatus` lists the exit codes that mean success (`diff --no-index` exits 1 on a difference).
export function git(root, args, { allowFailure = false, okStatus = [0] } = {}) {
  const result = spawnSync("git", ["-C", root, "-c", "core.quotepath=off", "-c", "diff.noprefix=false", "-c", "diff.mnemonicPrefix=false", "-c", "diff.relative=false", ...args], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    env: { ...process.env, GIT_LITERAL_PATHSPECS: "1", GIT_EXTERNAL_DIFF: "" },
  });
  if (!okStatus.includes(result.status)) {
    if (allowFailure) return null;
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

// Lines a person reads: lockfiles, generated or vendored files and snapshots do not count.
export const reviewable = (file) => !isGenerated(file) && !LOCKFILES.has(basename(file)) && !/\.snap$/.test(file);

export function isGenerated(file) {
  return file.split("/").some((segment) => GENERATED_DIRS.has(segment)) || /\.min\.[a-z]+$|\.map$/.test(file);
}

// `output` interleaves stdout and stderr, keeping the last 4 MB; `stdout` is kept apart
// for tools that answer on stdout. `input` is written to stdin when given.
export function run(command, args, { cwd, timeoutMs = 300_000, env = process.env, input } = {}) {
  if (stopping) return Promise.resolve({ code: 130, output: "cancelled", stdout: "", timedOut: false, durationMs: 0 });
  return new Promise((resolvePromise) => {
    const started = Date.now();
    // Own process group, so a timeout or Ctrl-C stops the whole tool tree.
    const child = spawn(command, args, { cwd, env, detached: true, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] });
    if (child.pid) activeGroups.add(child.pid);
    const output = lastBytes();
    const stdout = lastBytes();
    child.stdout.on("data", output.push);
    child.stdout.on("data", stdout.push);
    child.stderr.on("data", output.push);
    if (input !== undefined) {
      // A tool that exits without reading its input must not crash the caller.
      child.stdin.on("error", () => {});
      child.stdin.end(input);
    }
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup(child.pid, "SIGTERM");
      setTimeout(() => killGroup(child.pid, "SIGKILL"), 5000).unref();
    }, timeoutMs);
    const finish = (code, text) => {
      activeGroups.delete(child.pid);
      clearTimeout(timer);
      resolvePromise({ code, output: text ?? output.text(), stdout: stdout.text(), timedOut, durationMs: Date.now() - started });
    };
    child.on("error", (error) => finish(127, String(error.message)));
    child.on("close", (code) => finish(code ?? 1));
  });
}

function lastBytes(limit = 4 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  return {
    push: (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      while (size > limit && chunks.length > 1) size -= chunks.shift().length;
    },
    text: () => Buffer.concat(chunks).toString("utf8"),
  };
}

export function killGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch {
    // The group already exited.
  }
}

// On Ctrl-C: SIGTERM every running group, then SIGKILL whatever outlives `graceMs`,
// so a tool that ignores SIGTERM cannot keep running (and spending) after we exit.
export async function stopGroups(graceMs = 3000) {
  stopping = true;
  const groups = [...activeGroups];
  for (const pid of groups) killGroup(pid, "SIGTERM");
  const deadline = Date.now() + graceMs;
  while (groups.some(groupAlive) && Date.now() < deadline) await new Promise((wake) => setTimeout(wake, 100));
  for (const pid of groups) killGroup(pid, "SIGKILL");
}

// Only "no such process" means gone; any other error leaves the group to SIGKILL.
function groupAlive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

export function tail(text, lines = 60) {
  return text.trimEnd().split("\n").slice(-lines).join("\n");
}

export function readJson(read) {
  try {
    return JSON.parse(read());
  } catch {
    return null;
  }
}

// Status plus the content and mode of every changed or untracked path: a check that
// rewrites a file changes it, and so does any edit between review-t0 and review-t1.
// Ignored output does not count.
export function treeFingerprint(root) {
  const hash = createHash("sha256");
  const status = git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames"]);
  hash.update(status);
  for (const record of status.split("\0").filter(Boolean)) {
    const file = record.slice(3);
    hash.update(`${file}\0${pathDigest(join(root, file))}\0`);
  }
  return hash.digest("hex");
}

// Symlinks are never followed: their target text is what counts.
function pathDigest(path) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    return "gone";
  }
  if (stat.isSymbolicLink()) return `link ${readlinkSync(path)}`;
  if (!stat.isFile()) return `mode ${stat.mode}`;
  return `mode ${stat.mode} ${fileDigest(path)}`;
}

// Read in 1 MB blocks, so large files are hashed without loading them whole.
function fileDigest(path) {
  const hash = createHash("sha256");
  const buffer = Buffer.alloc(1024 * 1024);
  const descriptor = openSync(path, "r");
  try {
    for (let read; (read = readSync(descriptor, buffer, 0, buffer.length, null)) > 0;) hash.update(buffer.subarray(0, read));
  } finally {
    closeSync(descriptor);
  }
  return hash.digest("hex");
}

// Where a tool writes its report when no path is given; review-t1 finds T0's report here.
export function defaultReportPath(tool, root, headSha, dirty) {
  return join(process.env.TMPDIR || tmpdir(), tool, `${basename(root)}-${headSha.slice(0, 12)}${dirty ? "-dirty" : ""}.json`);
}

// Written through a fresh temporary file and renamed, so an existing symlink at the
// path is replaced instead of followed and the file is always private (mode 600).
export function writePrivateFile(path, text) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text, { flag: "wx", mode: 0o600 });
  renameSync(temporary, path);
}

export function writeReport(path, report) {
  writePrivateFile(path, `${JSON.stringify(report, null, 2)}\n`);
}

export function resolveBase(root, requested) {
  const candidates = requested
    ? [requested]
    : [git(root, ["symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"], { allowFailure: true })?.trim(), "origin/main", "origin/master", "main", "master"];
  for (const ref of candidates.filter(Boolean)) {
    if (git(root, ["rev-parse", "--verify", "-q", `${ref}^{commit}`], { allowFailure: true }) === null) continue;
    const sha = git(root, ["merge-base", "HEAD", ref], { allowFailure: true })?.trim();
    if (sha) return { ref, sha };
  }
  throw new Error(requested ? `base ${requested} is not a commit with a merge-base` : "no default branch found; pass --base <ref>");
}

// Changed paths (deletions included) and added line numbers per surviving file.
// Paths come from -z output. The patch is one diff split on "diff --git" lines,
// in the same order as the path list; content lines always start with +, -, space
// or "\\", so file headers never need parsing. "all" marks files to scan whole:
// untracked files and text that git shows as binary (a -diff attribute).
export function collectChanges(root, base, head = null) {
  const range = head ? [base, head] : [base];
  const fields = git(root, ["diff", "--name-status", "-z", "-M", "--no-ext-diff", ...range, "--"]).split("\0");
  const entries = [];
  for (let index = 0; index < fields.length && fields[index];) {
    const code = fields[index++];
    if (code.startsWith("R") || code.startsWith("C")) entries.push({ code: code[0], from: fields[index++], path: fields[index++] });
    else entries.push({ code: code[0], path: fields[index++] });
  }
  const patches = entries.length
    ? git(root, ["diff", "-U0", "--no-color", "--no-ext-diff", "-M", ...range, "--"]).split(/^(?=diff --git )/m).filter((piece) => piece.startsWith("diff --git "))
    : [];
  if (patches.length !== entries.length) throw new Error(`diff has ${patches.length} file patches for ${entries.length} changed paths`);
  const changed = [];
  const added = new Map();
  const renamed = new Map();
  entries.forEach((entry, index) => {
    changed.push(entry.path);
    if (entry.code === "R") renamed.set(entry.path, entry.from);
    if (entry.code === "D") return;
    const lines = new Set();
    let binary = false;
    for (const line of patches[index].split("\n")) {
      if (line.startsWith("Binary files ")) binary = true;
      const hunk = line.startsWith("@@") && line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (!hunk) continue;
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let offset = 0; offset < count; offset += 1) lines.add(Number(hunk[1]) + offset);
    }
    added.set(entry.path, binary ? "all" : lines);
  });
  for (const file of head ? [] : git(root, ["ls-files", "-z", "--others", "--exclude-standard"]).split("\0").filter(Boolean)) {
    changed.push(file);
    added.set(file, "all");
  }
  return { changed, added, renamed };
}
