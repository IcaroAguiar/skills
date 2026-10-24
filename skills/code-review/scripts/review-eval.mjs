#!/usr/bin/env node
// review-eval: offline evaluation of the T1 fast pre-pass. Past PRs that caused
// incidents or reverts become cases (base, head, what escaped); known-clean PRs
// measure noise. Every prompt, model or effort change is scored against them:
// each case runs review-t0 and review-t1 in a throwaway worktree of its head.
// Exit 0 = it ran (even with low recall), 1 = every run failed, 2 = usage error.

import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stateDir } from "./lib/ledger.mjs";
import { git, readJson, run, stopGroups, writeReport } from "./lib/repo.mjs";

const scripts = dirname(fileURLToPath(import.meta.url));
const NEAR_LINES = 10;
const USAGE = `usage: review-eval add --id <id> --repo <dir> --base <sha> --head <sha>
                        [--expect <file>:<line>:<title>]... [--clean] [--note <text>] [--cases <file>]
       review-eval run [--cases <file>] [--only <id>,<id>] [--config <name>="<t1 args>"]...
                       [--json <file>] [--keep]

Scores review-t1 against past PRs. A case is a local clone, the PR's base and head
commits and the problems that escaped review; "expected": [] marks a known-clean PR.

  add                      append a validated case (the repo is a git repo, both shas are commits)
    --expect f:l:title     one escaped problem (repeatable); --clean records a PR with none
  run                      review every case under every config, then print the summary
    --config name="args"   review-t1 arguments for one config, e.g.
                           sonnet-high="--reviewer sonnet:high" (default: policy, no arguments)
    --only a,b             run only these case ids
    --json <file>          write the full results
    --keep                 keep the worktrees and print their paths
  --cases <file>           JSONL cases (default: cases.jsonl in the ledger's state directory)

A finding hits an expected item in the same file within ${NEAR_LINES} lines (a spot without a line
matches the file). Noise is the P1/P2 spots of a clean case that are not pre-existing.`;

function usage(message) {
  console.error(`review-eval: ${message}\n\n${USAGE}`);
  process.exit(2);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command === "-h" || command === "--help") {
    console.log(USAGE);
    process.exit(0);
  }
  if (command !== "add" && command !== "run") usage(command ? `unknown subcommand ${command}` : "a subcommand is required");
  const options = { command, cases: join(stateDir(), "cases.jsonl"), expect: [], configs: [], only: null, clean: false, keep: false, json: null, id: null, repo: null, base: null, head: null, note: null };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const value = () => {
      if (rest[index + 1] === undefined) usage(`${arg} needs a value`);
      index += 1;
      return rest[index];
    };
    if (arg === "--cases") options.cases = resolve(value());
    else if (arg === "--json") options.json = resolve(value());
    else if (arg === "--keep") options.keep = true;
    else if (arg === "--clean") options.clean = true;
    else if (arg === "--only") options.only = value().split(",");
    else if (arg === "--config") {
      const spec = value();
      const split = spec.indexOf("=");
      if (split < 1) usage("--config needs <name>=<t1 args>");
      options.configs.push({ name: spec.slice(0, split), args: shellWords(spec.slice(split + 1)) });
    } else if (arg === "--expect") options.expect.push(expectation(value()));
    else if (["--id", "--repo", "--base", "--head", "--note"].includes(arg)) options[arg.slice(2)] = value();
    else if (arg === "-h" || arg === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else usage(`unknown argument ${arg}`);
  }
  const names = options.configs.map((config) => config.name);
  if (names.some((name, at) => !/^[\w.-]+$/.test(name) || names.indexOf(name) !== at)) usage("config names must be unique words");
  if (!options.configs.length) options.configs.push({ name: "policy", args: [] });
  return options;
}

// "file:line:title" — the title may hold colons.
function expectation(text) {
  const match = /^([^:]+):(\d+):(.+)$/.exec(text);
  if (!match) usage(`--expect needs <file>:<line>:<title>, got ${text}`);
  return { file: match[1], line: Number(match[2]), title: match[3] };
}

// Words split on blanks; single quotes are literal, double quotes allow \" and \\.
// Nothing is expanded and no shell runs.
export function shellWords(text) {
  const words = [];
  let word = null;
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    if (char === "'" || char === '"') {
      const end = char === "'" ? text.indexOf("'", at + 1) : closingQuote(text, at + 1);
      if (end < 0) usage(`unterminated quote in: ${text}`);
      const body = text.slice(at + 1, end);
      word = (word ?? "") + (char === '"' ? body.replace(/\\(["\\])/g, "$1") : body);
      at = end;
    } else if (/\s/.test(char)) {
      if (word !== null) words.push(word);
      word = null;
    } else if (char === "\\" && at + 1 < text.length) {
      word = (word ?? "") + text[++at];
    } else word = (word ?? "") + char;
  }
  if (word !== null) words.push(word);
  return words;
}

function closingQuote(text, from) {
  for (let at = from; at < text.length; at += 1) {
    if (text[at] === "\\") at += 1;
    else if (text[at] === '"') return at;
  }
  return -1;
}

function commit(repo, sha) {
  return git(repo, ["rev-parse", "--verify", "-q", `${sha}^{commit}`], { allowFailure: true })?.trim() ?? null;
}

function add(options) {
  for (const key of ["id", "repo", "base", "head"]) if (!options[key]) usage(`add needs --${key}`);
  if (!/^[\w.-]+$/.test(options.id)) usage("--id must be a word (letters, digits, _ . -)");
  if (options.clean === options.expect.length > 0) usage("pass --clean or at least one --expect, not both or neither");
  const repo = resolve(options.repo);
  if (git(repo, ["rev-parse", "--git-dir"], { allowFailure: true }) === null) usage(`${repo} is not a git repository`);
  const base = commit(repo, options.base);
  const head = commit(repo, options.head);
  if (!base) usage(`base ${options.base} is not a commit in ${repo}`);
  if (!head) usage(`head ${options.head} is not a commit in ${repo}`);
  if (readCases(options.cases, true).some((entry) => entry.id === options.id)) usage(`case ${options.id} already exists in ${options.cases}`);
  const entry = { id: options.id, repo, base, head, expected: options.expect, ...(options.note ? { note: options.note } : {}) };
  mkdirSync(dirname(options.cases), { recursive: true });
  appendFileSync(options.cases, `${JSON.stringify(entry)}\n`);
  console.log(`added ${entry.id} (${entry.expected.length ? `${entry.expected.length} expected` : "clean"}) to ${options.cases}`);
}

function readCases(path, optional = false) {
  if (!existsSync(path)) {
    if (optional) return [];
    usage(`no cases file at ${path}; add one with "review-eval add"`);
  }
  return readFileSync(path, "utf8").split("\n").filter((line) => line.trim()).map((line, index) => {
    const entry = readJson(() => line);
    if (!entry || !/^[\w.-]+$/.test(entry.id ?? "") || !entry.repo || !entry.base || !entry.head || !Array.isArray(entry.expected)) usage(`${path}:${index + 1} is not a valid case`);
    return entry;
  });
}

// ---- running ----------------------------------------------------------------

const node = (script, args, options) => run(process.execPath, [join(scripts, script), ...args], options);

// One review of one case: a worktree at the head, T0 against the base, then T1.
async function review(entry, config, work, keep) {
  // One worktree per case and config, so --keep can keep them all.
  const tree = join(work, `${entry.id}--${config.name.replace(/[^\w.-]/g, "_")}`);
  const tmp = mkdtempSync(join(work, "tmp-"));
  // Replayed calls go to their own ledger: they have no triage and would skew the
  // live acted-on rates, cost and turns that the policy is tuned on.
  const env = { ...process.env, TMPDIR: tmp, AGENT_REVIEW_STATE: join(stateDir(), "eval") };
  const started = Date.now();
  const result = { id: entry.id, config: config.name, status: "failed", report: null, error: null };
  try {
    git(entry.repo, ["worktree", "add", "--detach", tree, entry.head]);
    const t0 = await node("review-t0.mjs", ["-C", tree, "--no-checks", "--base", entry.base], { env });
    if (t0.code !== 0) throw new Error(`review-t0 exited ${t0.code}: ${t0.output.trim().split("\n")[0]}`);
    const reportPath = join(tmp, "t1-eval.json");
    const t1 = await node("review-t1.mjs", ["-C", tree, "--force", "--json", reportPath, ...config.args], { env, timeoutMs: 3_600_000 });
    result.report = existsSync(reportPath) ? readJson(() => readFileSync(reportPath, "utf8")) : null;
    if (!result.report) throw new Error(`review-t1 exited ${t1.code} without a report: ${t1.output.trim().split("\n")[0]}`);
    result.status = result.report.reviewers.some((reviewer) => reviewer.status === "ok") ? "ok" : "failed";
    if (result.status === "failed") result.error = "no reviewer answered";
  } catch (error) {
    result.error = error.message;
  } finally {
    if (keep) console.log(`kept ${tree}`);
    else git(entry.repo, ["worktree", "remove", "--force", tree], { allowFailure: true });
    if (!keep) git(entry.repo, ["worktree", "prune"], { allowFailure: true });
    rmSync(tmp, { recursive: true, force: true });
  }
  result.durationMs = Date.now() - started;
  return { ...result, ...score(entry, result.report) };
}

function score(entry, report) {
  const spots = report?.findings ?? [];
  const reviewers = report?.reviewers ?? [];
  const near = (spot, item) => spot.file === item.file && (spot.line == null || item.line == null || Math.abs(spot.line - item.line) <= NEAR_LINES);
  return {
    expected: entry.expected.length,
    hits: entry.expected.filter((item) => spots.some((spot) => near(spot, item))).length,
    noise: entry.expected.length ? null : spots.filter((spot) => ["P1", "P2"].includes(spot.severity) && !spot.preexisting).length,
    costUsd: reviewers.reduce((sum, reviewer) => sum + (reviewer.costUsd ?? 0), 0),
    reviewersOk: reviewers.filter((reviewer) => reviewer.status === "ok").length,
    reviewersFailed: reviewers.filter((reviewer) => reviewer.status !== "ok").length,
  };
}

function summarizeResults(results, config) {
  const mine = results.filter((result) => result.config === config);
  const clean = mine.filter((result) => result.noise !== null);
  const expected = mine.reduce((sum, result) => sum + result.expected, 0);
  const times = mine.map((result) => result.durationMs).sort((a, b) => a - b);
  return {
    config,
    cases: mine.length,
    failed: mine.filter((result) => result.status !== "ok").length,
    recall: expected ? mine.reduce((sum, result) => sum + result.hits, 0) / expected : null,
    noisePerCleanPr: clean.length ? clean.reduce((sum, result) => sum + result.noise, 0) / clean.length : null,
    costPerCaseUsd: mine.reduce((sum, result) => sum + result.costUsd, 0) / mine.length,
    p50Ms: times[Math.floor((times.length - 1) / 2)],
  };
}

const fixed = (value, digits, suffix = "") => (value === null ? "-" : `${value.toFixed(digits)}${suffix}`);

function printTable(results, summaries) {
  console.log("case                 config          status  recall  noise  cost      time  reviewers");
  for (const r of results) {
    const recall = r.expected ? `${r.hits}/${r.expected}` : "-";
    console.log(`${r.id.padEnd(20)} ${r.config.padEnd(15)} ${r.status.padEnd(7)} ${recall.padEnd(7)} ${String(r.noise ?? "-").padEnd(6)} ${fixed(r.costUsd, 3, "$").padEnd(9)} ${fixed(r.durationMs / 1000, 1, "s").padEnd(5)} ${r.reviewersOk} ok / ${r.reviewersFailed} failed${r.error ? `  (${r.error})` : ""}`);
  }
  console.log("\nconfig          cases  failed  recall  serious noise / clean PR  $ / case  p50");
  for (const s of summaries) console.log(`${s.config.padEnd(15)} ${String(s.cases).padEnd(6)} ${String(s.failed).padEnd(7)} ${fixed(s.recall, 2).padEnd(7)} ${fixed(s.noisePerCleanPr, 2).padEnd(25)} ${fixed(s.costPerCaseUsd, 3, "$").padEnd(9)} ${fixed(s.p50Ms / 1000, 1, "s")}`);
}

async function runAll(options) {
  const cases = readCases(options.cases).filter((entry) => !options.only || options.only.includes(entry.id));
  if (options.only) for (const id of options.only) if (!cases.some((entry) => entry.id === id)) usage(`no case ${id} in ${options.cases}`);
  if (!cases.length) usage("no cases to run");
  const work = mkdtempSync(join(process.env.TMPDIR || "/tmp", "review-eval-"));
  const results = [];
  try {
    for (const entry of cases) for (const config of options.configs) results.push(await review(entry, config, work, options.keep));
  } finally {
    if (!options.keep) rmSync(work, { recursive: true, force: true });
  }
  const summaries = options.configs.map((config) => summarizeResults(results, config.name));
  printTable(results, summaries);
  if (options.json) writeReport(options.json, { tool: "review-eval", cases: options.cases, results: results.map(({ report, ...rest }) => rest), summaries });
  return results.every((result) => result.status !== "ok") ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const onSignal = (signal) => stopGroups().then(() => process.exit(signal === "SIGINT" ? 130 : 143));
  process.on("SIGINT", () => onSignal("SIGINT"));
  process.on("SIGTERM", () => onSignal("SIGTERM"));
  if (options.command === "add") add(options);
  else process.exitCode = await runAll(options);
}
