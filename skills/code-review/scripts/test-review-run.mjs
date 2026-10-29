#!/usr/bin/env node
// Contract for review-run, review-ledger and the provider/policy/ledger libraries
// with fake claude and codex CLIs, so no model is called. Needs git, node, gitleaks
// and semgrep for the T1 integration: review-t0 runs first.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { appendFileSync, chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scripts = dirname(fileURLToPath(import.meta.url));
const workspace = mkdtempSync(join(tmpdir(), "review-run-fixture-"));
const bin = join(workspace, "bin");
const state = join(workspace, "state");
const logFile = join(workspace, "calls.jsonl");
const controlFile = join(workspace, "control.json");
const env = { ...process.env, TMPDIR: workspace, AGENT_REVIEW_STATE: state, AGENT_REVIEW_POLICY: join(workspace, "policy.json"), REVIEW_T1_CLAUDE: "" };
const claudeBin = join(bin, "fake-claude");
const codexBin = join(bin, "fake-codex");
const cursorBin = join(bin, "fake-cursor");
let repo = "";

// One script plays both CLIs (by its file name). Behavior per model comes from
// control.json: ok, limit, auth, transient, transient-once, error. Every call is logged.
const FAKE = `#!${process.execPath}
const fs = require("node:fs");
const path = require("node:path");
const root = path.dirname(path.dirname(process.argv[1]));
const name = path.basename(process.argv[1]).replace("fake-", "");
const argv = process.argv.slice(2);
const stdin = fs.readFileSync(0, "utf8");
const model = argv[argv.indexOf(name === "codex" ? "-m" : "--model") + 1];
fs.appendFileSync(path.join(root, "calls.jsonl"), JSON.stringify({ cli: name, model, argv, stdin, hash: process.env.AGENT_REVIEW_PROMPT_SHA256 ?? null }) + "\\n");
const control = JSON.parse(fs.readFileSync(path.join(root, "control.json"), "utf8"));
let mode = control[model] ?? "ok";
if (mode === "transient-once") {
  const marker = path.join(root, "once-" + model);
  mode = fs.existsSync(marker) ? "ok" : "transient";
  fs.writeFileSync(marker, "");
}
const answer = control.answer ?? "answer from " + name + "/" + model;
const fakeCredential = ["FAKE", "CREDENTIAL", "0000", "0000"].join("-");
const epoch = Math.floor(Date.now() / 1000) + (control.resetIn ?? 3600);
const failures = {
  limit: ["Claude AI usage limit reached|" + epoch, 429, "You've hit your usage limit. Try again in 45 minutes."],
  auth: ["Not logged in. Please run /login", 401, "unauthorized: please login"],
  transient: ["overloaded, try later", 529, "stream disconnected before completion"],
  error: ["boom", undefined, "boom"],
  // Part of an answer, then a limit: the ledger must keep neither the answer nor its text.
  leak: ["LEAKED-ANSWER-MARKER partial review, then usage limit reached", undefined, "LEAKED-ANSWER-MARKER partial review, then rate limit"],
  // Built at run time, so no credential-shaped literal sits in the diff: providers
  // and prompt hooks drop or block a review prompt that carries one.
  secret: ["usage limit reached; request had Authorization: " + ["Bea", "rer"].join("") + " " + fakeCredential, 429, "rate limit; " + ["api", "key"].join("_") + "=" + fakeCredential],
  // What claude -p prints when a UserPromptSubmit hook blocks the prompt: exit 0, no turn.
  hooked: ["UserPromptSubmit operation blocked by hook", undefined, "hook"],
};
if (name === "cursor") {
  if (mode === "empty") {
    console.log(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "", session_id: "c-1" }));
    process.exit(0);
  }
  if (mode === "auth") {
    console.error("Error: Authentication required. Please run 'agent login' first, or set CURSOR_API_KEY environment variable.");
    process.exit(1);
  }
  if (mode === "plan-usage") {
    console.error("ActionRequiredError: " + model + " is not included in your weekly usage Buy credits or switch to a Grok model to continue.");
    process.exit(1);
  }
  const prompt = argv[argv.indexOf("--") + 1];
  const out = failures[mode]
    ? { type: "result", subtype: "error", is_error: true, result: failures[mode][0] }
    : { type: "result", subtype: "success", is_error: false, result: answer + " [" + prompt.trim() + "]", session_id: "c-1", usage: { inputTokens: 30, outputTokens: 4, cacheReadTokens: 60, cacheWriteTokens: 0 } };
  console.log(JSON.stringify(out));
  process.exit(failures[mode] ? 1 : 0);
}
if (name === "claude" && mode === "hooked") {
  console.log(JSON.stringify({ type: "result", is_error: false, result: failures.hooked[0], num_turns: 0, total_cost_usd: 0, usage: { input_tokens: 0, output_tokens: 0 } }));
  process.exit(0);
}
if (name === "claude") {
  const out = failures[mode]
    ? { type: "result", is_error: true, api_error_status: failures[mode][1], result: failures[mode][0], total_cost_usd: 0.005 }
    : { type: "result", is_error: false, result: answer, session_id: "s-1", num_turns: 2, total_cost_usd: 0.01,
        usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 90, cache_creation_input_tokens: 0 }, modelUsage: { "claude-sonnet-5-5": {} } };
  console.log(JSON.stringify(out));
  process.exit(failures[mode] ? 1 : 0);
}
console.log(JSON.stringify({ type: "thread.started", thread_id: "t-1" }));
if (mode === "empty") {
  console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 } }));
  fs.writeFileSync(argv[argv.indexOf("-o") + 1], "");
  process.exit(0);
}
if (failures[mode]) {
  console.log(JSON.stringify({ type: "turn.failed", error: { message: failures[mode][2] } }));
  process.exit(1);
}
fs.writeFileSync(argv[argv.indexOf("-o") + 1], answer);
console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 100, cached_input_tokens: 80, output_tokens: 7 } }));
`;

function sh(command, args, cwd = repo) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function write(file, content, root = repo) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), content);
}

function newRepo(name, remotes = [], parent = workspace) {
  repo = join(parent, name);
  mkdirSync(repo, { recursive: true });
  sh("git", ["init", "-q", "-b", "main"]);
  for (const [key, value] of [["user.email", "rr@example.invalid"], ["user.name", "rr fixture"], ["commit.gpgsign", "false"]]) sh("git", ["config", key, value]);
  remotes.forEach((url, index) => sh("git", ["remote", "add", `r${index}`, url]));
  write("README.md", "# fixture\n");
  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-q", "--no-verify", "-m", "base"]);
  return repo;
}

// Fresh ledger, call log and control for each scenario.
function reset(control = {}) {
  rmSync(state, { recursive: true, force: true });
  rmSync(logFile, { force: true });
  rmSync(join(workspace, "once-m-flaky"), { force: true });
  writeFileSync(controlFile, JSON.stringify(control));
}

const claude = (model, extra = {}) => ({ kind: "claude", bin: claudeBin, model, ...extra });
const codex = (model, extra = {}) => ({ kind: "codex", bin: codexBin, model, ...extra });
const cursor = (model, extra = {}) => ({ kind: "cursor", bin: cursorBin, model, ...extra });
const front = (name, providers, roles, match = { any: true }) => ({ name, match, providers, roles });
const setPolicy = (...fronts) => writeFileSync(env.AGENT_REVIEW_POLICY, JSON.stringify({ version: 1, fronts }));
// The usual policy: a review (and optionally fix) chain over the given providers.
const chain = (providers, ids, extraRoles = {}) => setPolicy(front("main", providers, { review: ids, ...extraRoles }));

const events = () => (existsSync(join(state, "ledger.jsonl")) ? readFileSync(join(state, "ledger.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);
const callEvents = () => events().filter((event) => event.type === "call");
const calls = () => (existsSync(logFile) ? readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);
const invoked = (model) => calls().filter((call) => call.model === model);

const promptFile = join(workspace, "prompt.txt");
const outFile = join(workspace, "answer.txt");
const jsonFile = join(workspace, "result.json");
writeFileSync(promptFile, "REVIEW-PROMPT\n");

function node(script, args, cwd = repo) {
  const result = spawnSync(process.execPath, [join(scripts, script), ...args], { cwd, encoding: "utf8", env });
  return { ...result, output: result.stdout + result.stderr };
}

// review-run in `repo`, role review unless the args say otherwise; `result` is the --json file.
function rr(args = [], { role = "review", cwd = repo } = {}) {
  rmSync(jsonFile, { force: true });
  rmSync(outFile, { force: true });
  const author = role === "review" && !args.includes("--author-model") ? ["--author-model", "human"] : [];
  const run = node("review-run.mjs", ["-C", cwd, "--role", role, "--prompt", promptFile, "--out", outFile, "--json", jsonFile, ...author, ...args], cwd);
  return { ...run, result: existsSync(jsonFile) ? JSON.parse(readFileSync(jsonFile, "utf8")) : null };
}

const plan = (args = [], role = "review") => {
  const author = role === "review" && !args.includes("--author-model") ? ["--author-model", "human"] : [];
  const run = node("review-run.mjs", ["-C", repo, "--plan", "--role", role, ...author, ...args]);
  return { ...run, plan: run.status === 0 ? JSON.parse(run.stdout) : null };
};
const ledgerCli = (...args) => node("review-ledger.mjs", args);
const untilOk = (iso, ms) => assert.ok(Math.abs(Date.parse(iso) - (Date.now() + ms)) < 120_000, `${iso} is not about ${ms} ms ahead`);

try {
  mkdirSync(bin);
  for (const path of [claudeBin, codexBin, cursorBin]) {
    writeFileSync(path, FAKE);
    chmodSync(path, 0o755);
  }
  newRepo("plain");

  // ---- 1. policy validation -----------------------------------------------------
  reset();
  const invalid = (providers, roles, pattern) => {
    setPolicy(front("main", providers, roles));
    const run = rr();
    assert.equal(run.status, 2, run.output);
    assert.match(run.output, pattern);
  };
  invalid({ c: { kind: "claude", bin: "claude", model: "m-ok" } }, { review: ["c"] }, /bin must be an absolute path/);
  invalid({ c: claude("m-ok") }, { review: ["ghost"] }, /unknown provider ghost/);
  invalid({ a: { kind: "agy", bin: join(bin, "agy"), model: "x" } }, { review: ["a"] }, /agy provider a cannot take this role/);
  invalid({ c: claude("m-ok") }, { judge: ["c"] }, /unknown role judge/);
  rmSync(env.AGENT_REVIEW_POLICY);
  const missing = rr();
  assert.equal(missing.status, 2, missing.output);
  assert.match(missing.output, /no review policy/);
  assert.equal(calls().length, 0, "an invalid policy calls no CLI");

  // ---- 2. front resolution --------------------------------------------------------
  const pathParent = join(workspace, "pathfront");
  setPolicy(
    front("P", { m: claude("m-ok") }, { review: ["m"] }, { paths: [pathParent] }),
    front("A", { m: claude("m-ok") }, { review: ["m"] }, { remotes: ["github.com/OrgA/"] }),
    front("B", { m: claude("m-ok") }, { review: ["m"] }, { remotes: ["github.com/OrgB/"] }),
  );
  newRepo("ssh-a", ["git@github.com:OrgA/x.git"]);
  assert.equal(plan().plan.front, "A", "scp-style remote, case-insensitive");
  newRepo("https-b", ["https://token@github.com/orgb/x"]);
  assert.equal(plan().plan.front, "B");
  newRepo("lookalike", ["git@github.com:OrgAB/x.git"]);
  assert.match(plan().output, /matches no front/, "OrgAB is not OrgA");
  newRepo("under-path", ["git@github.com:OrgA/x.git"], pathParent);
  assert.equal(plan().plan.front, "P", "a path rule beats the remote");
  newRepo("both", ["git@github.com:OrgA/x.git", "https://github.com/OrgB/x.git"]);
  const several = plan();
  assert.equal(several.status, 2, several.output);
  assert.match(several.output, /several fronts \(A, B\)/);
  assert.equal(plan(["--front", "A"]).plan.front, "A");
  assert.equal(plan(["--front", "B"]).plan.front, "B");
  const wrong = plan(["--front", "P"]);
  assert.equal(wrong.status, 2, wrong.output);
  assert.match(wrong.output, /--front P does not match/);
  newRepo("nowhere", ["git@gitlab.com:Other/x.git"]);
  const none = plan();
  assert.equal(none.status, 2, none.output);
  assert.match(none.output, /matches no front/);

  // ---- 3. fallback on a limit -----------------------------------------------------
  newRepo("work");
  const limitedThenOk = () => chain({ "claude-limited": claude("m-limited"), "codex-ok": codex("m-ok") }, ["claude-limited", "codex-ok"]);
  limitedThenOk();
  reset({ "m-limited": "limit", "m-ok": "ok" });
  const fell = rr();
  assert.equal(fell.status, 0, fell.output);
  assert.match(fell.output, /ok via codex-ok/);
  assert.equal(readFileSync(outFile, "utf8"), "answer from codex/m-ok");
  assert.equal(fell.result.provider, "codex-ok");
  assert.deepEqual(fell.result.attempts.map((attempt) => [attempt.provider, attempt.status]), [["claude-limited", "limit"], ["codex-ok", "ok"]]);
  const [limited, served] = callEvents();
  assert.equal(callEvents().length, 2);
  assert.equal(limited.status, "limit");
  untilOk(limited.until, 3_600_000);
  assert.deepEqual([served.status, served.sessionId, served.usage.cacheRead, served.usage.input, served.usage.output], ["ok", "t-1", 80, 20, 7]);
  assert.equal(served.front, "main");
  assert.equal(served.role, "review");
  assert.equal(calls()[0].stdin, "REVIEW-PROMPT\n", "the prompt arrives on stdin");

  // ---- 4. cooldown, limits, clear ---------------------------------------------------
  writeFileSync(logFile, "");
  const cooled = rr();
  assert.equal(cooled.status, 0, cooled.output);
  assert.equal(invoked("m-limited").length, 0, "a cooling provider is not invoked");
  assert.deepEqual(cooled.result.attempts.map((attempt) => [attempt.provider, attempt.status]), [["claude-limited", "skipped"], ["codex-ok", "ok"]]);
  assert.match(cooled.result.attempts[0].reason, /^limit until /);
  assert.match(ledgerCli("limits").stdout, /^main\/claude-limited {2}limit until /);
  assert.equal(ledgerCli("clear", "claude-limited", "--front", "main").status, 0);
  assert.match(ledgerCli("limits").stdout, /no provider is cooling down/);
  rr();
  assert.equal(invoked("m-limited").length, 1, "a cleared provider is invoked again");
  assert.match(ledgerCli("limits").stdout, /claude-limited/, "and cools down again after another limit");
  // A limit without a stated reset (codex says "in 45 minutes") still sets a cooldown.
  chain({ "codex-limited": codex("m-limited"), "claude-ok": claude("m-ok") }, ["codex-limited", "claude-ok"]);
  reset({ "m-limited": "limit" });
  rr();
  untilOk(callEvents()[0].until, 45 * 60_000);
  reset({ "m-limited": "auth" });
  assert.equal(rr().status, 0);
  assert.equal(callEvents()[0].status, "auth");
  assert.equal(rr().status, 0);
  assert.equal(invoked("m-limited").length, 1, "a logged-out provider also cools down");

  // The cooldown follows the subscription: a limit skips the same model at another
  // effort on that CLI, a failed login skips every model on it, another CLI still runs.
  const sibling = (status) => {
    chain({ "a-high": claude("m-shared", { effort: "high" }), "a-med": claude("m-shared", { effort: "medium" }), "a-other": claude("m-other"), "codex-ok": codex("m-ok") }, ["a-high", "a-med", "a-other", "codex-ok"]);
    reset({ "m-shared": status, "m-other": "ok" });
    return rr().result.attempts.map((attempt) => [attempt.provider, attempt.status]);
  };
  assert.deepEqual(sibling("limit"), [["a-high", "limit"], ["a-med", "skipped"], ["a-other", "ok"]]);
  const shared = rr().result.attempts.find((attempt) => attempt.provider === "a-med");
  assert.match(shared.reason, /^limit until .* \(shared with a-high\)$/);
  assert.deepEqual(sibling("auth"), [["a-high", "auth"], ["a-med", "skipped"], ["a-other", "skipped"], ["codex-ok", "ok"]]);
  assert.equal(invoked("m-shared").length, 1, "the shared model ran once");
  // Cursor names the effort inside the model id; it is still the same quota.
  chain({ "c-high": cursor("m-c[effort=high]"), "c-med": cursor("m-c[effort=medium]"), "codex-ok": codex("m-ok") }, ["c-high", "c-med", "codex-ok"]);
  reset({ "m-c[effort=high]": "limit", "m-c[effort=medium]": "ok" });
  assert.deepEqual(rr().result.attempts.map((attempt) => [attempt.provider, attempt.status]), [["c-high", "limit"], ["c-med", "skipped"], ["codex-ok", "ok"]]);
  // A reset already past by the time the chain reaches the sibling no longer skips it.
  sibling("ok");
  reset({ "m-shared": "limit", "resetIn": -60, "m-other": "ok" });
  assert.deepEqual(rr().result.attempts.map((attempt) => [attempt.provider, attempt.status]), [["a-high", "limit"], ["a-med", "limit"], ["a-other", "ok"]]);

  // ---- 5. transient retry, hard errors -----------------------------------------------
  chain({ "claude-flaky": claude("m-flaky"), "codex-ok": codex("m-ok") }, ["claude-flaky", "codex-ok"]);
  reset({ "m-flaky": "transient-once" });
  const flaky = rr();
  assert.equal(flaky.status, 0, flaky.output);
  assert.equal(flaky.result.provider, "claude-flaky");
  assert.deepEqual(callEvents().map((call) => [call.status, call.retry]), [["transient", undefined], ["ok", true]]);
  assert.equal(invoked("m-ok").length, 0, "a successful retry does not fall back");
  reset({ "m-flaky": "transient" });
  assert.equal(rr().result.provider, "codex-ok", "a second transient failure falls back");
  assert.equal(invoked("m-flaky").length, 2, "retried exactly once");
  assert.equal(ledgerCli("limits").stdout.includes("claude-flaky"), false, "transient failures cool nothing");
  reset({ "m-flaky": "error" });
  const hard = rr();
  assert.equal(hard.status, 1, hard.output);
  assert.match(hard.output, /ERROR on claude-flaky/);
  assert.equal(invoked("m-ok").length, 0, "an error stops the chain");
  assert.equal(invoked("m-flaky").length, 1, "an error is not retried");
  assert.equal(hard.result.status, "error");

  // ---- 6. independence from the author -----------------------------------------------
  chain({ "claude-sonnet": claude("sonnet"), "codex-ok": codex("m-ok") }, ["claude-sonnet", "codex-ok"]);
  reset();
  const planned = plan(["--author-model", "claude-sonnet-5-5"]).plan.slots[0];
  assert.deepEqual(planned.map((entry) => [entry.id, entry.available]), [["claude-sonnet", false], ["codex-ok", true]]);
  assert.match(planned[0].reason, /same model as the author \(claude-sonnet-5-5\)/);
  assert.equal(plan().plan.slots[0][0].available, true, "without an author every provider is available");
  const independent = rr(["--author-model", "claude-sonnet-5-5"]);
  assert.equal(independent.result.provider, "codex-ok");
  assert.equal(invoked("sonnet").length, 0);
  chain({ "claude-sonnet": claude("sonnet") }, ["claude-sonnet"]);
  const lonely = rr(["--author-model", "claude-sonnet-5-5"]);
  assert.equal(lonely.status, 1, lonely.output);
  assert.match(lonely.output, /BLOCKED/);
  const anonymous = node("review-run.mjs", ["-C", repo, "--role", "review", "--prompt", promptFile, "--out", outFile]);
  assert.equal(anonymous.status, 2, "a review without --author-model is refused");
  assert.match(anonymous.output, /needs --author-model/);
  assert.equal(node("review-run.mjs", ["-C", repo, "--plan", "--role", "review"]).status, 2, "the T3 plan needs the author too");
  // One rule everywhere: only the author's own model is skipped. Opus work may get
  // a Sonnet review, and a Cursor id with parameters is still that model.
  setPolicy(front("main", { "claude-sonnet": claude("sonnet"), "cursor-sonnet": cursor("claude-sonnet-5-5[effort=high]"), "codex-ok": codex("gpt-6.1-sol") }, { review: ["claude-sonnet", "cursor-sonnet", "codex-ok"] }));
  assert.deepEqual(plan(["--author-model", "claude-opus-5-5"]).plan.slots[0].map((entry) => entry.available), [true, true, true]);
  assert.deepEqual(plan(["--author-model", "sonnet"]).plan.slots[0].map((entry) => entry.available), [false, false, true]);
  setPolicy({ ...front("main", { "codex-ok": codex("gpt-6.1-sol") }, { review: ["codex-ok"] }), independence: "vendor" });
  const leftover = plan();
  assert.equal(leftover.status, 2, "a leftover independence key is refused, not ignored");
  assert.match(leftover.output, /independence was removed/);

  // ---- 6b. Cursor: read-only ask mode, prompt on argv, auth falls back ---------------------
  chain({ "codex-limited": codex("m-limited"), "cursor-gpt": cursor("gpt-5.6-sol[reasoning=high]", { t3: { providerInstanceId: "cursor", model: "gpt-5.6-sol" } }) }, ["codex-limited", "cursor-gpt"]);
  reset({ "m-limited": "limit" });
  const viaCursor = rr(["--effort", "high"]);
  assert.equal(viaCursor.status, 0, viaCursor.output);
  assert.equal(readFileSync(outFile, "utf8"), "answer from cursor/gpt-5.6-sol[reasoning=high] [REVIEW-PROMPT]");
  const cursorCall = calls().find((call) => call.cli === "cursor");
  for (const flag of ["-p", "--trust"]) assert.ok(cursorCall.argv.includes(flag), flag);
  assert.deepEqual([cursorCall.argv[cursorCall.argv.indexOf("--mode") + 1], cursorCall.argv[cursorCall.argv.indexOf("--sandbox") + 1]], ["ask", "enabled"]);
  assert.equal(cursorCall.argv.includes("--effort"), false, "Cursor's effort lives in the model id");
  const cursorEvent = callEvents().find((event) => event.provider === "cursor-gpt");
  assert.deepEqual([cursorEvent.status, cursorEvent.effort, cursorEvent.sessionId, cursorEvent.usage.cacheRead], ["ok", null, "c-1", 60]);
  assert.equal(plan().plan.slots[0][1].t3.providerInstanceId, "cursor", "inside T3 the plan names the cursor instance");
  // Not logged in outside T3: auth, cooled down, and the next candidate answers.
  chain({ "cursor-gpt": cursor("gpt-5.6-sol"), "claude-ok": claude("m-ok") }, ["cursor-gpt", "claude-ok"]);
  reset({ "gpt-5.6-sol": "auth" });
  const loggedOut = rr();
  assert.equal(loggedOut.result.provider, "claude-ok", loggedOut.output);
  assert.deepEqual(callEvents().map((event) => [event.provider, event.status]), [["cursor-gpt", "auth"], ["claude-ok", "ok"]]);
  // The plan's weekly usage ran out for this model: a limit, so the next candidate answers.
  reset({ "gpt-5.6-sol": "plan-usage" });
  const outOfPlan = rr();
  assert.equal(outOfPlan.result.provider, "claude-ok", outOfPlan.output);
  assert.deepEqual(callEvents().map((event) => [event.provider, event.status]), [["cursor-gpt", "limit"], ["claude-ok", "ok"]]);
  untilOk(callEvents()[0].until, 30 * 60_000); // no reset time in the message: the default limit cooldown
  // A prompt too long for argv goes to a candidate that reads stdin.
  const bigPrompt = join(workspace, "big-prompt.txt");
  writeFileSync(bigPrompt, "x".repeat(720 * 1024));
  reset();
  const oversized = rr(["--prompt", bigPrompt]);
  assert.equal(oversized.result.provider, "claude-ok", oversized.output);
  assert.deepEqual(callEvents().map((event) => [event.provider, event.status]), [["cursor-gpt", "oversize"], ["claude-ok", "ok"]]);
  assert.equal(invoked("gpt-5.6-sol").length, 0, "an oversize prompt never reaches the argv CLI");
  // An empty answer falls back like Claude's and Codex's.
  reset({ "gpt-5.6-sol": "empty" });
  const emptyCursor = rr();
  assert.equal(emptyCursor.result.provider, "claude-ok", emptyCursor.output);
  assert.equal(callEvents()[0].status, "empty");
  invalid({ c: cursor("gpt-5.6-sol") }, { fix: ["c"] }, /cursor provider c cannot take this role/);

  // ---- 7. A/B split is stable per head ---------------------------------------------------
  setPolicy(front("main", { a: claude("m-ok"), b: codex("m-ok") }, { review: [{ split: ["a", "b"] }] }));
  const arms = [plan().plan.slots[0], plan().plan.slots[0]];
  assert.deepEqual(arms[0], arms[1], "same HEAD, same arm");
  assert.deepEqual(arms[0].map((entry) => entry.id).sort(), ["a", "b"], "the other arm stays as a fallback");
  assert.equal(arms[0][0].experiment, "a|b");
  assert.equal(arms[0][0].arm, arms[0][0].id);
  reset();
  assert.equal(rr().result.provider, arms[0][0].id);
  assert.equal(callEvents()[0].experiment, "a|b");

  // ---- 8. resume ----------------------------------------------------------------------------
  chain({ "codex-ok": codex("m-ok"), "claude-ok": claude("m-claude") }, ["codex-ok", "claude-ok"]);
  reset();
  const first = rr();
  assert.equal(first.result.provider, "codex-ok");
  const delta = join(workspace, "delta.txt");
  const fresh = join(workspace, "fresh.txt");
  writeFileSync(delta, "DELTA-PROMPT\n");
  writeFileSync(fresh, "FRESH-FULL-PROMPT\n");
  const resumed = node("review-run.mjs", ["-C", repo, "--role", "review", "--prompt", delta, "--out", outFile, "--json", jsonFile, "--resume", first.result.call, "--author-model", "human"]);
  assert.equal(resumed.status, 0, resumed.output);
  const resumeCall = calls().at(-1);
  assert.deepEqual(resumeCall.argv.slice(0, 3), ["exec", "resume", "t-1"]);
  assert.ok(!resumeCall.argv.includes("-s") && !resumeCall.argv.includes("-C"), "exec resume takes neither -s nor -C");
  assert.ok(resumeCall.argv.includes('sandbox_mode="read-only"'));
  assert.equal(resumeCall.stdin, "DELTA-PROMPT\n");
  assert.equal(callEvents().at(-1).resumeOf, first.result.call);
  const resume = (extra) => {
    rmSync(jsonFile, { force: true });
    const run = node("review-run.mjs", ["-C", repo, "--role", "review", "--prompt", delta, "--out", outFile, "--json", jsonFile, "--resume", first.result.call, "--author-model", "human", ...extra]);
    return { ...run, result: existsSync(jsonFile) ? JSON.parse(readFileSync(jsonFile, "utf8")) : null };
  };
  writeFileSync(controlFile, JSON.stringify({ "m-ok": "limit" }));
  const stranded = resume([]);
  assert.equal(stranded.status, 3, stranded.output);
  assert.match(stranded.output, /pass --fresh-prompt/);
  assert.equal(invoked("m-claude").length, 0, "without a fresh prompt no other provider sees the session");
  assert.equal(resume(["--fresh-prompt", fresh]).status, 2, "a fresh fallback needs the full review's base");
  const rescued = resume(["--fresh-prompt", fresh, "--full-base", "HEAD"]);
  assert.equal(rescued.status, 0, rescued.output);
  assert.equal(rescued.result.provider, "claude-ok");
  assert.equal(rescued.result.fresh, true);
  assert.match(rescued.output, /FRESH/);
  assert.match(invoked("m-claude")[0].stdin, /^FRESH-FULL-PROMPT\n[\s\S]*<fixed_diff range="HEAD\.\.\.HEAD">/, "the fresh reviewer gets the full review's diff");
  assert.equal(invoked("m-claude")[0].argv.includes("--resume"), false);
  assert.equal(resume(["--fresh-prompt", fresh, "--full-base", "HEAD"]).status, 0, "a cooled session provider is skipped, not retried");
  const unknown = node("review-run.mjs", ["-C", repo, "--role", "review", "--prompt", delta, "--out", outFile, "--resume", "nope", "--author-model", "human"]);
  assert.equal(unknown.status, 2, unknown.output);
  assert.equal(node("review-run.mjs", ["-C", repo, "--role", "review", "--prompt", delta, "--out", outFile, "--fresh-prompt", fresh]).status, 2, "--fresh-prompt needs --resume");

  // A session continues only in its role, and only while its provider is still independent.
  chain({ "codex-ok": codex("m-ok"), "claude-sonnet": claude("sonnet") }, ["claude-sonnet", "codex-ok"], { fix: ["codex-ok"] });
  reset();
  const fixCall = rr([], { role: "fix" });
  const crossRole = node("review-run.mjs", ["-C", repo, "--role", "review", "--prompt", delta, "--out", outFile, "--resume", fixCall.result.call, "--author-model", "human"]);
  assert.equal(crossRole.status, 2, crossRole.output);
  assert.match(crossRole.output, /was a fix, not a review/);
  const bySonnet = rr();
  assert.equal(bySonnet.result.provider, "claude-sonnet");
  const sameAuthor = node("review-run.mjs", ["-C", repo, "--role", "review", "--prompt", delta, "--out", outFile, "--resume", bySonnet.result.call, "--author-model", "claude-sonnet-5-5"]);
  assert.equal(sameAuthor.status, 3, `the author's own model is not resumed\n${sameAuthor.output}`);

  // ---- 8b. failures keep answers out of the ledger, and command reviewers fall back --------------
  chain({ "claude-leak": claude("m-leak"), "cmd": { kind: "command", model: "cmd-model", command: "echo 'LEAKED-ANSWER-MARKER 429 Too Many Requests' >&2; exit 1" }, "codex-ok": codex("m-ok") }, ["claude-leak", "cmd", "codex-ok"]);
  reset({ "m-leak": "leak" });
  const leaky = rr();
  assert.equal(leaky.status, 0, leaky.output);
  assert.deepEqual(callEvents().map((event) => [event.provider, event.status]), [["claude-leak", "limit"], ["cmd", "limit"], ["codex-ok", "ok"]]);
  assert.ok(!readFileSync(join(state, "ledger.jsonl"), "utf8").includes("LEAKED-ANSWER-MARKER"), "no answer text in the ledger");
  assert.match(callEvents()[1].error, /^limit, exit 1, "(429|too many requests)"$/);
  // A prompt blocked by a hook is not an answer: the next reviewer takes it.
  chain({ "claude-hooked": claude("m-hooked"), "codex-ok": codex("m-ok") }, ["claude-hooked", "codex-ok"]);
  reset({ "m-hooked": "hooked" });
  const hooked = rr();
  assert.equal(hooked.result.provider, "codex-ok", hooked.output);
  assert.equal(callEvents()[0].status, "empty");
  // A silently dropped turn (Codex: exit 0, no answer, no tokens) falls back without a cooldown.
  chain({ "codex-empty": codex("m-empty"), "claude-ok": claude("m-ok") }, ["codex-empty", "claude-ok"]);
  reset({ "m-empty": "empty" });
  const dropped = rr();
  assert.equal(dropped.result.provider, "claude-ok", dropped.output);
  assert.deepEqual(callEvents().map((event) => event.status), ["empty", "ok"]);
  assert.match(ledgerCli("limits").stdout, /no provider is cooling down/);
  // Credentials in a CLI's diagnostic never reach the console or the JSON result.
  chain({ "claude-secret": claude("m-secret"), "codex-ok": codex("m-ok") }, ["claude-secret", "codex-ok"]);
  reset({ "m-secret": "secret" });
  const masked = rr();
  assert.equal(masked.status, 0, masked.output);
  assert.ok(!masked.output.includes("FAKECREDENTIAL") && !readFileSync(jsonFile, "utf8").includes("FAKECREDENTIAL"), masked.output);
  assert.match(masked.output, /\[redacted\]/);
  setPolicy(front("main", { cmd: { kind: "command", command: "true" } }, { review: ["cmd"] }));
  assert.match(plan().output, /provider cmd: needs a model/, "a command reviewer must name its model");
  // Too large to include: only a reviewer with a shell may take it.
  chain({ "claude-ok": claude("m-claude"), "codex-ok": codex("m-ok") }, ["claude-ok", "codex-ok"]);
  write("big.txt", "x".repeat(420 * 1024) + "\n");
  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-q", "--no-verify", "-m", "big"]);
  reset();
  const big = rr(["--base", "HEAD~1"]);
  assert.equal(big.result.provider, "codex-ok", big.output);
  assert.match(big.result.attempts[0].reason, /too large to include/);
  sh("git", ["reset", "-q", "--hard", "HEAD~1"]);

  // ---- 9. sandbox per role -----------------------------------------------------------------------
  chain({ "codex-ok": codex("m-ok", { writableRoots: ["/tmp/extra"] }), "claude-ok": claude("m-claude", { allowedTools: ["Bash(npm test:*)"] }) }, ["codex-ok"], { fix: ["codex-ok"] });
  reset();
  const flag = (argv, name) => argv[argv.indexOf(name) + 1];
  rr();
  rr([], { role: "fix" });
  const [reviewArgs, fixArgs] = calls().map((call) => call.argv);
  assert.equal(flag(reviewArgs, "-s"), "read-only");
  assert.equal(flag(fixArgs, "-s"), "workspace-write");
  assert.ok(fixArgs.includes('sandbox_workspace_write.writable_roots=["/tmp/extra"]'));
  assert.ok(!reviewArgs.some((arg) => arg.includes("writable_roots")), "review never widens the sandbox");
  chain({ "claude-ok": claude("m-claude", { allowedTools: ["Bash(npm test:*)"] }) }, ["claude-ok"], { fix: ["claude-ok"] });
  writeFileSync(logFile, "");
  rr();
  rr([], { role: "fix" });
  const [claudeReview, claudeFix] = calls().map((call) => call.argv);
  assert.equal(flag(claudeReview, "--permission-mode"), "dontAsk");
  assert.ok(!claudeReview.some((arg) => arg.includes("Bash")), "the Claude reviewer has no shell, not even git");
  assert.equal(flag(claudeReview, "--model"), "m-claude");
  assert.equal(flag(claudeFix, "--permission-mode"), "acceptEdits");
  assert.ok(claudeFix.includes("Bash(npm test:*)"), "only the fixer gets the provider's extra tools");
  const effort = rr(["--effort", "high"]);
  assert.equal(flag(calls().at(-1).argv, "--effort"), "high");
  assert.equal(effort.result.effort, "high");
  assert.equal(rr(["--effort", "turbo"]).status, 2);

  // ---- 10. review-ledger: triage and stats ----------------------------------------------------------
  chain({ "claude-ok": claude("m-claude") }, ["claude-ok"]);
  reset();
  const reviewed = rr(["--label", "pr-1"]);
  const decisions = join(workspace, "decisions.json");
  writeFileSync(decisions, JSON.stringify([
    { severity: "high", title: "real bug", file: "a.ts", line: 3, decision: "fixed" },
    { severity: "low", title: "nit", decision: "wrong", reason: "the guard is upstream" },
  ]));
  const triaged = ledgerCli("triage", "--call", reviewed.result.call, "--decisions", decisions);
  assert.equal(triaged.status, 0, triaged.output);
  assert.deepEqual(events().filter((event) => event.type === "triage").map((event) => [event.decision, event.serious, event.provider]), [["fixed", true, "claude-ok"], ["wrong", false, "claude-ok"]]);
  writeFileSync(decisions, JSON.stringify([{ title: "no reason", decision: "wrong" }]));
  const noReason = ledgerCli("triage", "--call", reviewed.result.call, "--decisions", decisions);
  assert.equal(noReason.status, 2, noReason.output);
  assert.match(noReason.output, /needs a reason/);
  writeFileSync(decisions, JSON.stringify([{ title: "x", decision: "maybe" }]));
  assert.equal(ledgerCli("triage", "--call", reviewed.result.call, "--decisions", decisions).status, 2);
  assert.equal(ledgerCli("triage", "--call", "nope", "--decisions", decisions).status, 2);
  assert.equal(events().filter((event) => event.type === "triage").length, 2, "rejected decisions record nothing");
  const stats = JSON.parse(ledgerCli("stats", "--json").stdout);
  assert.equal(stats.rows.length, 1);
  const [row] = stats.rows;
  assert.deepEqual([row.provider, row.role, row.calls, row.ok, row.triaged, row.actedOn, row.wrong], ["claude-ok", "review", 1, 1, 2, 0.5, 0.5]);
  assert.equal(row.cacheRead, 0.9, "cache reads over all prompt tokens: 90 / (10 + 90 + 0)");
  assert.equal(row.costPerOk, 0.01);
  assert.equal(row.seriousFixedPerReview, 1);
  assert.match(ledgerCli("stats").stdout, /claude-ok\s+m-claude|claude-ok\s+claude-sonnet-5-5/, "table lists the provider");
  const recorded = ledgerCli("record", "--front", "main", "--role", "review", "--provider", "t3-opus", "--status", "limit", "--until", new Date(Date.now() + 3_600_000).toISOString());
  assert.equal(recorded.status, 0, recorded.output);
  assert.match(ledgerCli("limits").stdout, /^main\/t3-opus {2}limit until /, "a manually recorded limit cools the provider");
  // A failed login and a spent quota land in different columns.
  assert.equal(ledgerCli("record", "--front", "main", "--role", "review", "--provider", "t3-opus", "--status", "auth").status, 0);
  const opusRow = JSON.parse(ledgerCli("stats", "--json").stdout).rows.find((entry) => entry.provider === "t3-opus");
  assert.deepEqual([opusRow.calls, opusRow.limited, opusRow.auth], [2, 1, 1]);
  assert.match(ledgerCli("stats").stdout, /limited\s+auth\s+p50/);
  assert.equal(ledgerCli("record", "--front", "main", "--role", "review", "--provider", "t3-sol", "--model", "gpt-6.1-sol", "--effort", "high", "--status", "ok", "--duration", "300", "--turns", "4", "--cost", "0.5", "--input", "100", "--cache-read", "300").status, 0);
  const t3Row = JSON.parse(ledgerCli("stats", "--json").stdout).rows.find((entry) => entry.provider === "t3-sol");
  assert.deepEqual([t3Row.model, t3Row.effort, t3Row.p50, t3Row.turnsP50, t3Row.costPerOk, t3Row.cacheRead], ["gpt-6.1-sol", "high", 300_000, 4, 0.5, 0.75]);
  // --by size splits each row by the change's reviewable lines; calls without a size land in "?".
  assert.equal(ledgerCli("record", "--front", "main", "--role", "review", "--provider", "t3-sol", "--model", "gpt-6.1-sol", "--effort", "high", "--status", "ok", "--duration", "900", "--lines", "1200", "--files", "40").status, 0);
  const bySize = JSON.parse(ledgerCli("stats", "--by", "size", "--json").stdout).rows.filter((entry) => entry.provider === "t3-sol");
  assert.deepEqual(bySize.map((entry) => [entry.size, entry.calls, entry.p50]), [[">800", 1, 900_000], ["?", 1, 300_000]]);
  assert.match(ledgerCli("stats", "--by", "size").stdout, /effort\s+size\s+calls/);
  assert.equal(ledgerCli("stats", "--by", "repo").status, 2, "--by takes only size");
  assert.equal(ledgerCli("record", "--front", "main", "--role", "review", "--provider", "x", "--status", "ok", "--lines", "-1").status, 2);
  assert.equal(ledgerCli("record", "--front", "main", "--role", "review", "--provider", "x", "--status", "ok", "--files", "3").status, 2, "--files alone would be dropped");
  assert.equal(ledgerCli("record", "--front", "main", "--role", "review", "--provider", "x", "--status", "limit", "--until", "soon").status, 2, "an unreadable reset is refused");
  assert.equal(ledgerCli("record", "--role", "review", "--provider", "x", "--status", "ok").status, 2, "record needs the front");
  // Cooldowns belong to a front: the same id on another account stays available.
  ledgerCli("record", "--front", "other", "--role", "review", "--provider", "claude-ok", "--status", "limit");
  assert.equal(plan().plan.slots[0][0].available, true, "another front's limit does not cool this front's claude-ok");
  // findings lists what was fixed, for spotting repeats; --decision widens it.
  assert.match(ledgerCli("findings").stdout, /review {2}high {2}fixed {2}a\.ts:3 {2}real bug\nreview-ledger: 1 finding\(s\)/);
  assert.deepEqual(JSON.parse(ledgerCli("findings", "--decision", "fixed,wrong", "--json").stdout).map((item) => [item.title, item.decision, item.source]), [["real bug", "fixed", "review"], ["nit", "wrong", "review"]], "one call's findings stay apart");
  assert.equal(JSON.parse(ledgerCli("findings", "--json").stdout)[0].group, null, "a deep review finding has no T1 group");
  assert.equal(JSON.parse(ledgerCli("findings", "--repo", "nope", "--json").stdout).length, 0);
  assert.equal(ledgerCli("findings", "--decision", "maybe").status, 2);
  // Triage again to correct a decision: the newest one wins, nothing is counted twice.
  writeFileSync(decisions, JSON.stringify([{ severity: "high", title: "real bug", file: "a.ts", line: 3, decision: "wrong", reason: "misread the guard" }]));
  assert.equal(ledgerCli("triage", "--call", reviewed.result.call, "--decisions", decisions).status, 0);
  const corrected = JSON.parse(ledgerCli("stats", "--json").stdout).rows.find((entry) => entry.provider === "claude-ok");
  assert.deepEqual([corrected.triaged, corrected.actedOn, corrected.wrong], [2, 0, 1]);
  assert.match(ledgerCli("findings").stdout, /^review-ledger: 0 finding\(s\)/, "a corrected decision leaves the fixed list");
  // A split needs two arms.
  setPolicy(front("main", { a: claude("m-ok") }, { review: [{ split: [] }] }));
  assert.match(plan().output, /a split needs at least two provider ids/);
  // --base puts the fixed diff in the prompt (the Claude reviewer has no shell).
  chain({ "claude-ok": claude("m-ok") }, ["claude-ok"]);
  write("src/based.ts", "export const BASED_MARKER = 1;\n");
  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-q", "--no-verify", "-m", "feat: based"]);
  writeFileSync(logFile, "");
  assert.equal(rr(["--base", "HEAD~1"]).status, 0);
  assert.match(calls()[0].stdin, /<fixed_diff range="HEAD~1...HEAD">[\s\S]*feat: based[\s\S]*BASED_MARKER/);
  // A linked worktree of a repository matched by path belongs to the same front.
  const owned = newRepo("owned", [], join(workspace, "owned-root"));
  const linked = join(workspace, "elsewhere", "wt");
  sh("git", ["worktree", "add", "-q", "--detach", linked], owned);
  setPolicy(front("owned", { a: claude("m-ok") }, { review: ["a"] }, { paths: [join(workspace, "owned-root")] }));
  repo = linked;
  assert.equal(plan().plan?.front, "owned", "the worktree resolves through its main checkout");

  // ---- 11. T1 integration: lenses from the policy front -------------------------------------------------
  newRepo("t1repo");
  sh("git", ["checkout", "-q", "-b", "feature"]);
  write("src/feature.ts", Array.from({ length: 30 }, (_, index) => `export const value${index} = ${index};\n`).join(""));
  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-q", "--no-verify", "-m", "feat: add feature"]);
  setPolicy(front("main", { "c-limited": claude("c-limited"), "c-ok": claude("c-ok"), "c2-ok": claude("c2-ok") }, { t1: [["c-limited", "c-ok"], ["c2-ok"]] }));
  const finding = { severity: "P2", lens: "CORRECTNESS", file: "src/feature.ts", line: 3, title: "t", why: "w", preexisting: true };
  reset({ "c-limited": "limit", answer: JSON.stringify({ findings: [finding] }) });
  const t0 = node("review-t0.mjs", ["-C", repo, "--no-checks"]);
  assert.equal(t0.status, 0, t0.output);
  const t1Json = join(workspace, "t1.json");
  const t1 = node("review-t1.mjs", ["-C", repo, "--json", t1Json]);
  assert.equal(t1.status, 0, t1.output);
  const report = JSON.parse(readFileSync(t1Json, "utf8"));
  assert.equal(report.front, "main");
  assert.deepEqual(report.reviewers.map((reviewer) => [reviewer.name, reviewer.status, reviewer.fallbacks.map((f) => `${f.provider}:${f.status}`)]), [["c-ok", "ok", ["c-limited:limit"]], ["c2-ok", "ok", []]]);
  assert.match(report.reviewers[0].fallbacks[0].until, /^\d{4}-/);
  assert.equal(report.costUsd, 0.025, "every attempt's cost is summed, the failed one included");
  assert.equal(report.reviewers[0].costUsd, 0.015, "a lens counts its failed attempts' cost");
  assert.equal(report.findings.length, 1, "both lenses found the same spot");
  assert.deepEqual([report.findings[0].preexisting, report.findings[0].reviewers], [true, ["c-ok", "c2-ok"]]);
  assert.equal(invoked("c-limited").length, 1);
  assert.ok(invoked("c-ok")[0].stdin.includes("<changed_files"), "the prompt carries the changed files");
  assert.deepEqual(invoked("c-ok")[0].argv.slice(0, 4), ["-p", "--output-format", "json", "--strict-mcp-config"]);
  assert.equal(callEvents().filter((call) => call.role === "t1").length, 3);
  const t1Decisions = join(workspace, "t1-decisions.json");
  writeFileSync(t1Decisions, JSON.stringify([{ spot: 1, decision: "irrelevant", reason: "old code" }]));
  const t1Triage = ledgerCli("triage", "--t1", t1Json, "--decisions", t1Decisions);
  assert.equal(t1Triage.status, 0, t1Triage.output);
  assert.match(t1Triage.stdout, /2 T1 finding decision\(s\) from 1 spot\(s\)/);
  assert.deepEqual(events().filter((event) => event.type === "triage").map((event) => [event.source, event.provider, event.preexisting]), [["t1", "c-ok", true], ["t1", "c2-ok", true]]);
  const t1Finding = JSON.parse(ledgerCli("findings", "--decision", "irrelevant", "--json").stdout);
  assert.deepEqual(t1Finding.map((item) => [item.source, item.provider]), [["t1", "c-ok"], ["t1", "c2-ok"]], "each lens's report stays, with its own severity and title");
  assert.ok(t1Finding[0].group && t1Finding[0].group === t1Finding[1].group, "lenses on the same spot share a group");
  writeFileSync(t1Decisions, JSON.stringify([{ spot: 9, decision: "fixed" }]));
  assert.equal(ledgerCli("triage", "--t1", t1Json, "--decisions", t1Decisions).status, 2, "an unknown spot is a usage error");
  assert.equal(ledgerCli("untriaged").status, 0, "a T1 triage of every spot covers every lens's call");
  // Two spots, both lenses on each, calls in the ledger: deciding one spot leaves both calls open.
  const lensCall = (provider) => ledgerCli("record", "--front", "main", "--role", "t1", "--provider", provider, "--status", "ok").stdout.match(/call (\w+) recorded/)[1];
  const lensCalls = report.reviewers.map((reviewer) => lensCall(reviewer.provider));
  const partialJson = join(workspace, "t1-partial.json");
  writeFileSync(partialJson, JSON.stringify({ ...report, findings: [...report.findings, { ...report.findings[0], line: 30 }], reviewers: report.reviewers.map((reviewer, index) => ({ ...reviewer, call: lensCalls[index] })) }));
  writeFileSync(t1Decisions, JSON.stringify([{ spot: 1, decision: "fixed" }]));
  const partial = ledgerCli("triage", "--t1", partialJson, "--decisions", t1Decisions);
  assert.match(partial.stdout, /1 spot\(s\) still have none/);
  const stillOpen = ledgerCli("untriaged");
  assert.equal(stillOpen.status, 1, "a partial T1 triage leaves its calls open");
  for (const call of lensCalls) assert.match(stillOpen.stdout, new RegExp(call));
  writeFileSync(t1Decisions, JSON.stringify([{ spot: 1, decision: "fixed" }, { spot: 2, decision: "wrong", reason: "dup" }]));
  assert.equal(ledgerCli("triage", "--t1", partialJson, "--decisions", t1Decisions).status, 0);
  assert.equal(ledgerCli("untriaged").status, 0, "every spot decided closes both calls");

  // ---- 12. prompt scan: gitleaks clears every prompt before any provider sees it -------------
  chain({ a: claude("m-ok"), b: cursor("cur-ok") }, ["a", "b"]);
  reset();
  const cleanPrompt = "REVIEW-PROMPT\n  password: credentials.password,\n";
  writeFileSync(promptFile, cleanPrompt);
  assert.equal(rr().status, 0);
  assert.equal(invoked("m-ok")[0].hash, createHash("sha256").update(cleanPrompt.trim()).digest("hex"), "the provider gets the hash of the prompt it was sent");
  const open = ledgerCli("untriaged");
  assert.equal(open.status, 1, open.output);
  assert.match(open.stdout, /1 answered call\(s\) without triage/);
  const reviewCall = callEvents()[0].call;
  assert.equal(ledgerCli("triage", "--call", reviewCall, "--decisions", "-").status, 2, "no decisions file content is a usage error");
  writeFileSync(join(workspace, "none.json"), "[]");
  assert.equal(ledgerCli("triage", "--call", reviewCall, "--decisions", join(workspace, "none.json")).status, 0);
  assert.equal(ledgerCli("untriaged").status, 0, "a review that found nothing is triaged with []");
  reset({ "m-ok": "hooked" });
  // Built at run time: a key literal in this file would trip the scanners that guard it.
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  writeFileSync(promptFile, `REVIEW-PROMPT\n${privateKey}`);
  const leaked = rr();
  assert.equal(leaked.status, 1, leaked.output);
  assert.match(leaked.output, /SECRET on gitleaks: gitleaks found 1 possible secret/);
  assert.doesNotMatch(leaked.output + JSON.stringify(events()), /MII[A-Za-z0-9+/]{20}/, "the value never reaches the output or the ledger");
  assert.equal(calls().length, 0, "no provider, not even a fallback, sees a prompt with a secret");
  assert.deepEqual(events().map((event) => [event.type, event.provider, event.status]), [["scan", "gitleaks", "secret"]]);
  // A `gitleaks:allow` comment inside the prompt must not clear its own secret.
  const token = "ghp_" + Array.from(randomBytes(36), (byte) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[byte % 62]).join("");
  reset();
  writeFileSync(promptFile, `REVIEW-PROMPT\nconst t = "${token}"; // gitleaks:allow\n`);
  const allowed = rr();
  assert.equal(allowed.status, 1, allowed.output);
  assert.match(allowed.output, /SECRET on gitleaks/);
  assert.ok(!allowed.output.includes(token) && !JSON.stringify(events()).includes(token), "the value never reaches the output or the ledger");
  assert.equal(calls().length, 0);
  reset();
  const blind = spawnSync(process.execPath, [join(scripts, "review-run.mjs"), "-C", repo, "--role", "review", "--author-model", "human", "--prompt", promptFile, "--out", outFile], { cwd: repo, encoding: "utf8", env: { ...env, AGENT_REVIEW_GITLEAKS: join(bin, "no-gitleaks") } });
  assert.equal(blind.status, 1);
  assert.match(blind.stdout, /gitleaks could not scan the prompt/);
  assert.equal(calls().length, 0, "without a scanner nothing is sent");
  writeFileSync(promptFile, "REVIEW-PROMPT\n");

  // ---- comments: a comment-heavy diff never reaches a reviewer, with or without T0 ----
  newRepo("comments");
  chain({ "codex-ok": codex("m-ok") }, ["codex-ok"]);
  sh("git", ["checkout", "-q", "-b", "feature"]);
  const commented = (count, plain) => Array.from({ length: count }, (_, index) => `// value ${index}\nexport const v${index} = ${index};\n`).join("") + Array.from({ length: plain }, (_, index) => `export const p${index} = ${index};\n`).join("");
  const commitAll = (message) => {
    sh("git", ["add", "-A"]);
    sh("git", ["commit", "-q", "--no-verify", "-m", message]);
  };
  write("src/a.ts", commented(12, 50));
  commitAll("documented");
  write("src/a.ts", commented(0, 62));
  reset({ "m-ok": "ok" });
  const heavy = rr();
  assert.equal(heavy.status, 1, heavy.output);
  assert.match(heavy.output, /COMMENTS 12 new comment lines in 74 added source lines \(16%.*over the 5% limit.*No reviewer runs/, "an uncommitted cleanup does not clear the committed diff the reviewer gets");
  assert.equal(calls().length, 0, "no provider sees a diff past the comment limit");
  write("src/a.ts", commented(12, 300));
  commitAll("more code");
  reset({ "m-ok": "ok" });
  const advised = rr(["--base", "main"]);
  assert.equal(advised.status, 0, advised.output);
  assert.match(calls()[0].stdin, /<comment_count>\nCOMMENTS 12 new comment lines in 324 added source lines \(4%/, "between 3% and 5% the reviewer gets the count");
  assert.deepEqual(callEvents()[0].comments, { lines: 12, sourceLines: 324 }, "the ledger keeps the count for calibration");
  // A delta without comments still cannot carry a full fallback past the limit.
  write("src/a.ts", commented(12, 50));
  commitAll("back to heavy");
  const head = sh("git", ["rev-parse", "HEAD"]).trim();
  write("src/b.ts", commented(0, 30));
  commitAll("delta");
  writeFileSync(join(workspace, "fresh.txt"), "FRESH\n");
  reset({ "m-ok": "ok" });
  const fallback = node("review-run.mjs", ["-C", repo, "--role", "review", "--prompt", promptFile, "--out", outFile, "--author-model", "human", "--base", head, "--resume", "nope", "--fresh-prompt", join(workspace, "fresh.txt"), "--full-base", "main"]);
  assert.equal(fallback.status, 1, fallback.output);
  assert.match(fallback.output, /over the 5% limit/, "the full range a fresh fallback would get is counted too");
  newRepo("comments-no-default");
  sh("git", ["branch", "-m", "trunk"]);
  reset({ "m-ok": "ok" });
  const baseless = rr();
  assert.equal(baseless.status, 2, baseless.output);
  assert.match(baseless.output, /pass --base so the comment count can run/);
  assert.equal(calls().length, 0, "without a base nothing is sent");

  console.log("PASS review-run contract");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
