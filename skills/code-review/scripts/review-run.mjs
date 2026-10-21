#!/usr/bin/env node
// review-run: the one way to call a deep reviewer or a fixer, on any account and
// harness. It resolves the repository's front from the private policy, tries that
// front's candidates for the role in order, falls back when a provider is limited,
// and records every attempt in the ledger. Contract: ../references/providers.md.
// Exit 0 = answered, 1 = no provider answered (BLOCKED), 2 = usage or policy
// error, 3 = the session to resume is unavailable and no fresh prompt was given.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cooldowns, findCall, readEvents } from "./lib/ledger.mjs";
import { candidates, dispatch, loadPolicy, policyPath, resolveFront } from "./lib/policy.mjs";
import { defaultReportPath, git, readJson, stopGroups, treeFingerprint, writePrivateFile, writeReport } from "./lib/repo.mjs";

const USAGE = `usage: review-run --role review|fix --prompt <file> --out <file> [-C <dir>]
                  [--effort <level>] [--author-model <model>] [--front <name>]
                  [--base <ref>] [--resume <call-id> [--fresh-prompt <file>]] [--label <text>]
                  [--timeout <seconds>] [--json <file>]
       review-run --plan --role t1|review|fix [-C <dir>] [--author-model <model>] [--front <name>]

Calls the first available reviewer or fixer that the review policy
(${policyPath()}) allows for this repository, falling back to the next
candidate when one is rate-limited, logged out or briefly unavailable.

  --role <role>            review (read-only deep review) or fix (writes the working tree)
  --prompt <file>          the complete prompt
  --out <file>             where the answer is written (mode 600)
  --base <ref>             append \`git diff <ref>...HEAD\` and its log to the prompt, so the reviewer
                           starts with the diff (Claude reviewers have no shell to run git)
  --effort <level>         reasoning effort (default from T0's route for this tree: the route's
                           level for a review, one below for a delta, high or medium for a fix)
  --author-model <model>   the model that wrote the change, or "human"; required for a review,
                           so a fallback can never land on the author's model
  --front <name>           choose the front when the repository's remotes match several
  --resume <call-id>       continue the session of an earlier call (a delta review)
  --fresh-prompt <file>    self-contained prompt for a different provider if that session's
                           provider is unavailable; without it, exit 3 instead
  --label <text>           free text kept in the ledger (PR, round)
  --timeout <s>            per call (default 2400)
  --json <file>            machine-readable result
  --plan                   print the candidates and their availability as JSON, call nothing`;

function parseArgs(argv) {
  const options = { cwd: process.cwd(), role: null, prompt: null, out: null, base: null, effort: null, authorModel: null, front: null, resume: null, freshPrompt: null, label: null, timeout: 2400, json: null, plan: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined) usage(`${arg} needs a value`);
      index += 1;
      return next;
    };
    if (arg === "-C") options.cwd = resolve(value());
    else if (arg === "--role") options.role = value();
    else if (arg === "--prompt") options.prompt = resolve(value());
    else if (arg === "--out") options.out = resolve(value());
    else if (arg === "--effort") options.effort = value();
    else if (arg === "--base") options.base = value();
    else if (arg === "--author-model") options.authorModel = value();
    else if (arg === "--front") options.front = value();
    else if (arg === "--resume") options.resume = value();
    else if (arg === "--fresh-prompt") options.freshPrompt = resolve(value());
    else if (arg === "--label") options.label = value();
    else if (arg === "--timeout") options.timeout = Number(value());
    else if (arg === "--json") options.json = resolve(value());
    else if (arg === "--plan") options.plan = true;
    else if (arg === "-h" || arg === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else usage(`unknown argument ${arg}`);
  }
  const roles = options.plan ? ["t1", "review", "fix"] : ["review", "fix"];
  if (!roles.includes(options.role)) usage(`--role must be one of ${roles.join(", ")}`);
  if (!options.plan && (!options.prompt || !options.out)) usage("--prompt and --out are required");
  if (options.effort && !/^(low|medium|high|xhigh|max)$/.test(options.effort)) usage("--effort must be low, medium, high, xhigh or max");
  if (!Number.isFinite(options.timeout) || options.timeout <= 0) usage("--timeout must be a positive number");
  if (options.freshPrompt && !options.resume) usage("--fresh-prompt only goes with --resume");
  if (options.role === "review" && !options.plan && !options.authorModel) usage('a review needs --author-model (the model that wrote the change, or "human")');
  if (options.authorModel === "human") options.authorModel = null;
  return options;
}

function usage(message) {
  console.error(`review-run: ${message}\n\n${USAGE}`);
  process.exit(2);
}

function stop(message, code = 2) {
  console.error(`review-run: ${message}`);
  process.exit(code);
}

const LEVELS = ["low", "medium", "high", "xhigh", "max"];
const MAX_INLINE_DIFF = 400 * 1024;

// T0's route for exactly this tree, when it exists, gives the starting effort,
// following codex-review's table: a delta one level below the full review, a fix
// at high (medium when the route says the change is docs, tests or UI).
function routeEffort(root, headSha, { role, resuming }) {
  const dirty = git(root, ["status", "--porcelain"]).trim().length > 0;
  const path = defaultReportPath("review-t0", root, headSha, dirty);
  const t0 = existsSync(path) ? readJson(() => readFileSync(path, "utf8")) : null;
  const level = t0?.verdict === "PASS" && t0.head?.tree === treeFingerprint(root) ? t0.route?.effort ?? null : null;
  if (!level) return null;
  if (role === "fix") return level === "medium" ? "medium" : "high";
  return resuming ? LEVELS[Math.max(1, LEVELS.indexOf(level) - 1)] : level;
}

// The fixed diff rides in the prompt: one less round trip, and the only way a
// reviewer without a shell sees it.
function withDiff(prompt, root, base) {
  const range = `${base}...HEAD`;
  const diff = git(root, ["diff", "-M", "--no-color", "--no-ext-diff", range], { allowFailure: true });
  if (diff === null) stop(`cannot diff ${range}`);
  const log = git(root, ["log", "--oneline", `${base}..HEAD`]).trim();
  const body = Buffer.byteLength(diff) > MAX_INLINE_DIFF
    ? `(The diff is ${Math.round(Buffer.byteLength(diff) / 1024)} KB, too large to include; read the changed files.)\n${git(root, ["diff", "--stat", range])}`
    : diff;
  return `${prompt.trimEnd()}\n\n<fixed_diff range="${range}">\n<commits>\n${log}\n</commits>\n${body}</fixed_diff>\n`;
}

function plan(front, options, headSha) {
  const cooled = cooldowns();
  const slots = options.role === "t1" ? (front.roles?.t1 ?? []).map((_, slot) => slot) : [0];
  const list = slots.map((slot) => candidates(front, options.role, { slot, authorModel: options.authorModel, headSha, cooled }).map(({ id, provider, skip, experiment, arm }) => ({
    id, kind: provider.kind, model: provider.model ?? null, effort: provider.effort ?? null, t3: provider.t3 ?? null, available: !skip, reason: skip, experiment, arm,
  })));
  console.log(JSON.stringify({ front: front.name, role: options.role, slots: list }, null, 2));
}

const elapsed = (ms) => `${Math.floor(ms / 60000)}m${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}s`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = git(options.cwd, ["rev-parse", "--show-toplevel"], { allowFailure: true })?.trim();
  if (!root) usage(`${options.cwd} is not inside a git repository`);
  let policy;
  let front;
  try {
    policy = loadPolicy();
    if (!policy) stop(`no review policy at ${policyPath()}; see references/providers.md`);
    front = resolveFront(policy, root, options.front);
  } catch (error) {
    stop(error.message);
  }
  const headSha = git(root, ["rev-parse", "HEAD"]).trim();
  if (options.plan) return plan(front, options, headSha);

  const read = (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch (error) {
      return stop(`cannot read ${path}: ${error.message}`);
    }
  };
  const prompt = options.base ? withDiff(read(options.prompt), root, options.base) : read(options.prompt);
  let resume = null;
  if (options.resume) {
    const earlier = findCall(options.resume, readEvents());
    if (!earlier || earlier.status !== "ok" || !earlier.sessionId) stop(`no successful call ${options.resume} with a session in the ledger`);
    if (earlier.front !== front.name || !front.providers[earlier.provider]) stop(`call ${options.resume} ran on ${earlier.front}/${earlier.provider}, which this front does not have; start a fresh review`);
    resume = { call: earlier.call, provider: earlier.provider, sessionId: earlier.sessionId, prompt };
  }
  const effort = options.effort ?? routeEffort(root, headSha, { role: options.role, resuming: Boolean(resume) });
  const started = Date.now();
  const { final, attempts } = await dispatch({
    front, role: options.role, prompt: resume ? (options.freshPrompt ? (options.base ? withDiff(read(options.freshPrompt), root, options.base) : read(options.freshPrompt)) : null) : prompt, root, effort,
    authorModel: options.authorModel, headSha, timeoutMs: options.timeout * 1000, label: options.label, resume,
    onAttempt: (attempt) => console.error(`review-run: ${attempt.provider} ${attempt.status}${attempt.until ? ` until ${attempt.until}` : ""}${attempt.error ? `: ${attempt.error.split("\n").at(-1)}` : ""}`),
  });

  const history = attempts.map(({ text, ...attempt }) => attempt);
  const result = { tool: "review-run", version: 1, front: front.name, role: options.role, head: headSha, effort, status: final?.status ?? "blocked", call: final?.call ?? null, provider: final?.provider ?? null, model: final?.resolvedModel ?? final?.model ?? null, sessionId: final?.sessionId ?? null, fresh: Boolean(final?.fresh), out: options.out, attempts: history };
  if (final?.status === "ok") writePrivateFile(options.out, final.text);
  if (options.json) writeReport(options.json, result);

  const fallbacks = history.filter((attempt) => attempt.call !== final?.call).map((attempt) => `${attempt.provider} ${attempt.status}${attempt.until ? ` until ${attempt.until}` : attempt.reason ? ` (${attempt.reason})` : ""}`);
  const tried = fallbacks.length ? `; skipped or failed: ${fallbacks.join(", ")}` : "";
  if (final?.status === "ok") {
    console.log(`review-run ${options.role}: ok via ${final.provider} (${result.model}${effort ? `, ${effort}` : ""}) in ${elapsed(Date.now() - started)}  call ${final.call}${final.sessionId ? `  session ${final.sessionId}` : ""}${final.fresh ? "  FRESH: a different provider than the resumed session; it saw the fresh prompt" : ""}${tried}  answer: ${options.out}`);
    return;
  }
  if (resume && !options.freshPrompt && !final) stop(`the session's provider ${resume.provider} is unavailable${tried}; pass --fresh-prompt with a self-contained full-review prompt to fall back`, 3);
  const until = history.map((attempt) => attempt.until).filter(Boolean).sort()[0];
  console.log(`review-run ${options.role}: ${final ? `${final.status.toUpperCase()} on ${final.provider}: ${final.error ?? ""}` : `BLOCKED: no candidate answered${until ? `; the earliest limit resets at ${until}` : ""}`}${tried}`);
  process.exitCode = 1;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await stopGroups();
    process.exit(130);
  });
}

main().catch((error) => {
  console.error(`review-run: ${error.message}`);
  process.exit(2);
});
