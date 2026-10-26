#!/usr/bin/env node
// review-t0: deterministic pre-review of the current diff, run locally before
// any model reviewer. Scanners only report what the diff added; repository
// checks run the repo's own typecheck, lint and affected tests.
// Contract: ../references/t0.md. Exit 0 = PASS, 1 = BLOCKED, 2 = usage error.

import { spawnSync } from "node:child_process";
import { closeSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultReportPath, git, isGenerated, LOCKFILES, readJson, run, stopGroups, tail, treeFingerprint, writeReport } from "./lib/repo.mjs";

const RULES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../rules");
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
// Checks must never rewrite the tree: skip fixers, formatters and baseline/snapshot updaters.
// A tree fingerprint around every check catches whatever these patterns miss.
const MUTATING_COMMAND = /--write\b|--fix\b|--apply\b|--update[-A-Za-z]*(?=\s|=|$)|\s-[uw](?=\s|$)|prettier\s(?!.*--check)|lint-staged/;
const MUTATING_NAME = /:(fix|write|format|update|baseline|generate|gen|regen|snapshot|accept|record|bless|seed|reset|clean)\b/;
const MAX_SECRET_SCAN_BYTES = 20 * 1024 * 1024;
const MAX_CODE_SCAN_BYTES = 1024 * 1024;
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };
let scratchDir = null;

const USAGE = `usage: review-t0 [-C <dir>] [--base <ref>] [--json <file>] [--wrap <cmd>]
                 [--no-checks] [--no-tests] [--strict] [--check-timeout <seconds>] [--plan]

Reviews the working tree (committed, staged, unstaged and untracked changes)
against its merge-base with the default branch, or with --base <ref>.

  --base <ref>            compare against the merge-base with <ref>
  --json <file>           report path (default: $TMPDIR/review-t0/<repo>-<head>.json)
  --wrap <cmd>            prefix for repository checks, e.g. a local job queue (env REVIEW_T0_WRAP)
  --no-checks             scanners only; skip typecheck, lint and tests
  --no-tests              skip affected tests
  --strict                a missing scanner blocks instead of marking the result incomplete
  --check-timeout <s>     per-check timeout in seconds (default 1200)
  --plan                  print the repository checks that would run, then exit`;

function parseArgs(argv) {
  const options = { cwd: process.cwd(), base: null, json: null, wrap: process.env.REVIEW_T0_WRAP || "", checks: true, tests: true, strict: false, checkTimeout: 1200, plan: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined) usage(`${arg} needs a value`);
      index += 1;
      return next;
    };
    if (arg === "-C") options.cwd = resolve(value());
    else if (arg === "--base") options.base = value();
    else if (arg === "--json") options.json = resolve(value());
    else if (arg === "--wrap") options.wrap = value();
    else if (arg === "--no-checks") options.checks = false;
    else if (arg === "--no-tests") options.tests = false;
    else if (arg === "--strict") options.strict = true;
    else if (arg === "--plan") options.plan = true;
    else if (arg === "--check-timeout") options.checkTimeout = Number(value());
    else if (arg === "-h" || arg === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else usage(`unknown argument ${arg}`);
  }
  if (!Number.isFinite(options.checkTimeout) || options.checkTimeout <= 0) usage("--check-timeout must be a positive number");
  return options;
}

function usage(message) {
  console.error(`review-t0: ${message}\n\n${USAGE}`);
  process.exit(2);
}

function hasCommand(command) {
  return spawnSync("sh", ["-c", `command -v "$1" >/dev/null 2>&1`, "sh", command]).status === 0;
}

function resolveBase(root, requested) {
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
function collectChanges(root, base) {
  const fields = git(root, ["diff", "--name-status", "-z", "-M", "--no-ext-diff", base, "--"]).split("\0");
  const entries = [];
  for (let index = 0; index < fields.length && fields[index];) {
    const code = fields[index++];
    if (code.startsWith("R") || code.startsWith("C")) entries.push({ code: code[0], from: fields[index++], path: fields[index++] });
    else entries.push({ code: code[0], path: fields[index++] });
  }
  const patches = entries.length
    ? git(root, ["diff", "-U0", "--no-color", "--no-ext-diff", "-M", base, "--"]).split(/^(?=diff --git )/m).filter((piece) => piece.startsWith("diff --git "))
    : [];
  if (patches.length !== entries.length) throw new Error(`diff has ${patches.length} file patches for ${entries.length} changed paths`);
  const changed = [];
  const added = new Map();
  entries.forEach((entry, index) => {
    changed.push(entry.path);
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
  for (const file of git(root, ["ls-files", "-z", "--others", "--exclude-standard"]).split("\0").filter(Boolean)) {
    changed.push(file);
    added.set(file, "all");
  }
  return { changed, added };
}

function isAdded(added, file, start, end = start) {
  const lines = added.get(file);
  if (lines === "all") return true;
  if (!lines) return false;
  for (let line = start; line <= end; line += 1) if (lines.has(line)) return true;
  return false;
}

// Secret scanning sees every text file the diff touched; code rules skip
// generated, minified, oversized and .semgrepignore'd files. Skips are reported.
function scanTargets(root, added) {
  const ignored = semgrepIgnored(root);
  const secret = [];
  const code = [];
  const skipped = [];
  for (const file of added.keys()) {
    let stat;
    try {
      stat = lstatSync(join(root, file));
    } catch {
      continue;
    }
    // A changed symlink is never followed, so it cannot pull in files from outside the repo.
    if (stat.isSymbolicLink()) skipped.push({ file, reason: "symlink" });
    else if (!stat.isFile()) skipped.push({ file, reason: "not a regular file" });
    else if (stat.size > MAX_SECRET_SCAN_BYTES) skipped.push({ file, reason: "over 20 MB" });
    else {
      const head = readHead(join(root, file));
      if (head.includes(0)) {
        skipped.push({ file, reason: "binary" });
        continue;
      }
      secret.push(file);
      const reason = stat.size > MAX_CODE_SCAN_BYTES ? "over 1 MB"
        : isGenerated(file) ? "generated or vendored"
        : head.toString("utf8").split("\n").some((line) => line.length > 2000) ? "minified"
        : ignored(file) ? ".semgrepignore"
        : null;
      if (reason) skipped.push({ file, reason: `${reason} (code rules only)` });
      else code.push(file);
    }
  }
  return { secret, code, skipped };
}

function readHead(path) {
  const buffer = Buffer.alloc(16_000);
  const descriptor = openSync(path, "r");
  try {
    return buffer.subarray(0, readSync(descriptor, buffer, 0, buffer.length, 0));
  } finally {
    closeSync(descriptor);
  }
}

// Semgrep ignores .semgrepignore for explicit targets, so apply it here.
// Supported gitignore subset: anchored or floating paths, trailing "/", "*", "?", "**", [classes].
function semgrepIgnored(root) {
  const file = join(root, ".semgrepignore");
  if (!existsSync(file)) return () => false;
  const patterns = readFileSync(file, "utf8").split("\n").map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!") && !line.startsWith(":"))
    .map(globToRegExp);
  return (path) => patterns.some((pattern) => pattern.test(path));
}

function globToRegExp(pattern) {
  let glob = pattern.replace(/\/$/, "");
  const floating = !glob.includes("/") || glob.startsWith("**/");
  glob = glob.replace(/^\//, "").replace(/^\*\*\//, "");
  let source = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*" && glob[index + 1] === "*") {
      if (glob[index + 2] === "/") {
        source += "(?:.*/)?";
        index += 2;
      } else {
        source += ".*";
        index += 1;
      }
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else if (char === "[") {
      const end = glob.indexOf("]", index);
      if (end === -1) source += "\\[";
      else {
        source += glob.slice(index, end + 1);
        index = end;
      }
    } else source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${floating ? "(^|/)" : "^"}${source}(/|$)`);
}

// Tools may print warnings before their JSON document.
function jsonFromOutput(output) {
  const start = output.indexOf("{");
  return start === -1 ? null : readJson(() => output.slice(start));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---- scanners -------------------------------------------------------------

function conflictMarkers(root, added, files) {
  const findings = [];
  for (const file of files) {
    readFileSync(join(root, file), "utf8").split("\n").forEach((text, index) => {
      if (/^(<{7}|>{7}) /.test(text) && isAdded(added, file, index + 1)) {
        findings.push({ source: "t0", rule: "conflict-marker", severity: "error", lens: "contract", file, line: index + 1, message: "Leftover merge conflict marker." });
      }
    });
  }
  return { status: findings.length ? "findings" : "ok", findings };
}

function manifestDrift(root, base, changed) {
  const lockfileChanged = changed.some((file) => LOCKFILES.has(basename(file)));
  const repoHasLockfile = [...LOCKFILES].some((name) => existsSync(join(root, name)));
  if (lockfileChanged || !repoHasLockfile) return { status: "ok", findings: [] };
  const findings = [];
  for (const file of changed.filter((candidate) => basename(candidate) === "package.json" && existsSync(join(root, candidate)))) {
    const head = readJson(() => readFileSync(join(root, file), "utf8"));
    const before = readJson(() => git(root, ["show", `${base}:${file}`], { allowFailure: true }) ?? "{}");
    const changedFields = DEPENDENCY_FIELDS.filter((field) => JSON.stringify(head?.[field] ?? {}) !== JSON.stringify(before?.[field] ?? {}));
    if (changedFields.length) {
      findings.push({ source: "t0", rule: "manifest-without-lockfile", severity: "warning", lens: "contract", file, line: 1, message: `${changedFields.join(", ")} changed but no lockfile changed; install and commit the lockfile.` });
    }
  }
  return { status: findings.length ? "findings" : "ok", findings };
}

function gitleaksArgs(root, report) {
  const args = ["--no-banner", "--log-level", "error", "--redact", "--exit-code", "0", "--report-format", "json", "--report-path", report];
  if (existsSync(join(root, ".gitleaks.toml"))) args.push("--config", join(root, ".gitleaks.toml"));
  if (existsSync(join(root, ".gitleaksignore"))) args.push("--gitleaks-ignore-path", join(root, ".gitleaksignore"));
  return args;
}

// Two passes: the files as they are now (added lines only), and every commit
// on the branch, because a key committed and later deleted is still in history.
async function gitleaks(root, base, added, files, scratch) {
  if (!hasCommand("gitleaks")) return { status: "missing", findings: [], detail: "gitleaks not installed" };
  const findings = [];
  if (files.length) {
    const mirror = join(scratch, "gitleaks-src");
    for (const file of files) {
      mkdirSync(dirname(join(mirror, file)), { recursive: true });
      copyFileSync(join(root, file), join(mirror, file));
    }
    const report = join(scratch, "gitleaks-dir.json");
    // Scanning "." from inside the mirror keeps paths and fingerprints repo-relative,
    // so the repository's .gitleaksignore entries match.
    const result = await run("gitleaks", ["dir", ".", ...gitleaksArgs(root, report)], { cwd: mirror });
    if (result.code !== 0) return { status: "error", findings: [], detail: tail(result.output, 10) };
    for (const leak of readJson(() => readFileSync(report, "utf8")) ?? []) {
      const file = leak.File.replace(/^\.\//, "");
      if (!isAdded(added, file, leak.StartLine, leak.EndLine || leak.StartLine)) continue;
      findings.push({ source: "gitleaks", rule: leak.RuleID, severity: "error", lens: "sec", file, line: leak.StartLine, message: `${leak.Description} (value redacted)` });
    }
  }
  if (git(root, ["rev-list", "--count", `${base}..HEAD`]).trim() !== "0") {
    const report = join(scratch, "gitleaks-history.json");
    // gitleaks parses `git log -p`; neutralize user diff settings that rewrite its paths.
    const env = { ...process.env, GIT_CONFIG_COUNT: "3", GIT_CONFIG_KEY_0: "diff.noprefix", GIT_CONFIG_VALUE_0: "false", GIT_CONFIG_KEY_1: "diff.mnemonicPrefix", GIT_CONFIG_VALUE_1: "false", GIT_CONFIG_KEY_2: "diff.relative", GIT_CONFIG_VALUE_2: "false", GIT_EXTERNAL_DIFF: "" };
    const result = await run("gitleaks", ["git", "--log-opts", `${base}..HEAD`, ...gitleaksArgs(root, report), "."], { cwd: root, env });
    if (result.code !== 0) return { status: "error", findings, detail: tail(result.output, 10) };
    const current = new Set(findings.map((finding) => `${finding.rule}:${finding.file}`));
    for (const leak of readJson(() => readFileSync(report, "utf8")) ?? []) {
      if (current.has(`${leak.RuleID}:${leak.File}`)) continue;
      current.add(`${leak.RuleID}:${leak.File}`);
      findings.push({ source: "gitleaks", rule: leak.RuleID, severity: "error", lens: "sec", file: leak.File, line: leak.StartLine, message: `${leak.Description} in branch history, commit ${String(leak.Commit).slice(0, 8)}; rotate the credential if the branch was ever pushed, then rewrite the branch (value redacted)` });
    }
  }
  return { status: findings.length ? "findings" : "ok", findings };
}

async function semgrep(root, added, files) {
  if (!hasCommand("semgrep")) return { status: "missing", findings: [], detail: "semgrep not installed" };
  if (!files.length) return { status: "ok", findings: [] };
  const configs = ["--config", RULES_DIR];
  for (const local of [".semgrep", ".semgrep.yml", ".semgrep.yaml"]) {
    if (existsSync(join(root, local))) configs.push("--config", join(root, local));
  }
  const findings = [];
  const errors = [];
  for (let offset = 0; offset < files.length; offset += 1000) {
    const batch = files.slice(offset, offset + 1000);
    const result = await run("semgrep", ["scan", ...configs, "--json", "--metrics=off", "--disable-version-check", "--quiet", "--timeout", "30", "--", ...batch], { cwd: root });
    const report = jsonFromOutput(result.output);
    if (!report) return { status: "error", findings: [], detail: tail(result.output, 10) };
    errors.push(...(report.errors ?? []).filter((error) => error.level === "error"));
    for (const match of report.results ?? []) {
      const file = match.path.replace(/^\.\//, "");
      if (!isAdded(added, file, match.start.line, match.end.line)) continue;
      const metadata = match.extra?.metadata ?? {};
      if (suppressedByFile(root, file, match, metadata["t0-suppress-if-file-matches"])) continue;
      findings.push({
        source: "semgrep",
        rule: match.check_id.split(".").pop(),
        severity: { ERROR: "error", WARNING: "warning" }[match.extra?.severity] ?? "info",
        lens: metadata.lens ?? "contract",
        file,
        line: match.start.line,
        endLine: match.end.line,
        message: String(match.extra?.message ?? "").replace(/\s+/g, " ").trim(),
      });
    }
  }
  const detail = errors.length ? `${errors.length} rule/parse error(s): ${errors[0].message?.split("\n")[0] ?? ""}` : undefined;
  return { status: findings.length ? "findings" : errors.length ? "error" : "ok", findings, detail };
}

// A rule may name a file-level signal that proves the risk is handled.
// "{receiver}" stands for the object the match calls into (cache.set → cache).
function suppressedByFile(root, file, match, pattern) {
  if (!pattern) return false;
  const content = readFileSync(join(root, file), "utf8");
  const matched = Buffer.from(content).subarray(match.start.offset, match.end.offset).toString("utf8");
  const receiver = matched.match(/^(?:this\.)?([A-Za-z_$][\w$]*)/)?.[1] ?? "\\0no-receiver";
  return new RegExp(pattern.replaceAll("{receiver}", escapeRegExp(receiver))).test(content);
}

async function osvScanner(root, base, changed, scratch) {
  const lockfiles = changed.filter((file) => LOCKFILES.has(basename(file)) && existsSync(join(root, file)));
  if (!lockfiles.length) return { status: "skipped", findings: [], detail: "no lockfile change" };
  if (!hasCommand("osv-scanner")) return { status: "missing", findings: [], detail: "osv-scanner not installed" };
  const findings = [];
  for (const [index, file] of lockfiles.entries()) {
    const head = await osvScan(join(root, file));
    if (head.error) return { status: "error", findings, detail: `${file}: ${head.error}` };
    const previous = git(root, ["show", `${base}:${file}`], { allowFailure: true });
    let known = new Set();
    if (previous !== null) {
      const baseDir = join(scratch, "osv-base", String(index));
      mkdirSync(baseDir, { recursive: true });
      writeFileSync(join(baseDir, basename(file)), previous);
      const before = await osvScan(join(baseDir, basename(file)));
      if (before.error) return { status: "error", findings, detail: `${file} at base: ${before.error}` };
      known = new Set(before.vulnerabilities.map((vulnerability) => vulnerability.key));
    }
    for (const vulnerability of head.vulnerabilities.filter((candidate) => !known.has(candidate.key))) {
      findings.push({
        source: "osv-scanner",
        rule: vulnerability.id,
        severity: vulnerability.score >= 7 ? "error" : "warning",
        lens: "sec",
        file,
        line: null,
        message: `${vulnerability.package} ${vulnerability.version}: ${vulnerability.id}${vulnerability.score ? ` (CVSS ${vulnerability.score})` : " (no CVSS score)"} ${vulnerability.summary}`.trim(),
      });
    }
  }
  return { status: findings.length ? "findings" : "ok", findings };
}

async function osvScan(lockfile) {
  const result = await run("osv-scanner", ["scan", "source", "--lockfile", lockfile, "--format", "json", "--verbosity", "error"], { timeoutMs: 180_000 });
  // 0 = clean, 1 = vulnerabilities found, 128 = no packages found.
  if (result.code === 128) return { vulnerabilities: [] };
  const report = jsonFromOutput(result.output);
  if (![0, 1].includes(result.code) || !report) return { error: tail(result.output, 5) || `exit ${result.code}` };
  const vulnerabilities = [];
  for (const source of report.results ?? []) {
    for (const entry of source.packages ?? []) {
      const pkg = entry.package ?? {};
      for (const group of entry.groups ?? []) {
        const id = group.ids?.[0];
        const detail = (entry.vulnerabilities ?? []).find((candidate) => candidate.id === id);
        vulnerabilities.push({
          // Keyed without the version: a partial upgrade that still carries a
          // known vulnerability is not new.
          key: `${pkg.ecosystem}:${pkg.name}:${id}`,
          id,
          package: pkg.name,
          version: pkg.version,
          score: Number(group.max_severity) || 0,
          summary: detail?.summary ?? "",
        });
      }
    }
  }
  return { vulnerabilities };
}

// ---- repository checks ----------------------------------------------------

function discoverChecks(root, base, options) {
  const configPath = join(root, ".review-t0.json");
  if (existsSync(configPath)) {
    const config = readJson(() => readFileSync(configPath, "utf8"));
    const valid = config && Array.isArray(config.checks ?? [])
      && (config.checks ?? []).every((check) => typeof check?.name === "string" && typeof check?.run === "string")
      && ["string", "undefined", "boolean"].includes(typeof config.tests);
    if (!valid) throw new Error(".review-t0.json must be {\"checks\": [{\"name\": string, \"run\": string}], \"tests\"?: string | false}");
    const checks = (config.checks ?? []).map((check) => ({ name: check.name, command: check.run.replaceAll("{base}", base) }));
    if (options.tests && typeof config.tests === "string") checks.push({ name: "tests (affected)", command: config.tests.replaceAll("{base}", base), env: { CI: "1" } });
    return { source: ".review-t0.json", checks, skipped: [] };
  }
  const manifest = readJson(() => readFileSync(join(root, "package.json"), "utf8"));
  if (!manifest) return { source: "none", checks: [], skipped: ["no package.json or .review-t0.json"] };
  const scripts = manifest.scripts ?? {};
  const manager = existsSync(join(root, "pnpm-lock.yaml")) ? "pnpm" : existsSync(join(root, "yarn.lock")) ? "yarn" : existsSync(join(root, "bun.lock")) || existsSync(join(root, "bun.lockb")) ? "bun" : "npm";
  const runScript = (name) => (manager === "npm" ? `npm run --silent ${name}` : `${manager} run ${name}`);
  const exec = { pnpm: "pnpm exec", yarn: "yarn", bun: "bun x", npm: "npx --no-install" }[manager];
  const names = Object.keys(scripts);
  // Scripts a script runs: named ones, wildcard runners (run-p lint:*), and npm pre/post hooks.
  const callees = (name) => {
    const text = scripts[name] ?? "";
    const wildcards = [...text.matchAll(/(?:^|\s)["']?([\w.-]+:[\w:.-]*\*[\w:.*-]*)/g)].map((match) => new RegExp(`^${match[1].split("*").map(escapeRegExp).join(".*")}$`));
    return names.filter((other) => other !== name && (
      new RegExp(`(^|[\\s"'])${escapeRegExp(other)}(?=$|[\\s"'&;|])`).test(text)
      || wildcards.some((pattern) => pattern.test(other))
      || other === `pre${name}` || other === `post${name}`));
  };
  const reachable = (name, seen = new Set()) => {
    for (const callee of callees(name)) if (!seen.has(callee)) reachable(callee, seen.add(callee));
    return seen;
  };
  // Static check: the script's name, or the text of anything it runs, rewrites files.
  // The tree fingerprint around each check catches what this misses.
  const mutating = (name) => MUTATING_NAME.test(name) || [name, ...reachable(name)].some((script) => MUTATING_COMMAND.test(scripts[script] ?? ""));
  const checks = [];
  const skipped = [];
  const addScript = (name) => {
    if (mutating(name)) {
      skipped.push(`${name} (rewrites files)`);
      return false;
    }
    checks.push({ name, command: runScript(name) });
    return true;
  };

  const typecheck = ["typecheck", "type-check", "check-types", "tsc", "types"].find((name) => scripts[name]);
  if (typecheck) addScript(typecheck);
  const lint = ["lint", "check"].find((name) => scripts[name]);
  // Run each lint:* script once: skip those that a running lint script already reaches.
  const covered = lint && addScript(lint) ? reachable(lint) : new Set();
  const extra = names.filter((name) => name.startsWith("lint:") && !covered.has(name));
  for (const name of extra.filter((candidate) => !extra.some((other) => other !== candidate && reachable(other).has(candidate)))) addScript(name);

  if (options.tests) {
    // CI mode: snapshot runners fail on missing snapshots instead of writing them.
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    if (dependencies.vitest) checks.push({ name: "tests (vitest --changed)", command: `${exec} vitest run --changed ${base} --passWithNoTests`, env: { CI: "1" } });
    else if (dependencies.jest) checks.push({ name: "tests (jest --changedSince)", command: `${exec} jest --ci --changedSince=${base} --passWithNoTests`, env: { CI: "1" } });
    else skipped.push("tests (no vitest or jest at the repository root)");
  }
  return { source: "package.json", checks, skipped };
}

async function runChecks(root, discovered, options) {
  const results = [];
  for (const check of discovered.checks) {
    const env = { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", ...check.env };
    // The wrapper receives the whole command, so compound commands stay inside the queue.
    const args = options.wrap ? ["-c", `${options.wrap} sh -c "$1"`, "sh", check.command] : ["-c", check.command];
    const before = treeFingerprint(root);
    const result = await run("sh", args, { cwd: root, env, timeoutMs: options.checkTimeout * 1000 });
    const modified = treeFingerprint(root) !== before;
    results.push({
      name: check.name,
      command: options.wrap ? `${options.wrap} ${check.command}` : check.command,
      status: modified ? "modified" : result.timedOut ? "timeout" : result.code === 0 ? "pass" : "fail",
      exitCode: result.code,
      durationMs: result.durationMs,
      outputTail: result.code === 0 && !result.timedOut && !modified ? undefined
        : modified ? `the working tree changed while this check ran (the check wrote files, or someone edited them); inspect \`git status\` before trusting this review\n${tail(result.output, 20)}` : tail(result.output),
    });
  }
  return results;
}

// ---- route ------------------------------------------------------------------

// Docs, tests, styles, locales and assets: a diff made only of these gets the
// deep review's lowest effort and no fast pre-pass.
const LOW_RISK_FILE = /\.(md|mdx|txt|rst|adoc|css|scss|sass|less|po|pot|png|jpe?g|gif|svg|webp|avif|ico)$|\.(test|spec|e2e)\.[cm]?[jt]sx?$|_test\.(go|py)$|(^|\/)test_[^/]*\.py$|(^|\/)(docs?|__tests__|__snapshots__|tests?|e2e|fixtures?|locales?|i18n|translations?)\//i;
// Path words for the areas where the deep review runs at its highest effort.
const SENSITIVE_AREAS = Object.entries({
  auth: "auth authn authz authentication authorization authorize oauth oidc saml sso jwt session sessions login logout password passwords mfa otp permission permissions rbac acl role roles guard guards",
  tenancy: "tenant tenants tenancy multitenant multitenancy",
  credentials: "secret secrets credential credentials crypto encrypt encryption decrypt kms vault keystore apikey apikeys",
  money: "billing payment payments invoice invoices checkout wallet wallets ledger ledgers refund refunds payout payouts pricing subscription subscriptions stripe",
}).map(([area, words]) => [area, new Set(words.split(" "))]);
const MIGRATION_FILE = /(^|\/)migrations?\/|\.sql$|(^|\/)schema\.prisma$|\.migration\.[cm]?[jt]s$/i;
const T1_MIN_CHANGED_LINES = 20;
// The PR size rule (references/pr-size.md): a layer of about 400 reviewable lines,
// and past 800 lines or 30 files the change is split into a stack or says why.
const LARGE_DIFF = { lines: 800, files: 30 };
const TARGET_LINES = 400;
// Lines a person reads: lockfiles, generated or vendored files and snapshots do not count.
const reviewable = (file) => !isGenerated(file) && !LOCKFILES.has(basename(file)) && !/\.snap$/.test(file);

// Deterministic routing for the model tiers: the deep review's starting effort,
// whether the fast pre-pass (T1) is worth running, and the diff's size.
function routeChange(root, base, changed, { addedLines, reviewAdded }) {
  // -z prints "added\tdeleted\tpath", or for a rename "added\tdeleted\t" followed by
  // the old and the new path. A path may itself hold tabs; binary files print "-".
  const numstat = git(root, ["diff", "--numstat", "-z", "-M", "--no-ext-diff", base, "--"]).split("\0");
  let deletedLines = 0;
  let reviewDeleted = 0;
  for (let index = 0; index < numstat.length; index += 1) {
    const record = numstat[index];
    if (!record) continue;
    const first = record.indexOf("\t");
    const second = record.indexOf("\t", first + 1);
    const [deleted, path] = [record.slice(first + 1, second), record.slice(second + 1)];
    const file = path || numstat[(index += 2)];
    const count = Number(deleted) || 0;
    deletedLines += count;
    if (file && reviewable(file)) reviewDeleted += count;
  }
  const changedLines = addedLines + deletedLines;
  const reviewLines = reviewAdded + reviewDeleted;
  // Every changed file a person opens counts, binary and mode-only edits included.
  // A pure rename (R100, same mode; binary or text) has nothing to read.
  const raw = git(root, ["diff", "--raw", "-z", "-M", "--no-ext-diff", base, "--"]).split("\0");
  const pureRenames = new Set();
  for (let index = 0; index < raw.length; index += 1) {
    if (!raw[index].startsWith(":")) continue;
    const [oldMode, newMode, , , status] = raw[index].slice(1).split(" ");
    if (/^[RC]/.test(status)) {
      if (status === "R100" && oldMode === newMode) pureRenames.add(raw[index + 2]);
      index += 2;
    } else index += 1;
  }
  const touched = new Set(changed.filter((file) => reviewable(file) && !pureRenames.has(file)));
  // Both sides of a rename: moving code out of an auth path still touches auth.
  const paths = new Set([...changed, ...git(root, ["diff", "--name-only", "-z", "--no-renames", "--no-ext-diff", base, "--"]).split("\0").filter(Boolean)]);
  const code = [...paths].filter((file) => !isGenerated(file) && !LOCKFILES.has(basename(file)) && !LOW_RISK_FILE.test(file));
  const areas = new Map();
  for (const file of code) {
    const words = file.split(/[^A-Za-z0-9]+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/).map((word) => word.toLowerCase());
    const hits = SENSITIVE_AREAS.filter(([, set]) => words.some((word) => set.has(word))).map(([area]) => area);
    if (MIGRATION_FILE.test(file)) hits.push("migrations");
    for (const area of hits) areas.set(area, [...(areas.get(area) ?? []), file]);
  }
  return {
    effort: !code.length ? "medium" : areas.size ? "xhigh" : "high",
    reasons: [...areas].map(([area, files]) => ({ area, files: files.slice(0, 3), more: Math.max(0, files.length - 3) })),
    size: reviewLines > LARGE_DIFF.lines || touched.size > LARGE_DIFF.files ? "large" : reviewLines < 50 ? "small" : "medium",
    changedLines,
    reviewLines,
    reviewFiles: touched.size,
    codeFiles: code.length,
    t1: !code.length ? { run: false, why: "docs, tests, styles, locales or assets only" }
      : changedLines < T1_MIN_CHANGED_LINES ? { run: false, why: `under ${T1_MIN_CHANGED_LINES} changed lines` }
      : { run: true, why: `${code.length} code file(s), ${changedLines} changed lines` },
  };
}

function formatRoute(route) {
  const reasons = route.reasons.map(({ area, files, more }) => `${area}: ${files.join(", ")}${more ? ` +${more}` : ""}`).join("; ");
  return `ROUTE deep-review effort ${route.effort}${reasons ? ` (${reasons})` : ""}  T1 ${route.t1.run ? "run" : `skip (${route.t1.why})`}  ${route.size} diff, ${route.changedLines} changed lines`;
}

// Advice, never a blocker: the author splits the change or says why it stays whole.
function formatSize(route) {
  const counted = `${route.reviewLines ?? route.changedLines} reviewable lines in ${route.reviewFiles ?? "?"} files`;
  if (route.size === "large") return `SIZE ${counted}: over ${LARGE_DIFF.lines} lines or ${LARGE_DIFF.files} files. Split it into a stack of layers of about ${TARGET_LINES} lines, or state in the PR's merge-danger section why it stays whole (references/pr-size.md)`;
  if ((route.reviewLines ?? 0) > TARGET_LINES) return `SIZE ${counted}: over the ${TARGET_LINES}-line layer target; fine as one PR, but the next change on this branch belongs in a new stack layer`;
  return null;
}

// ---- report -----------------------------------------------------------------

function format(report) {
  const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;
  const lines = [
    `review-t0 ${report.repo}  base ${report.base.ref}@${report.base.sha.slice(0, 8)}  head ${report.head.sha.slice(0, 8)}${report.head.dirty ? "+dirty" : ""}  ${report.changedFiles} files, ${report.addedLines} added lines  checks from ${report.checkSource}`,
  ];
  const mark = { ok: "ok  ", findings: "!   ", skipped: "-   ", missing: "?   ", error: "ERR ", pass: "ok  ", fail: "FAIL", timeout: "TIME", modified: "MOD " };
  for (const step of report.steps) lines.push(`  ${mark[step.status]} ${step.name.padEnd(28)} ${seconds(step.durationMs).padStart(7)}  ${step.detail ?? ""}`.trimEnd());
  for (const check of report.checks) lines.push(`  ${mark[check.status]} ${check.name.padEnd(28)} ${seconds(check.durationMs).padStart(7)}  ${check.command}`);
  for (const skipped of report.skippedChecks) lines.push(`  -    ${skipped}`);
  if (report.skippedFiles.length) lines.push(`  -    ${report.skippedFiles.length} file(s) not scanned or code-rules only; see skippedFiles in the report`);
  if (report.route) lines.push("", formatRoute(report.route), ...[formatSize(report.route)].filter(Boolean));
  if (report.findings.length) {
    lines.push("", "findings (added lines only):");
    for (const finding of report.findings) {
      const where = finding.line ? `${finding.file}:${finding.line}` : finding.file;
      lines.push(`  ${finding.severity.padEnd(7)} [${finding.lens}] ${finding.rule}  ${where}`, `          ${finding.message}`);
    }
  }
  for (const check of report.checks.filter((candidate) => candidate.status !== "pass")) {
    lines.push("", `${check.name} output (tail):`, check.outputTail ?? "");
  }
  const qualifiers = [...report.blockers, ...report.incomplete.map((reason) => `incomplete: ${reason}`)];
  lines.push("", `RESULT ${report.verdict}${qualifiers.length ? ` (${qualifiers.join("; ")})` : ""}  report: ${report.reportPath}`);
  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const started = Date.now();
  const root = git(options.cwd, ["rev-parse", "--show-toplevel"], { allowFailure: true })?.trim();
  if (!root) usage(`${options.cwd} is not inside a git repository`);
  const base = resolveBase(root, options.base);
  if (options.plan) {
    const discovered = discoverChecks(root, base.sha, options);
    console.log(`review-t0 ${basename(root)}: checks from ${discovered.source}, base ${base.ref}@${base.sha.slice(0, 8)}`);
    for (const check of discovered.checks) console.log(`  run  ${check.name.padEnd(28)} ${options.wrap ? `${options.wrap} ` : ""}${check.command}`);
    for (const skipped of discovered.skipped) console.log(`  skip ${skipped}`);
    return;
  }
  const headSha = git(root, ["rev-parse", "HEAD"]).trim();
  const dirty = git(root, ["status", "--porcelain"]).trim().length > 0;
  const reportPath = options.json ?? defaultReportPath("review-t0", root, headSha, dirty);
  const { changed, added } = collectChanges(root, base.sha);
  const report = {
    tool: "review-t0",
    version: 3,
    repo: basename(root),
    root,
    base,
    // review-t1 compares this to the tree it is about to show the models. A check
    // that rewrites the tree blocks T0, so the fingerprint before the checks is final.
    head: { sha: headSha, dirty, tree: treeFingerprint(root) },
    changedFiles: changed.length,
    addedLines: 0,
    verdict: "PASS",
    blockers: [],
    incomplete: [],
    steps: [],
    checkSource: "none",
    checks: [],
    skippedChecks: [],
    skippedFiles: [],
    findings: [],
    route: null,
    reportPath,
  };
  if (!changed.length) {
    report.durationMs = Date.now() - started;
    writeReport(reportPath, report);
    console.log(`review-t0 ${report.repo}: no changes against ${base.ref}@${base.sha.slice(0, 8)}; nothing to check.  report: ${reportPath}`);
    return;
  }

  const targets = scanTargets(root, added);
  scratchDir = realpathSync(mkdtempSync(join(tmpdir(), "review-t0-")));
  try {
    const timed = async (name, task) => {
      const stepStarted = Date.now();
      const result = await task();
      return { name, ...result, durationMs: Date.now() - stepStarted };
    };
    const steps = await Promise.all([
      timed("conflict markers", async () => conflictMarkers(root, added, targets.secret)),
      timed("manifest/lockfile", async () => manifestDrift(root, base.sha, changed)),
      timed("gitleaks (secrets)", () => gitleaks(root, base.sha, added, targets.secret, scratchDir)),
      timed("semgrep (t0 + repo rules)", () => semgrep(root, added, targets.code)),
      timed("osv-scanner (new vulns)", () => osvScanner(root, base.sha, changed, scratchDir)),
    ]);
    const discovered = options.checks ? discoverChecks(root, base.sha, options) : { source: "disabled", checks: [], skipped: ["checks (--no-checks)"] };
    const checks = await runChecks(root, discovered, options);

    const findings = steps.flatMap((step) => step.findings)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
    const errors = findings.filter((finding) => finding.severity === "error").length;
    if (errors) report.blockers.push(`${errors} error finding(s)`);
    const failed = checks.filter((check) => check.status !== "pass").map((check) => `${check.name} ${check.status}`);
    if (failed.length) report.blockers.push(failed.join(", "));
    const broken = steps.filter((step) => step.status === "error" || (options.strict && step.status === "missing")).map((step) => step.name);
    if (broken.length) report.blockers.push(`scanner failed: ${broken.join(", ")}`);
    if (!options.strict) report.incomplete.push(...steps.filter((step) => step.status === "missing").map((step) => step.detail));
    if (options.checks && !discovered.checks.length) report.incomplete.push("no repository checks found");

    let reviewAdded = 0;
    for (const [file, lines] of added) {
      const count = lines === "all" ? (targets.secret.includes(file) ? readFileSync(join(root, file), "utf8").split("\n").filter((line, index, all) => line || index < all.length - 1).length : 0) : lines.size;
      report.addedLines += count;
      if (reviewable(file)) reviewAdded += count;
    }
    Object.assign(report, {
      verdict: report.blockers.length ? "BLOCKED" : "PASS",
      route: routeChange(root, base.sha, changed, { addedLines: report.addedLines, reviewAdded }),
      durationMs: Date.now() - started,
      steps: steps.map(({ findings: stepFindings, ...step }) => ({ ...step, findings: stepFindings.length })),
      checkSource: discovered.source,
      checks,
      skippedChecks: discovered.skipped,
      skippedFiles: targets.skipped,
      findings,
    });
    writeReport(reportPath, report);
    console.log(format(report));
    process.exitCode = report.blockers.length ? 1 : 0;
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    // The scratch mirror holds copies of changed files, possibly with secrets.
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
    await stopGroups();
    process.exit(130);
  });
}

main().catch((error) => {
  if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
  console.error(`review-t0: ${error.message}`);
  process.exit(2);
});
