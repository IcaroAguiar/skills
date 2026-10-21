// The review ledger: one private JSONL file of model calls and triage decisions,
// shared by every account, harness and model on this machine. Calls give cost,
// latency and cooldowns; triage gives each reviewer's acted-on rate. It stores
// metadata only (paths, titles, counts), never diff contents or prompts.

import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

// A limit without a stated reset keeps the provider out for this long; a failed
// login for less, because the user may log in again at any moment.
export const DEFAULT_COOLDOWN_MS = { limit: 30 * 60_000, auth: 10 * 60_000 };
// Anthropic's four outcomes for a review comment, plus a deferral.
export const DECISIONS = new Set(["fixed", "wrong", "intentional", "irrelevant", "deferred"]);

export function stateDir() {
  return process.env.AGENT_REVIEW_STATE || join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "agent-review");
}

export function ledgerPath() {
  return join(stateDir(), "ledger.jsonl");
}

export function newId() {
  return randomBytes(6).toString("hex");
}

// One appended line per event. O_APPEND keeps concurrent writers from interleaving
// within a line for lines of this size on local disks.
export function appendEvent(event) {
  const dir = stateDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = ledgerPath();
  const fresh = !existsSync(path);
  appendFileSync(path, `${JSON.stringify({ v: 1, ts: new Date().toISOString(), ...event })}\n`, { mode: 0o600 });
  if (fresh) chmodSync(path, 0o600);
}

export function readEvents({ since = null } = {}) {
  let text = "";
  try {
    text = readFileSync(ledgerPath(), "utf8");
  } catch (error) {
    // No ledger yet is an empty history; anything else (permissions) must surface.
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const events = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      const event = JSON.parse(line);
      if (!since || Date.parse(event.ts) >= since) events.push(event);
    } catch {
      // A torn last line from a crashed writer is skipped, not fatal.
    }
  }
  return events;
}

// Provider ids are only unique inside a front, so a cooldown belongs to both.
export const cooldownKey = (front, provider) => `${front ?? ""}/${provider}`;

// cooldownKey -> { until, status, error } for every provider still cooling down.
// The newest call per provider decides: a success after a limit clears it, and a
// manual `clear` event does too.
export function cooldowns(events = readEvents({ since: Date.now() - 7 * 86_400_000 }), now = Date.now()) {
  const latest = new Map();
  for (const event of events) {
    if ((event.type === "call" || event.type === "clear") && event.provider) latest.set(cooldownKey(event.front, event.provider), event);
  }
  const active = new Map();
  for (const [provider, event] of latest) {
    if (event.type !== "call" || !DEFAULT_COOLDOWN_MS[event.status]) continue;
    const until = event.until ? Date.parse(event.until) : Date.parse(event.ts) + DEFAULT_COOLDOWN_MS[event.status];
    if (until > now) active.set(provider, { until: new Date(until).toISOString(), status: event.status, error: event.error ?? null });
  }
  return active;
}

export function findCall(callId, events = readEvents()) {
  return events.find((event) => event.type === "call" && event.call === callId) ?? null;
}
