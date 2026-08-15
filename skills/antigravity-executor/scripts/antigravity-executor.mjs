#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MODEL = "gemini-3.7-flash-high";
const DEFAULT_RESERVE = 0.05;
const MIN_AGY_VERSION = "1.1.13";
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SKILL_DIR = dirname(dirname(SCRIPT_PATH));
const AGENT_SOURCE = join(SKILL_DIR, "assets", "agent.md");
const RECEIPT_SCHEMA = join(SKILL_DIR, "references", "receipt.schema.json");

class CliError extends Error {
  constructor(code, message, details = [], exitCode = 2) {
    super(message);
    this.code = code;
    this.details = details;
    this.exitCode = exitCode;
  }
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift();
  const flags = {};
  const positional = [];
  while (args.length) {
    const item = args.shift();
    if (!item.startsWith("--")) {
      positional.push(item);
      continue;
    }
    const key = item.slice(2);
    if (["json", "dry-run", "replace-links"].includes(key)) {
      flags[key] = true;
      continue;
    }
    const value = args.shift();
    if (!value || value.startsWith("--")) {
      throw new CliError("INVALID_ARGUMENT", `--${key} requires a value`);
    }
    flags[key] = value;
  }
  return { command, flags, positional };
}

function paths(flags = {}) {
  const userHome = homedir();
  const configRoot = resolve(
    flags["config-root"] ||
      process.env.ANTIGRAVITY_EXECUTOR_CONFIG_ROOT ||
      join(userHome, ".gemini", "config"),
  );
  return {
    configRoot,
    geminiRoot: dirname(configRoot),
    canonicalCore: resolve(
      flags["canonical-core"] ||
        process.env.ANTIGRAVITY_EXECUTOR_CORE ||
        join(userHome, ".codex", "AGENTS.md"),
    ),
    binDir: resolve(
      flags["bin-dir"] ||
        process.env.ANTIGRAVITY_EXECUTOR_BIN_DIR ||
        join(userHome, ".local", "bin"),
    ),
  };
}

function runProcess(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env || process.env,
    maxBuffer: 32 * 1024 * 1024,
    timeout: options.timeoutMs,
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error,
  };
}

function requireProcess(command, args, options = {}, code = "PROCESS_FAILED") {
  const result = runProcess(command, args, options);
  if (result.error?.code === "ENOENT") {
    throw new CliError(
      command === "agy" ? "AGY_NOT_FOUND" : "COMMAND_NOT_FOUND",
      `${command} is not available on PATH`,
      [],
      3,
    );
  }
  if (result.error?.code === "ETIMEDOUT") {
    throw new CliError("PROCESS_TIMEOUT", `${command} exceeded its process timeout`, [], command === "agy" ? 4 : 3);
  }
  if (result.status !== 0) {
    throw new CliError(
      code,
      `${command} exited with status ${result.status}`,
      [lastLine(result.stderr), lastLine(result.stdout)].filter(Boolean),
      command === "agy" ? 4 : 3,
    );
  }
  return result;
}

function lastLine(value) {
  return value.trim().split(/\r?\n/).filter(Boolean).at(-1) || "";
}

function parseJson(source, label) {
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new CliError("INVALID_JSON", `${label} is not valid JSON`, [error.message], 2);
  }
}

function readJson(path, label = path) {
  if (!existsSync(path)) throw new CliError("FILE_NOT_FOUND", `${label} was not found`, [path]);
  return parseJson(readFileSync(path, "utf8"), label);
}

function versionParts(value) {
  const match = String(value).match(/\b(\d+)\.(\d+)\.(\d+)\b/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function modelIds(payload) {
  const values = Array.isArray(payload)
    ? payload
    : payload.models || payload.data?.models || payload.command?.data?.models || payload.data || [];
  return values
    .map((model) => (typeof model === "string" ? model : model.id || model.name || model.model))
    .filter(Boolean);
}

function quotaSnapshot(payload) {
  const groups = payload?.command?.data?.groups || [];
  const gemini = groups.find((group) => /gemini/i.test(group.name || ""));
  const buckets = (gemini?.buckets || []).map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    remaining_fraction: bucket.remaining_fraction,
    reset_time: bucket.reset_time,
  }));
  return { group: gemini?.name || null, buckets };
}

function agentNames(payload) {
  const values = payload?.command?.data?.agents || payload?.agents || [];
  return Array.isArray(values)
    ? values.map((agent) => (typeof agent === "string" ? agent : agent.name)).filter(Boolean)
    : [];
}

function brokenSymlinks(root) {
  if (!existsSync(root)) return [];
  const script = [
    "const fs=require('fs'),p=require('path');",
    "const out=[];",
    "function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const x=p.join(d,e.name);",
    "if(e.isSymbolicLink()){try{fs.realpathSync(x)}catch{out.push(x)}}else if(e.isDirectory())walk(x)}}",
    "walk(process.argv[1]);process.stdout.write(JSON.stringify(out.sort()))",
  ].join("");
  const result = requireProcess(process.execPath, ["-e", script, root]);
  return parseJson(result.stdout, "broken symlink scan");
}

function liveReference(path, expectedTarget) {
  if (!existsSync(path) && !safeLstat(path)) return { ok: false, path, reason: "missing" };
  try {
    const observed = realpathSync(path);
    const expected = realpathSync(expectedTarget);
    return { ok: observed === expected, path, target: observed, expected };
  } catch (error) {
    return { ok: false, path, reason: error.code || error.message };
  }
}

function safeLstat(path) {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
}

function gitSnapshot(cwd) {
  const inside = runProcess("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
  if (inside.status !== 0 || inside.stdout.trim() !== "true") return { inside: false };
  const topLevel = requireProcess("git", ["rev-parse", "--show-toplevel"], { cwd }).stdout.trim();
  const head = requireProcess("git", ["rev-parse", "HEAD"], { cwd }).stdout.trim();
  const branch = requireProcess("git", ["branch", "--show-current"], { cwd }).stdout.trim();
  const status = requireProcess("git", ["status", "--porcelain=v1"], { cwd }).stdout;
  const gitDir = resolve(topLevel, requireProcess("git", ["rev-parse", "--git-dir"], { cwd }).stdout.trim());
  const commonDirRaw = requireProcess("git", ["rev-parse", "--git-common-dir"], { cwd }).stdout.trim();
  const commonDir = resolve(topLevel, commonDirRaw);
  const remote = runProcess("git", ["remote", "get-url", "origin"], { cwd });
  return {
    inside: true,
    top_level: topLevel,
    head,
    branch,
    clean: status.trim() === "",
    checkout_type: gitDir === commonDir ? "primary" : "worktree",
    origin: remote.status === 0 ? remote.stdout.trim() : null,
  };
}

function doctor(flags = {}) {
  const configured = paths(flags);
  const failures = [];
  const warnings = [];
  const versionResult = runProcess("agy", ["--version"]);
  const agyInstalled = !versionResult.error && versionResult.status === 0;
  const version = agyInstalled ? versionResult.stdout.trim() : null;
  if (!agyInstalled) failures.push("AGY_NOT_FOUND");
  if (version && compareVersions(version, MIN_AGY_VERSION) === null) failures.push("AGY_VERSION_UNPARSEABLE");

  let models = [];
  let discoveredAgents = [];
  let quota = { group: null, buckets: [] };
  if (agyInstalled) {
    try {
      models = modelIds(parseJson(requireProcess("agy", ["--output-format", "json", "models"]).stdout, "agy models"));
      if (!models.includes(DEFAULT_MODEL)) failures.push("DEFAULT_MODEL_UNAVAILABLE");
    } catch (error) {
      failures.push(error.code || "MODEL_LIST_FAILED");
    }
    try {
      quota = quotaSnapshot(parseJson(requireProcess("agy", ["--output-format", "json", "-p", "/quota"]).stdout, "agy quota"));
      if (quota.buckets.length === 0) failures.push("GEMINI_QUOTA_UNAVAILABLE");
      for (const bucket of quota.buckets) {
        if (typeof bucket.remaining_fraction === "number" && bucket.remaining_fraction < DEFAULT_RESERVE) {
          failures.push(`QUOTA_BELOW_RESERVE:${bucket.id}`);
        }
      }
    } catch (error) {
      failures.push(error.code || "QUOTA_CHECK_FAILED");
    }
    try {
      discoveredAgents = agentNames(parseJson(requireProcess("agy", ["--output-format", "json", "agents"]).stdout, "agy agents"));
      if (!discoveredAgents.includes("antigravity-executor")) failures.push("EXECUTOR_AGENT_NOT_DISCOVERED");
    } catch (error) {
      failures.push(error.code || "AGENT_LIST_FAILED");
    }
  }

  const configPath = join(configured.configRoot, "config.json");
  let configValid = true;
  let configError = null;
  if (existsSync(configPath)) {
    try {
      JSON.parse(readFileSync(configPath, "utf8"));
    } catch (error) {
      configValid = false;
      configError = error.message;
      failures.push("CONFIG_JSON_INVALID");
    }
  } else {
    warnings.push("CONFIG_JSON_MISSING");
  }

  const broken = brokenSymlinks(join(configured.configRoot, "skills"));
  if (broken.length) failures.push("BROKEN_SKILL_LINKS");
  const core = liveReference(join(configured.geminiRoot, "GEMINI.md"), configured.canonicalCore);
  if (!core.ok) failures.push("GLOBAL_CORE_DRIFT");
  const agent = liveReference(
    join(configured.configRoot, "agents", "antigravity-executor", "agent.md"),
    AGENT_SOURCE,
  );
  if (!agent.ok) failures.push("EXECUTOR_AGENT_MISSING_OR_DRIFTED");
  const git = gitSnapshot(process.cwd());
  if (git.inside && !git.clean) failures.push("DIRTY_CHECKOUT");

  return {
    ready: failures.length === 0,
    failures: [...new Set(failures)],
    warnings,
    agy: { installed: agyInstalled, version, minimum: MIN_AGY_VERSION },
    models: { required: DEFAULT_MODEL, available: models },
    quota,
    config: { path: configPath, valid: configValid, error: configError },
    broken_skill_links: broken,
    core,
    agent: { ...agent, discovered: discoveredAgents.includes("antigravity-executor") },
    git,
  };
}

function ensureLink(source, target, label, replace = false) {
  if (!existsSync(source)) throw new CliError("SOURCE_NOT_FOUND", `${label} source is missing`, [source], 3);
  const current = safeLstat(target);
  if (current) {
    const state = liveReference(target, source);
    if (state.ok) return { path: target, changed: false };
    if (replace && current.isSymbolicLink()) {
      rmSync(target);
      symlinkSync(source, target);
      return { path: target, changed: true, replaced: true };
    }
    throw new CliError("SETUP_CONFLICT", `${label} target already exists and points elsewhere`, [target], 3);
  }
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(source, target);
  return { path: target, changed: true };
}

function setup(flags = {}) {
  const configured = paths(flags);
  const version = requireProcess("agy", ["--version"]).stdout.trim();
  if (compareVersions(version, MIN_AGY_VERSION) === -1) {
    requireProcess("agy", ["update"], {}, "AGY_UPDATE_FAILED");
  }
  const configPath = join(configured.configRoot, "config.json");
  if (existsSync(configPath)) parseJson(readFileSync(configPath, "utf8"), configPath);
  const broken = brokenSymlinks(join(configured.configRoot, "skills"));
  if (broken.length) {
    throw new CliError("BROKEN_SKILL_LINKS", "Broken Antigravity skill links must be repaired first", broken, 3);
  }
  const replace = Boolean(flags["replace-links"]);
  const core = ensureLink(configured.canonicalCore, join(configured.geminiRoot, "GEMINI.md"), "global core", replace);
  const agent = ensureLink(
    AGENT_SOURCE,
    join(configured.configRoot, "agents", "antigravity-executor", "agent.md"),
    "executor agent",
    replace,
  );
  const binary = ensureLink(SCRIPT_PATH, join(configured.binDir, "antigravity-executor"), "helper binary", replace);
  chmodSync(SCRIPT_PATH, 0o755);
  const discovered = agentNames(parseJson(requireProcess("agy", ["--output-format", "json", "agents"]).stdout, "agy agents"));
  if (!discovered.includes("antigravity-executor")) {
    throw new CliError("EXECUTOR_AGENT_NOT_DISCOVERED", "Antigravity did not discover the installed executor agent", [], 3);
  }
  return { version, core, agent, binary };
}

function packetErrors(packet) {
  const errors = [];
  const requiredStrings = ["package_id", "objective", "repository"];
  for (const key of requiredStrings) if (typeof packet?.[key] !== "string" || !packet[key].trim()) errors.push(`${key} is required`);
  if (!Array.isArray(packet?.allowed_paths) || packet.allowed_paths.length === 0) errors.push("allowed_paths must be non-empty");
  for (const path of packet?.allowed_paths || []) {
    if (path.startsWith("/") || path.split("/").includes("..") || path === ".git" || path.startsWith(".git/")) {
      errors.push(`allowed_paths entry is unsafe: ${path}`);
    }
  }
  if (!Array.isArray(packet?.non_goals)) errors.push("non_goals must be an array");
  if (!Array.isArray(packet?.checks) || packet.checks.length === 0) errors.push("checks must be non-empty");
  if (!packet?.base || !/^[0-9a-f]{7,64}$/i.test(packet.base.sha || "")) errors.push("base.sha is invalid");
  if (!packet?.base || !["independent", "stacked"].includes(packet.base.topology)) errors.push("base.topology is invalid");
  if (typeof packet?.base?.branch !== "string" || !packet.base.branch) errors.push("base.branch is required");
  if (typeof packet?.route?.model !== "string" || !packet.route.model) errors.push("route.model is required");
  if (typeof packet?.route?.reason !== "string" || !packet.route.reason) errors.push("route.reason is required");
  for (const key of ["commit", "push", "pr"]) if (typeof packet?.git_authority?.[key] !== "boolean") errors.push(`git_authority.${key} must be boolean`);
  if (packet?.git_authority?.pr && !packet?.git_authority?.push) errors.push("git_authority.pr requires git_authority.push");
  return errors;
}

function assertPacket(packet, cwd) {
  const errors = packetErrors(packet);
  if (errors.length) throw new CliError("INVALID_DISPATCH", "Dispatch packet is invalid", errors, 2);
  const git = gitSnapshot(cwd);
  if (!git.inside) throw new CliError("NOT_A_GIT_CHECKOUT", "Execution directory is not a Git checkout", [cwd], 3);
  if (!git.clean) throw new CliError("DIRTY_CHECKOUT", "Execution checkout must start clean", [git.top_level], 3);
  if (git.branch !== packet.base.branch) {
    throw new CliError("BRANCH_MISMATCH", "Observed branch does not match dispatch", [`requested=${packet.base.branch}`, `observed=${git.branch}`], 3);
  }
  const ancestor = runProcess("git", ["merge-base", "--is-ancestor", packet.base.sha, "HEAD"], { cwd });
  if (ancestor.status !== 0) throw new CliError("BASE_MISMATCH", "Dispatch base is not an ancestor of HEAD", [packet.base.sha, git.head], 3);
  const requestedRepository = existsSync(packet.repository) ? realpathSync(packet.repository) : packet.repository;
  const observedTopLevel = realpathSync(git.top_level);
  const repoMatches = [git.origin, observedTopLevel, basename(observedTopLevel)]
    .filter(Boolean)
    .some((value) => value === requestedRepository || value.endsWith(`/${requestedRepository}`) || value.endsWith(`/${requestedRepository}.git`));
  if (!repoMatches) throw new CliError("REPOSITORY_MISMATCH", "Dispatch repository does not match checkout", [packet.repository, git.origin || git.top_level], 3);
  return git;
}

function receiptErrors(receipt) {
  const errors = [];
  const statuses = ["RETURN_TO_CONTROLLER", "RETURN_TO_CONTROLLER_PENDING", "BLOCKED_RETAINED", "NEEDS_HUMAN"];
  if (!statuses.includes(receipt?.status)) errors.push("status is invalid");
  for (const key of ["package_id", "cause", "correction", "implementation_anchor", "next_action"]) if (typeof receipt?.[key] !== "string") errors.push(`${key} must be a string`);
  for (const key of ["diff", "checks", "pending_proof", "residual_risk"]) if (!Array.isArray(receipt?.[key])) errors.push(`${key} must be an array`);
  for (const key of ["branch", "head", "clean", "published", "pr"]) if (!(key in (receipt?.git || {}))) errors.push(`git.${key} is required`);
  return errors;
}

function parseExecutorReceipt(result) {
  const response = result.response ?? result.result ?? result.data?.response;
  const receipt = typeof response === "string" ? parseJson(response.trim(), "executor response") : response;
  const errors = receiptErrors(receipt);
  if (errors.length) throw new CliError("INVALID_EXECUTOR_RECEIPT", "Executor receipt failed validation", errors, 5);
  return receipt;
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      /^(token|secret|password|cookie|authorization|api[_-]?key)$/i.test(key) ? "[REDACTED]" : redact(item),
    ]));
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/g, "[REDACTED]");
}

function atomicWriteJson(path, value) {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(redact(value), null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, absolute);
  return absolute;
}

function promptFor(packet, resume) {
  const agentRules = readFileSync(AGENT_SOURCE, "utf8").replace(/^---[\s\S]*?---\s*/, "").trim();
  return [
    agentRules,
    resume ? "Resume the same package and address only the controller's rework packet." : "Execute exactly this bounded package.",
    "Read applicable repository instructions before acting.",
    "Full auto-approval does not expand the package authority.",
    "Return only one JSON object matching the supplied receipt schema. Do not wrap it in Markdown.",
    "Dispatch packet:",
    JSON.stringify(packet, null, 2),
  ].join("\n\n");
}

function observedModel(result) {
  const candidates = [result.model, result.model_id, result.modelId, result.command?.data?.model];
  return candidates.find((value) => typeof value === "string") || null;
}

function durationMs(value) {
  const match = String(value).match(/^(\d+)(ms|s|m|h)$/);
  if (!match) throw new CliError("INVALID_ARGUMENT", "--timeout must use ms, s, m, or h", [String(value)]);
  const factors = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000 };
  return Number(match[1]) * factors[match[2]];
}

function ignoredSnapshot(cwd) {
  const output = requireProcess("git", ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"], { cwd }).stdout;
  const snapshot = new Map();
  for (const path of output.split("\0").filter(Boolean)) {
    const stat = lstatSync(join(cwd, path), { bigint: true });
    snapshot.set(path, `${stat.mode}:${stat.size}:${stat.mtimeNs}`);
  }
  return snapshot;
}

function changedIgnoredPaths(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].filter((path) => before.get(path) !== after.get(path)).sort();
}

function commandGuards(packet) {
  if (packet.git_authority.push && packet.git_authority.pr) return { env: process.env, cleanup() {} };
  const guardDir = mkdtempSync(join(tmpdir(), "antigravity-executor-guard-"));
  const env = { ...process.env, PATH: `${guardDir}:${process.env.PATH}` };
  if (!packet.git_authority.push) {
    const gitPath = requireProcess("which", ["git"]).stdout.trim();
    const script = `#!/bin/sh\nfor arg in "$@"; do\n  if [ "$arg" = "push" ]; then\n    echo "antigravity-executor: git push is outside this package authority" >&2\n    exit 77\n  fi\ndone\nexec ${JSON.stringify(gitPath)} "$@"\n`;
    const path = join(guardDir, "git");
    writeFileSync(path, script, { mode: 0o755 });
  }
  if (!packet.git_authority.pr) {
    const ghResult = runProcess("which", ["gh"]);
    if (ghResult.status === 0) {
      const script = `#!/bin/sh\necho "antigravity-executor: GitHub CLI is outside this package authority" >&2\nexit 77\n`;
      writeFileSync(join(guardDir, "gh"), script, { mode: 0o755 });
    }
  }
  return { env, cleanup() { rmSync(guardDir, { recursive: true, force: true }); } };
}

function changedPaths(cwd, initialHead, ignoredChanges = []) {
  const tracked = requireProcess("git", ["diff", "--name-only", initialHead, "--"], { cwd }).stdout.split(/\r?\n/);
  const untracked = requireProcess("git", ["ls-files", "--others", "--exclude-standard"], { cwd }).stdout.split(/\r?\n/);
  return [...new Set([...tracked, ...untracked, ...ignoredChanges].filter(Boolean))].sort();
}

function isAllowedPath(path, allowedPaths) {
  return allowedPaths.some((allowed) => {
    const normalized = allowed.replace(/^\.\//, "").replace(/\/+$/, "");
    return path === normalized || path.startsWith(`${normalized}/`);
  });
}

function assertExecutionBoundary(packet, initialGit, finalGit, executorReceipt, cwd, ignoredChanges) {
  const errors = [];
  const changed = changedPaths(cwd, initialGit.head, ignoredChanges);
  const unauthorized = changed.filter((path) => !isAllowedPath(path, packet.allowed_paths));
  if (unauthorized.length) errors.push(`unauthorized paths: ${unauthorized.join(", ")}`);
  if (finalGit.branch !== initialGit.branch) errors.push(`branch changed: ${initialGit.branch} -> ${finalGit.branch}`);
  if (!packet.git_authority.commit && finalGit.head !== initialGit.head) errors.push("commit created without authority");
  if (!packet.git_authority.push && executorReceipt.git.published) errors.push("executor reported a push without authority");
  if (!packet.git_authority.pr && executorReceipt.git.pr !== null) errors.push("executor reported a PR without authority");
  if (executorReceipt.git.branch !== finalGit.branch) errors.push("receipt branch does not match observed branch");
  if (executorReceipt.git.head !== finalGit.head) errors.push("receipt head does not match observed HEAD");
  if (executorReceipt.git.clean !== finalGit.clean) errors.push("receipt cleanliness does not match observed checkout");
  if (errors.length) {
    throw new CliError("EXECUTION_BOUNDARY_VIOLATION", "Executor result violated the dispatch boundary", errors, 5);
  }
  return changed;
}

function execute(command, flags, resume = false) {
  if (!flags.packet) throw new CliError("INVALID_ARGUMENT", "--packet is required");
  if (!flags.receipt) throw new CliError("INVALID_ARGUMENT", "--receipt is required");
  if (resume && !flags.conversation) throw new CliError("INVALID_ARGUMENT", "--conversation is required for resume");
  const packet = readJson(resolve(flags.packet), "dispatch packet");
  const cwd = resolve(flags.cwd || process.cwd());
  const initialGit = assertPacket(packet, cwd);
  const initialIgnored = ignoredSnapshot(cwd);
  const requestedModel = packet.route.model || DEFAULT_MODEL;

  if (flags["dry-run"]) {
    return {
      dry_run: true,
      packet_id: packet.package_id,
      cwd,
      model: requestedModel,
      invocation: ["agy", "--sandbox", "--mode", "accept-edits", "--model", requestedModel, "--dangerously-skip-permissions", "--output-format", "json"],
    };
  }

  let preflight = doctor(flags);
  if (preflight.agy.version && compareVersions(preflight.agy.version, MIN_AGY_VERSION) === -1) {
    requireProcess("agy", ["update"], {}, "AGY_UPDATE_FAILED");
    preflight = doctor(flags);
  }
  const allowedFailures = resume ? preflight.failures.filter((failure) => !failure.startsWith("QUOTA_BELOW_RESERVE")) : preflight.failures;
  if (allowedFailures.length) throw new CliError("PREFLIGHT_FAILED", "Antigravity preflight failed", allowedFailures, 3);
  if (!preflight.models.available.includes(requestedModel)) throw new CliError("MODEL_UNAVAILABLE", "Requested model is unavailable", [requestedModel], 3);

  const args = [
    "--sandbox",
    "--mode", "accept-edits",
    "--model", requestedModel,
    "--effort", "high",
    "--dangerously-skip-permissions",
    "--disable-slash-commands",
    "--output-format", "json",
    "--json-schema", RECEIPT_SCHEMA,
    "--print-timeout", flags.timeout || "5m",
  ];
  if (resume) args.push("--conversation", flags.conversation);
  args.push("-p", promptFor(packet, resume));
  const timeout = flags.timeout || "5m";
  const guards = commandGuards(packet);
  let execution;
  try {
    execution = requireProcess("agy", args, { cwd, env: guards.env, timeoutMs: durationMs(timeout) + 1_000 }, "AGY_EXECUTION_FAILED");
  } finally {
    guards.cleanup();
  }
  const result = parseJson(execution.stdout, "agy result");
  const executorReceipt = parseExecutorReceipt(result);
  if (executorReceipt.package_id !== packet.package_id) throw new CliError("PACKAGE_ID_MISMATCH", "Executor receipt belongs to a different package", [executorReceipt.package_id], 5);
  const finalGit = gitSnapshot(cwd);
  const ignoredChanges = changedIgnoredPaths(initialIgnored, ignoredSnapshot(cwd));
  const changed = assertExecutionBoundary(packet, initialGit, finalGit, executorReceipt, cwd, ignoredChanges);
  const envelope = {
    schema_version: 1,
    package_id: packet.package_id,
    conversation_id: result.conversation_id || flags.conversation || null,
    requested_model: requestedModel,
    observed_model: observedModel(result),
    checkout: { path: cwd, type: initialGit.checkout_type, branch: initialGit.branch, initial_head: initialGit.head, final_head: finalGit.head, clean: finalGit.clean },
    changed_paths: changed,
    quota_before: preflight.quota,
    usage: result.usage || null,
    executor: executorReceipt,
  };
  const receiptPath = atomicWriteJson(flags.receipt, envelope);
  return { receipt: receiptPath, envelope };
}

function verifyReceipt(path) {
  const envelope = readJson(resolve(path), "receipt");
  const errors = [];
  if (envelope.schema_version !== 1) errors.push("schema_version must be 1");
  if (typeof envelope.package_id !== "string") errors.push("package_id is required");
  if (typeof envelope.requested_model !== "string") errors.push("requested_model is required");
  if (!envelope.checkout || typeof envelope.checkout.path !== "string") errors.push("checkout.path is required");
  if (!Array.isArray(envelope.changed_paths)) errors.push("changed_paths must be an array");
  if (!("conversation_id" in envelope)) errors.push("conversation_id is required");
  if (!("observed_model" in envelope)) errors.push("observed_model is required");
  if (!envelope.quota_before || !Array.isArray(envelope.quota_before.buckets)) errors.push("quota_before.buckets is required");
  errors.push(...receiptErrors(envelope.executor).map((error) => `executor.${error}`));
  if (errors.length) throw new CliError("INVALID_RECEIPT", "Receipt failed validation", errors, 5);
  return { valid: true, package_id: envelope.package_id, status: envelope.executor.status };
}

function help() {
  return `Usage: antigravity-executor <command> [flags]\n\nCommands:\n  doctor [--json]\n  setup [--json] [--canonical-core PATH] [--replace-links]\n  run --packet FILE --receipt FILE [--cwd PATH] [--timeout 5m] [--dry-run] [--json]\n  resume --conversation ID --packet FILE --receipt FILE [--cwd PATH] [--timeout 5m] [--json]\n  verify-receipt FILE [--json]\n`;
}

function render(command, data, json) {
  if (json) process.stdout.write(`${JSON.stringify({ ok: true, command, data, warnings: data?.warnings || [] })}\n`);
  else process.stdout.write(`${command}: ${data?.ready === false ? "not ready" : "ok"}\n`);
}

function fail(command, error, json) {
  const normalized = error instanceof CliError ? error : new CliError("UNEXPECTED_ERROR", error.message || String(error), [], 2);
  const payload = { ok: false, command: command || null, error: { code: normalized.code, message: normalized.message, details: redact(normalized.details) } };
  if (json) process.stdout.write(`${JSON.stringify(payload)}\n`);
  else process.stderr.write(`${normalized.code}: ${normalized.message}\n${normalized.details.join("\n")}\n`);
  process.exitCode = normalized.exitCode;
}

let parsed;
try {
  parsed = parseArgs(process.argv.slice(2));
  if (!parsed.command || ["help", "--help", "-h"].includes(parsed.command)) {
    process.stdout.write(help());
  } else if (parsed.command === "doctor") {
    render("doctor", doctor(parsed.flags), parsed.flags.json);
  } else if (parsed.command === "setup") {
    render("setup", setup(parsed.flags), parsed.flags.json);
  } else if (parsed.command === "run") {
    render("run", execute("run", parsed.flags, false), parsed.flags.json);
  } else if (parsed.command === "resume") {
    render("resume", execute("resume", parsed.flags, true), parsed.flags.json);
  } else if (parsed.command === "verify-receipt") {
    const path = parsed.positional[0];
    if (!path) throw new CliError("INVALID_ARGUMENT", "verify-receipt requires a path");
    render("verify-receipt", verifyReceipt(path), parsed.flags.json);
  } else {
    throw new CliError("UNKNOWN_COMMAND", `Unknown command: ${parsed.command}`);
  }
} catch (error) {
  fail(parsed?.command, error, parsed?.flags?.json || process.argv.includes("--json"));
}
