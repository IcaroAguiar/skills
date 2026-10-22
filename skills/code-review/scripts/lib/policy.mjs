// Which models may review a repository, in what order, and the fallback between
// them. The private policy file maps each front (an account boundary) to the
// providers it owns and, per role, the candidates to try. Every call goes through
// dispatch(), which skips providers that are cooling down, falls back only on
// capacity failures, and records each attempt in the ledger.
// Contract: ../../references/providers.md.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { appendEvent, cooldownKey, cooldowns, DEFAULT_COOLDOWN_MS, newId } from "./ledger.mjs";
import { callProvider, FALLBACK_STATUSES, KIND_ROLES, KINDS, ROLES, takesEffort } from "./providers.mjs";
import { PROMPT_HASH_ENV, promptHash, scanPrompt } from "./prompt-scan.mjs";
import { git } from "./repo.mjs";

export function policyPath() {
  return process.env.AGENT_REVIEW_POLICY || join(homedir(), ".config", "agent-review", "policy.json");
}

// Without a policy file, T1 keeps its historic default: Sonnet and Haiku on the
// caller's `claude`. The deep reviewer and the fixer need a real policy.
export function defaultPolicy(claude = process.env.REVIEW_T1_CLAUDE || "claude") {
  return {
    version: 1,
    builtin: true,
    fronts: [{
      // Named after the CLI, so two accounts' wrappers never share a cooldown.
      name: `default:${claude}`,
      match: { any: true },
      providers: {
        sonnet: { kind: "claude", bin: claude, model: "sonnet", effort: "medium" },
        haiku: { kind: "claude", bin: claude, model: "haiku" },
      },
      roles: { t1: [["sonnet"], ["haiku"]] },
    }],
  };
}

export function loadPolicy(path = policyPath()) {
  if (!existsSync(path)) return null;
  let policy;
  try {
    policy = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
  const problems = validatePolicy(policy);
  if (problems.length) throw new Error(`${path}:\n  ${problems.join("\n  ")}`);
  return policy;
}

export function validatePolicy(policy) {
  const problems = [];
  if (policy?.version !== 1 || !Array.isArray(policy.fronts) || !policy.fronts.length) return ["needs version 1 and a non-empty fronts list"];
  const names = new Set();
  for (const front of policy.fronts) {
    const where = `front ${front?.name ?? "?"}`;
    if (typeof front?.name !== "string" || names.has(front.name)) problems.push(`${where}: needs a unique name`);
    names.add(front?.name);
    // Removed rather than ignored: a policy that relied on it must see the change.
    if (front?.independence !== undefined) problems.push(`${where}: independence was removed; every front skips only the author's model, so delete the key`);
    const match = front?.match ?? {};
    if (!match.any && !match.paths?.length && !match.remotes?.length) problems.push(`${where}: match needs paths or remotes`);
    for (const [id, provider] of Object.entries(front?.providers ?? {})) {
      const at = `${where} provider ${id}`;
      if (!/^[\w.-]+$/.test(id)) problems.push(`${at}: id must be a word`);
      if (!KINDS.has(provider?.kind)) problems.push(`${at}: kind must be one of ${[...KINDS].join(", ")}`);
      else if (provider.kind === "command" ? typeof provider.command !== "string" : !isAbsolute(String(provider.bin ?? ""))) {
        // A bare `claude` or `codex` inherits whichever account the caller runs as.
        problems.push(`${at}: ${provider.kind === "command" ? "needs a command" : "bin must be an absolute path to the account's CLI or wrapper"}`);
      }
      // Independence compares models, so a command reviewer must say which one it runs.
      if (typeof provider?.model !== "string" && (provider?.kind !== "command" || (front?.roles?.review ?? []).flat().some((entry) => entry === id || entry?.split?.includes(id)))) problems.push(`${at}: needs a model`);
    }
    for (const [role, entries] of Object.entries(front?.roles ?? {})) {
      if (!ROLES.has(role)) {
        problems.push(`${where}: unknown role ${role}`);
        continue;
      }
      const slots = role === "t1" ? entries : [entries];
      if (!Array.isArray(slots) || !slots.every(Array.isArray)) {
        problems.push(`${where} role ${role}: ${role === "t1" ? "a list of lens slots, each a list of candidates" : "a list of candidates"}`);
        continue;
      }
      for (const entry of slots.flat()) {
        if (typeof entry !== "string" && !(Array.isArray(entry?.split) && entry.split.length >= 2)) problems.push(`${where} role ${role}: a split needs at least two provider ids`);
      }
      for (const id of slots.flat().flatMap((entry) => (typeof entry === "string" ? [entry] : Array.isArray(entry?.split) ? entry.split : []))) {
        const provider = front.providers?.[id];
        if (!provider) problems.push(`${where} role ${role}: unknown provider ${id}`);
        else if (!KIND_ROLES[provider.kind]?.includes(role)) problems.push(`${where} role ${role}: ${provider.kind} provider ${id} cannot take this role`);
      }
    }
  }
  return problems;
}

// The account boundary a repository belongs to. A path rule wins over remotes;
// remotes that point at two fronts (a fork of another account's code) stop here
// unless `choose` names one of them, because guessing would leak code across accounts.
export function resolveFront(policy, root, choose = null) {
  // A linked worktree (T3, review-eval) lives elsewhere; its main checkout's path counts too.
  const common = git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"], { allowFailure: true })?.trim();
  const checkouts = [safeRealpath(root), ...(common ? [safeRealpath(dirname(common))] : [])];
  const byPath = policy.fronts.filter((front) => (front.match?.paths ?? []).some((path) => checkouts.some((checkout) => within(checkout, safeRealpath(expandHome(path))))));
  const urls = remoteUrls(root);
  const byRemote = policy.fronts.filter((front) => (front.match?.remotes ?? []).some((pattern) => urls.some((url) => url.startsWith(normalizeRemote(pattern)))));
  const fallback = policy.fronts.filter((front) => front.match?.any);
  const matched = byPath.length ? byPath : byRemote.length ? byRemote : fallback;
  const names = [...new Set(matched.map((front) => front.name))];
  if (choose) {
    const chosen = matched.find((front) => front.name === choose);
    if (!chosen) throw new Error(`--front ${choose} does not match ${basename(root)} (matches: ${names.join(", ") || "none"})`);
    return chosen;
  }
  if (!names.length) throw new Error(`${basename(root)} matches no front in the review policy; add its path or remote to ${policyPath()}`);
  if (names.length > 1) throw new Error(`${basename(root)} matches several fronts (${names.join(", ")}); pass --front to choose the account that owns the code`);
  return matched[0];
}

function safeRealpath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

function expandHome(path) {
  return path === "~" ? homedir() : path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

function within(path, dir) {
  return path === dir || path.startsWith(dir.endsWith(sep) ? dir : dir + sep);
}

function remoteUrls(root) {
  const text = git(root, ["remote", "-v"], { allowFailure: true }) ?? "";
  return [...new Set(text.split("\n").map((line) => line.split(/\s+/)[1]).filter(Boolean).map(normalizeRemote))];
}

// git@github.com:Owner/repo.git, ssh://git@github.com/Owner/repo and
// https://user@github.com/Owner/repo all become github.com/owner/repo.
export function normalizeRemote(url) {
  return url.trim().toLowerCase()
    .replace(/^[a-z+]+:\/\//, "")
    .replace(/^[^@/]+@/, "")
    .replace(/^([^/:]+):(?!\d+\/)/, "$1/")
    .replace(/\.git$/, "");
}

// Claude aliases name a family (`sonnet`), full ids a version; both count as the
// same model for independence. Other ids compare exactly, without an effort
// suffix or Cursor's bracketed parameters (`gpt-5.6-sol[reasoning=high]`).
export function modelFamily(model) {
  const id = String(model ?? "").toLowerCase().replace(/\[[^\]]*\]$/, "").replace(/-(low|medium|high|xhigh|max)$/, "");
  const claude = /(?:^|claude-)(opus|sonnet|haiku|fable)\b/.exec(id);
  return claude ? `claude-${claude[1]}` : id;
}

// Ordered candidates for one slot. A split entry picks one arm per head (stable, so
// a rerun of the same head uses the same arm); the other arms follow as fallbacks.
export function candidates(front, role, { slot = 0, authorModel = null, headSha = "", cooled = new Map() } = {}) {
  const entries = role === "t1" ? front.roles?.t1?.[slot] ?? [] : front.roles?.[role] ?? [];
  const list = [];
  for (const entry of entries) {
    if (typeof entry === "string") list.push({ id: entry });
    else {
      const arms = entry.split;
      const pick = parseInt(createHash("sha256").update(`${headSha}:${role}:${slot}`).digest("hex").slice(0, 8), 16) % arms.length;
      const experiment = arms.join("|");
      list.push({ id: arms[pick], experiment, arm: arms[pick] }, ...arms.filter((_, index) => index !== pick).map((id) => ({ id, experiment, arm: id, fallbackArm: true })));
    }
  }
  const seen = new Set();
  return list.filter(({ id }) => !seen.has(id) && seen.add(id)).map((candidate) => {
    const provider = front.providers[candidate.id];
    const cool = cooled.get(cooldownKey(front.name, candidate.id));
    const same = authorModel && role !== "fix" && modelFamily(provider.model) === modelFamily(authorModel);
    const skip = same ? `same model as the author (${authorModel})`
      : cool ? `${cool.status} until ${cool.until}`
        : null;
    return { ...candidate, provider, skip };
  });
}

// Runs the first available candidate, falling back on limits, logins and transient
// failures (each transient one retried once first). `error` and `timeout` end the
// chain. Every attempt lands in the ledger. Returns the final attempt plus history.
//
// `resume` ({ call, provider, sessionId, prompt }) continues an earlier session: its
// provider goes first with resume.prompt. Sessions never cross providers, so any
// other candidate gets `prompt`, a self-contained fresh prompt; without one, only
// the resumed provider is tried.
//
// `unfit(provider, resuming)` returns a reason to skip a provider for this call
// (for example a prompt it cannot read whole), or null.
export async function dispatch({ front, role, slot = 0, prompt, root, effort = null, authorModel = null, headSha = "", timeoutMs, label = null, resume = null, unfit = () => null, onAttempt = () => {} }) {
  let list = candidates(front, role, { slot, authorModel, headSha, cooled: cooldowns() });
  if (resume) {
    // The session's provider must still be a candidate for this role and still
    // independent from the author; otherwise only a fresh reviewer may answer.
    const own = list.find((candidate) => candidate.id === resume.provider) ?? { id: resume.provider, provider: front.providers[resume.provider], skip: `no longer a ${role} candidate` };
    list = [own, ...(prompt ? list.filter((candidate) => candidate.id !== resume.provider) : [])];
  }
  list = list.map((candidate) => ({ ...candidate, skip: candidate.skip ?? unfit(candidate.provider, resume?.provider === candidate.id) }));
  const attempts = list.filter((candidate) => candidate.skip).map(({ id, skip }) => ({ provider: id, status: "skipped", reason: skip }));
  const meta = { front: front.name, role, repo: basename(root), head: headSha || null, slot: role === "t1" ? slot : undefined, label };
  // No provider sees a prompt gitleaks has not cleared; see lib/prompt-scan.mjs.
  for (const text of [prompt, resume?.prompt].filter(Boolean)) {
    const scan = await scanPrompt(text);
    if (scan.status === "clean") continue;
    const record = { type: "scan", call: newId(), ...meta, provider: "gitleaks", status: scan.status, error: scan.error };
    appendEvent(record);
    const entry = { ...record, text: "" };
    onAttempt(entry);
    return { final: entry, attempts: [...attempts, entry] };
  }
  for (const candidate of list.filter((entry) => !entry.skip)) {
    const resuming = resume?.provider === candidate.id;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const call = newId();
      const level = !takesEffort(candidate.provider.kind) ? null : role === "t1" ? candidate.provider.effort ?? null : effort ?? candidate.provider.effort ?? null;
      const sent = resuming ? resume.prompt : prompt;
      const env = { ...process.env, [PROMPT_HASH_ENV]: promptHash(sent) };
      const result = await callProvider(candidate.provider, { role, prompt: sent, root, effort: level, resume: resuming ? resume.sessionId : null, timeoutMs, env });
      const record = {
        type: "call", call, ...meta, provider: candidate.id, kind: candidate.provider.kind, model: candidate.provider.model ?? null,
        resolvedModel: result.resolvedModel ?? null, effort: level, experiment: candidate.experiment, arm: candidate.arm,
        status: result.status, until: result.status === "limit" || result.status === "auth" ? result.resetAt ?? new Date(Date.now() + DEFAULT_COOLDOWN_MS[result.status]).toISOString() : undefined,
        error: result.status === "ok" ? undefined : result.summary ?? result.status, durationMs: result.durationMs, turns: result.turns ?? null,
        toolCalls: result.toolCalls ?? null, costUsd: result.costUsd ?? null, usage: result.usage ?? null, sessionId: result.sessionId ?? null,
        resumeOf: resuming ? resume.call : undefined, fresh: resume && !resuming ? true : undefined, retry: attempt > 1 || undefined,
      };
      appendEvent(record);
      // The caller sees the CLI's words; the ledger above only the summary.
      const entry = { ...record, error: result.status === "ok" ? undefined : result.error, provider: candidate.id, text: result.text ?? "" };
      attempts.push(entry);
      onAttempt(entry);
      if (result.status === "transient" && attempt === 1) continue;
      if (result.status === "ok" || !FALLBACK_STATUSES.has(result.status)) return { final: entry, attempts };
      break;
    }
  }
  return { final: null, attempts };
}
