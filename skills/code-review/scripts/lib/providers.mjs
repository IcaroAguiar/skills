// Model CLIs behind one interface. A provider is one model on one account's CLI;
// callProvider builds its command for a role, runs it and reads back the answer,
// the session, the usage and, on failure, whether another provider may take over.
// Contract: ../../references/providers.md.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readJson, run, tail } from "./repo.mjs";

export const KINDS = new Set(["claude", "codex", "agy", "command"]);
export const ROLES = new Set(["t1", "review", "fix"]);
// agy cannot read files headless (every command is denied), so it only reviews
// what the prompt carries; a command provider's access is whatever it has.
export const KIND_ROLES = { claude: ["t1", "review", "fix"], codex: ["t1", "review", "fix"], agy: ["t1"], command: ["t1", "review"] };

// Read-only for every reviewer: file tools only, no MCP servers, every permission
// prompt denied. No shell, not even git: prefix rules cannot stop `git diff
// --output=<file>`, so review-run puts the diff in the prompt instead.
const CLAUDE_BASE = ["-p", "--output-format", "json", "--strict-mcp-config"];
const CLAUDE_ROLE = {
  t1: ["--tools", "Read,Grep,Glob", "--permission-mode", "dontAsk", "--no-session-persistence"],
  review: ["--tools", "Read,Grep,Glob", "--permission-mode", "dontAsk"],
  fix: ["--permission-mode", "acceptEdits"],
};
// The argv carries agy's prompt (it does not read stdin); stay well under ARG_MAX.
const MAX_ARGV_PROMPT = 700 * 1024;

// Only a failed call is classified, so a review that discusses rate limits is not one.
const LIMIT = /usage[ _-]?limit|rate[ _-]?limit|quota|too many requests|\b429\b|hit your (usage )?limit|limit reached|out of (credits|usage)|insufficient[_ ]quota|resource[_ ]exhausted|credit balance/i;
const AUTH = /not logged in|unauthori[sz]ed|\b40[13]\b|invalid (api key|x-api-key)|authentication (failed|error)|please (run )?\/?login|token (has )?expired|re-?authenticate/i;
const TRANSIENT = /overloaded|\b5(0[0-4]|29)\b|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|stream (disconnected|error)|temporarily unavailable|internal server error/i;

// Statuses that let the next candidate run: the provider could not serve the call.
// `error` and `timeout` stop the chain: the next account would most likely fail the
// same way, and a slow reviewer is not a capacity problem.
export const FALLBACK_STATUSES = new Set(["limit", "auth", "transient"]);

export function commandFor(provider, { role, root, effort, resume, outFile, timeoutMs }) {
  const level = effort ?? provider.effort ?? null;
  if (provider.kind === "claude") {
    const args = [...CLAUDE_BASE, ...CLAUDE_ROLE[role], "--model", provider.model, ...(level ? ["--effort", level] : [])];
    if (role === "fix" && provider.allowedTools?.length) args.push("--allowedTools", ...provider.allowedTools);
    if (resume) args.push("--resume", resume);
    return { command: provider.bin, args, stdin: true };
  }
  if (provider.kind === "codex") {
    const sandbox = role === "fix" ? "workspace-write" : "read-only";
    const config = [...(level ? ["-c", `model_reasoning_effort=${level}`] : [])];
    if (role === "fix" && provider.writableRoots?.length) config.push("-c", `sandbox_workspace_write.writable_roots=${JSON.stringify(provider.writableRoots)}`);
    // `exec resume` takes no -s or -C: the sandbox goes through -c, the cwd is the repository.
    const args = resume
      ? ["exec", "resume", resume, "--json", "--skip-git-repo-check", "-m", provider.model, ...config, "-c", `sandbox_mode="${sandbox}"`, "-o", outFile, "-"]
      : ["exec", "--json", "--skip-git-repo-check", "-m", provider.model, ...config, "-s", sandbox, "-C", root, ...(role === "t1" ? ["--ephemeral"] : []), "-o", outFile, "-"];
    return { command: provider.bin, args, stdin: true };
  }
  if (provider.kind === "agy") {
    const args = ["--print-timeout", `${Math.ceil(timeoutMs / 1000)}s`, "--output-format", "json", "--model", provider.model, "--sandbox", "--disable-slash-commands", ...(level ? ["--effort", level] : [])];
    return { command: provider.bin, args, stdin: false, promptFlag: "-p" };
  }
  return { command: "sh", args: ["-c", provider.command], stdin: true };
}

// Runs one call. Never throws for a provider failure: the status says what happened.
export async function callProvider(provider, { role, prompt, root, effort = null, resume = null, timeoutMs = 420_000 }) {
  const scratch = mkdtempSync(join(tmpdir(), "review-call-"));
  const outFile = join(scratch, "last-message.md");
  try {
    const { command, args, stdin, promptFlag } = commandFor(provider, { role, root, effort, resume, outFile, timeoutMs });
    if (promptFlag && Buffer.byteLength(prompt) > MAX_ARGV_PROMPT) return { status: "error", error: `prompt over ${MAX_ARGV_PROMPT / 1024} KB for ${provider.kind}`, durationMs: 0 };
    const result = await run(command, promptFlag ? [...args, promptFlag, prompt] : args, { cwd: root, input: stdin ? prompt : undefined, timeoutMs });
    const parsed = { durationMs: result.durationMs, ...parse(provider.kind, result, outFile) };
    if (result.timedOut) return { ...parsed, status: "timeout", text: "" };
    return parsed;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function parse(kind, result, outFile) {
  if (kind === "claude") return parseClaude(result);
  if (kind === "codex") return parseCodex(result, outFile);
  if (kind === "agy") return parseAgy(result);
  // A command's output may echo the prompt or the code, so only its exit code is kept.
  return result.code === 0 && result.stdout.trim()
    ? { status: "ok", text: result.stdout }
    : { ...failure("", result.code), error: `exit ${result.code}${result.stdout.trim() ? "" : ", no answer"}` };
}

function parseClaude(result) {
  const envelope = readJson(() => result.stdout);
  if (!envelope) return failure(result.output, result.code);
  const usage = envelope.usage ?? {};
  const info = {
    sessionId: envelope.session_id ?? null,
    // Claude Code also calls a small model for housekeeping; the reviewer is the one that cost most.
    resolvedModel: Object.entries(envelope.modelUsage ?? {}).sort(([, a], [, b]) => (b?.costUSD ?? 0) - (a?.costUSD ?? 0))[0]?.[0] ?? null,
    turns: envelope.num_turns ?? null,
    costUsd: typeof envelope.total_cost_usd === "number" ? envelope.total_cost_usd : null,
    usage: tokens(usage.input_tokens, usage.output_tokens, usage.cache_read_input_tokens, usage.cache_creation_input_tokens),
  };
  if (envelope.is_error || result.code !== 0 || typeof envelope.result !== "string" || !envelope.result.trim()) {
    const status = envelope.api_error_status;
    const text = `${status ?? ""} ${envelope.result ?? ""} ${tail(result.output, 20)}`;
    return { ...info, ...failure(text, result.code, status) };
  }
  return { ...info, status: "ok", text: envelope.result };
}

// `codex exec --json` prints JSONL events; the final answer goes to the -o file.
function parseCodex(result, outFile) {
  const info = { sessionId: null, turns: 0, toolCalls: 0, usage: null };
  const errors = [];
  for (const line of result.stdout.split("\n")) {
    const event = line.startsWith("{") ? readJson(() => line) : null;
    if (!event) continue;
    if (event.type === "thread.started") info.sessionId = event.thread_id ?? null;
    else if (event.type === "turn.completed") {
      info.turns += 1;
      const u = event.usage ?? {};
      // OpenAI counts cached tokens inside input_tokens; the ledger keeps them apart, as Claude does.
      info.usage = addTokens(info.usage, tokens((u.input_tokens ?? 0) - (u.cached_input_tokens ?? 0), u.output_tokens, u.cached_input_tokens, u.cache_write_input_tokens, u.reasoning_output_tokens));
    } else if (event.type === "item.completed" && event.item && !["agent_message", "reasoning", "error"].includes(event.item.type)) info.toolCalls += 1;
    else if (event.type === "turn.failed" || event.type === "error") errors.push(event.error?.message ?? event.message ?? "");
  }
  let text = "";
  try {
    text = readFileSync(outFile, "utf8");
  } catch {
    // No last message: the run failed before answering.
  }
  // Only the CLI's own error events and non-JSON (stderr) lines: the JSONL stream
  // carries the model's messages and command output, which must not reach the ledger.
  const stderr = result.output.split("\n").filter((line) => line.trim() && !line.startsWith("{")).join("\n");
  if (result.code !== 0 || errors.length || !text.trim()) return { ...info, ...failure(`${errors.join("\n")}\n${tail(stderr, 10)}`, result.code) };
  return { ...info, status: "ok", text };
}

function parseAgy(result) {
  const envelope = readJson(() => result.stdout);
  if (!envelope) return failure(result.output, result.code);
  const usage = envelope.usage ?? {};
  const info = { sessionId: envelope.conversation_id ?? null, turns: envelope.num_turns ?? null, usage: tokens(usage.input_tokens, usage.output_tokens, usage.cache_read_tokens, 0, usage.thinking_tokens) };
  if (envelope.status !== "SUCCESS" || typeof envelope.response !== "string" || !envelope.response.trim()) {
    return { ...info, ...failure(`${envelope.status ?? ""} ${tail(result.output, 20)}`, result.code) };
  }
  return { ...info, status: "ok", text: envelope.response };
}

function tokens(input, output, cacheRead, cacheWrite, reasoning) {
  const value = (n) => (Number.isFinite(n) ? n : 0);
  return { input: value(input), output: value(output), cacheRead: value(cacheRead), cacheWrite: value(cacheWrite), reasoning: value(reasoning) };
}

function addTokens(a, b) {
  if (!a) return b;
  return Object.fromEntries(Object.keys(b).map((key) => [key, a[key] + b[key]]));
}

export function failure(text, code, httpStatus = null) {
  const error = tail(String(text ?? "").trim(), 5) || `exit ${code}`;
  const status = httpStatus === 429 || LIMIT.test(text) ? "limit"
    : httpStatus === 401 || httpStatus === 403 || AUTH.test(text) ? "auth"
      : (httpStatus ?? 0) >= 500 || TRANSIENT.test(text) ? "transient"
        : "error";
  return { status, error, resetAt: status === "limit" ? resetTime(text) : null };
}

// When the CLI says when the limit resets: an epoch (`limit reached|1767225600`),
// an ISO time, or "in N minutes/hours". Otherwise the caller applies a default.
export function resetTime(text, now = Date.now()) {
  const epoch = /\|(\d{10})\b/.exec(text) ?? /reset[s_ a-z]*["':= ]+(\d{10})\b/i.exec(text);
  if (epoch) return new Date(Number(epoch[1]) * 1000).toISOString();
  const iso = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2}))/.exec(text);
  if (iso && Date.parse(iso[1]) > now) return new Date(Date.parse(iso[1])).toISOString();
  const relative = /\bin (\d+) ?(minutes?|mins?|hours?|hrs?|h|m)\b/i.exec(text);
  if (relative) return new Date(now + Number(relative[1]) * (/^h/i.test(relative[2]) ? 3_600_000 : 60_000)).toISOString();
  return null;
}
