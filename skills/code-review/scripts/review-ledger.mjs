#!/usr/bin/env node
// review-ledger: record what happened to each finding, record calls made outside
// review-run (T3 delegation), and read the numbers back: cost, latency, cache use,
// limits and each reviewer's acted-on rate. Contract: ../references/providers.md.

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { appendEvent, cooldowns, DECISIONS, findCall, ledgerPath, newId, readEvents } from "./lib/ledger.mjs";
import { readJson } from "./lib/repo.mjs";

const USAGE = `usage: review-ledger triage --t1 <report> --decisions <file|->
       review-ledger triage --call <call-id> --decisions <file|->
       review-ledger record --front <name> --role <role> --provider <id> --status <status> [--model <m>]
                            [--effort <e>] [--repo <name>] [--head <sha>] [--duration <s>] [--until <iso>]
                            [--session <id>] [--label <text>] [--turns <n>] [--cost <usd>]
                            [--input <tokens>] [--output <tokens>] [--cache-read <tokens>] [--cache-write <tokens>]
       review-ledger stats [--since <days>] [--role <role>] [--json]
       review-ledger untriaged [--since <days>] [--repo <name>]
       review-ledger findings [--since <days>] [--front <name>] [--repo <name>] [--decision <list>] [--json]
       review-ledger limits
       review-ledger clear <provider-id> --front <name>

Decisions are a JSON array. For --t1, each item is
  {"spot": <1-based spot number in the report>, "decision": "...", "reason": "..."}
For --call (a deep review), each item is one finding:
  {"severity": "high", "title": "...", "file": "...", "line": 1, "decision": "...", "reason": "...", "preexisting": false}
decision is one of: ${[...DECISIONS].join(", ")}. Triage again to correct a decision:
the newest decision for the same finding replaces the earlier one in stats. A review
that found nothing is triaged too, with an empty array. untriaged lists the answered
T1 and review calls (default: last 14 days) nobody triaged yet, and exits 1 when there is one.
findings lists triaged findings (default: last 7 days, decision fixed; --decision takes a
comma list) with their newest decision, to find the ones that keep coming back.
Ledger: ${ledgerPath()}`;

function usage(message) {
  console.error(`review-ledger: ${message}\n\n${USAGE}`);
  process.exit(2);
}

function flags(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) usage(`unexpected ${arg}`);
    const key = arg.slice(2);
    if (key === "json") options.json = true;
    else {
      if (argv[index + 1] === undefined) usage(`${arg} needs a value`);
      options[key] = argv[++index];
    }
  }
  return options;
}

function readDecisions(source) {
  const text = source === "-" ? readFileSync(0, "utf8") : readFileSync(resolve(source), "utf8");
  const decisions = readJson(() => text);
  if (!Array.isArray(decisions)) usage("--decisions must be a JSON array");
  for (const item of decisions) {
    if (!DECISIONS.has(item?.decision)) usage(`decision must be one of ${[...DECISIONS].join(", ")}: ${JSON.stringify(item)}`);
    if (item.decision !== "fixed" && !String(item.reason ?? "").trim()) usage(`a ${item.decision} decision needs a reason: ${JSON.stringify(item)}`);
  }
  return decisions;
}

const SERIOUS = new Set(["P1", "P2", "critical", "high", "important"]);

// Each T1 spot credits every reviewer that reported it, so agreement is visible
// in the per-reviewer rates.
function triageT1(options) {
  const report = readJson(() => readFileSync(resolve(options.t1), "utf8"));
  if (report?.tool !== "review-t1") usage(`${options.t1} is not a review-t1 report`);
  const decisions = readDecisions(options.decisions);
  const reviewers = new Map(report.reviewers.map((reviewer) => [reviewer.name, reviewer]));
  // Every spot is checked before anything is written, so a bad file records nothing.
  const spots = decisions.map((item) => {
    const spot = Number.isInteger(item.spot) ? report.findings[item.spot - 1] : null;
    if (!spot) usage(`spot ${item.spot} is not in the report (it has ${report.findings.length})`);
    return spot;
  });
  // The lens calls count as triaged only once every spot has a decision.
  const open = report.findings.length - new Set(decisions.map((item) => item.spot)).size;
  if (!open) for (const reviewer of report.reviewers) if (reviewer.call) appendEvent({ type: "triaged", call: reviewer.call, repo: report.repo, findings: decisions.length });
  let count = 0;
  for (const [index, item] of decisions.entries()) {
    const spot = spots[index];
    for (const finding of spot.items) {
      const reviewer = reviewers.get(finding.reviewer) ?? {};
      appendEvent({
        type: "triage", source: "t1", front: report.front ?? null, repo: report.repo, head: report.head?.sha ?? null,
        call: reviewer.call ?? null, provider: reviewer.provider ?? finding.reviewer, model: reviewer.resolvedModel ?? reviewer.model ?? null,
        effort: reviewer.effort ?? null, arm: reviewer.arm, severity: finding.severity, serious: SERIOUS.has(finding.severity), lens: finding.lens,
        preexisting: Boolean(finding.preexisting), file: spot.file, line: finding.line ?? spot.line ?? null, title: finding.title, agreed: spot.reviewers.length,
        decision: item.decision, reason: item.reason ?? null, partial: open > 0 || undefined,
      });
      count += 1;
    }
  }
  console.log(`review-ledger: ${count} T1 finding decision(s) from ${decisions.length} spot(s) recorded${open ? `; ${open} spot(s) still have none, so untriaged keeps listing this report's calls` : ""}`);
}

function triageCall(options) {
  const call = findCall(options.call);
  if (!call) usage(`no call ${options.call} in the ledger`);
  const decisions = readDecisions(options.decisions);
  appendEvent({ type: "triaged", call: call.call, repo: call.repo, findings: decisions.length });
  for (const item of decisions) {
    const severity = String(item.severity ?? "").toLowerCase() || null;
    appendEvent({
      type: "triage", source: call.role, front: call.front, repo: call.repo, head: call.head, call: call.call, provider: call.provider,
      model: call.resolvedModel ?? call.model, effort: call.effort, severity, serious: SERIOUS.has(severity) || SERIOUS.has(item.severity),
      preexisting: Boolean(item.preexisting), file: item.file ?? null, line: Number.isInteger(item.line) ? item.line : null,
      title: String(item.title ?? "").slice(0, 200), decision: item.decision, reason: item.reason ?? null,
    });
  }
  console.log(`review-ledger: ${decisions.length} decision(s) recorded for call ${call.call} (${call.provider})`);
}

// For calls the scripts did not make, such as a T3 delegated review: its outcome,
// and a limit, feed the same cooldowns and statistics.
function record(options) {
  for (const key of ["front", "role", "provider", "status"]) if (!options[key]) usage(`record needs --${key}`);
  if (!["ok", "limit", "auth", "transient", "empty", "timeout", "error"].includes(options.status)) usage("--status must be ok, limit, auth, transient, empty, timeout or error");
  if (options.until !== undefined && !Number.isFinite(Date.parse(options.until))) usage("--until must be a date and time, such as 2026-10-21T15:00:00Z");
  for (const key of ["duration", "turns", "cost", "input", "output", "cache-read", "cache-write"]) {
    if (options[key] !== undefined && !(Number(options[key]) >= 0)) usage(`--${key} must be a non-negative number`);
  }
  const number = (key) => (options[key] === undefined ? null : Number(options[key]));
  const tokens = ["input", "output", "cache-read", "cache-write"].some((key) => options[key] !== undefined)
    ? { input: number("input") ?? 0, output: number("output") ?? 0, cacheRead: number("cache-read") ?? 0, cacheWrite: number("cache-write") ?? 0, reasoning: 0 }
    : null;
  const call = newId();
  appendEvent({
    type: "call", call, source: "manual", role: options.role, provider: options.provider, front: options.front ?? null, repo: options.repo ?? basename(process.cwd()),
    head: options.head ?? null, model: options.model ?? null, effort: options.effort ?? null, status: options.status,
    until: options.until === undefined ? undefined : new Date(Date.parse(options.until)).toISOString(),
    durationMs: options.duration ? Number(options.duration) * 1000 : null, sessionId: options.session ?? null, label: options.label ?? null,
    turns: number("turns"), costUsd: number("cost"), usage: tokens,
  });
  console.log(`review-ledger: call ${call} recorded`);
}

// Answered calls whose findings nobody decided: they count in no acted-on rate.
function untriaged(options) {
  const days = Number(options.since ?? 14);
  if (!(days > 0)) usage("--since must be a positive number of days");
  const events = readEvents({ since: Date.now() - days * 86_400_000 });
  // A partial T1 triage does not count; triage events from before the triaged marker do.
  const done = new Set(events.filter((event) => event.type === "triaged" || (event.type === "triage" && !event.partial)).map((event) => event.call));
  const open = events.filter((event) => event.type === "call" && event.status === "ok" && ["t1", "review"].includes(event.role) && !done.has(event.call) && (!options.repo || event.repo === options.repo));
  for (const event of open) console.log(`${event.call}  ${String(event.ts ?? "").slice(0, 16)}  ${event.repo ?? "-"}  ${event.role}  ${event.provider}${event.label ? `  ${event.label}` : ""}`);
  console.log(`review-ledger: ${open.length} answered call(s) without triage${open.length ? "; triage each with --call (or the T1 report with --t1), [] when it found nothing" : ""}`);
  if (open.length) process.exitCode = 1;
}

const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};

// A finding triaged twice counts once, with its newest decision.
function latestTriage(events) {
  const latest = new Map();
  for (const event of events) if (event.type === "triage") latest.set([event.call ?? event.provider, event.file, event.line, event.title].join("\u0000"), event);
  return [...latest.values()];
}

// The raw material for turning a repeated finding into a local check (references/patterns.md).
function findings(options) {
  const days = Number(options.since ?? 7);
  if (!(days > 0)) usage("--since must be a positive number of days");
  const wanted = new Set(String(options.decision ?? "fixed").split(","));
  for (const decision of wanted) if (!DECISIONS.has(decision)) usage(`--decision takes ${[...DECISIONS].join(", ")}`);
  const rows = latestTriage(readEvents({ since: Date.now() - days * 86_400_000 }))
    .filter((event) => wanted.has(event.decision) && (!options.front || event.front === options.front) && (!options.repo || event.repo === options.repo))
    .map((event) => ({ ts: event.ts, front: event.front ?? null, repo: event.repo ?? null, severity: event.severity ?? null, decision: event.decision, file: event.file ?? null, line: event.line ?? null, title: event.title ?? null, reason: event.reason ?? null }));
  if (options.json) return console.log(JSON.stringify(rows, null, 2));
  for (const row of rows) console.log([String(row.ts ?? "").slice(0, 10), row.front ?? "-", row.repo ?? "-", row.severity ?? "-", row.decision, row.file ? `${row.file}${row.line ? `:${row.line}` : ""}` : "-", row.title ?? "-"].join("  "));
  console.log(`review-ledger: ${rows.length} finding(s)`);
}

function stats(options) {
  const days = Number(options.since ?? 30);
  if (!(days > 0)) usage("--since must be a positive number of days");
  const all = readEvents({ since: Date.now() - days * 86_400_000 });
  const kept = new Set(latestTriage(all));
  const events = all.filter((event) => event.type !== "triage" || kept.has(event));
  const key = (event) => [event.role ?? event.source, event.provider, event.resolvedModel ?? event.model ?? "?", event.effort ?? "-", event.arm ? "A/B" : ""].join("\u0000");
  const rows = new Map();
  const row = (event) => {
    const id = key(event);
    if (!rows.has(id)) rows.set(id, { role: event.role ?? event.source, provider: event.provider, model: event.resolvedModel ?? event.model ?? "?", effort: event.effort ?? "-", ab: Boolean(event.arm), calls: 0, ok: 0, limit: 0, failed: 0, durations: [], turns: [], cost: 0, costCalls: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, triaged: 0, fixed: 0, wrong: 0, seriousFixed: 0 });
    return rows.get(id);
  };
  const calls = new Map(events.filter((event) => event.type === "call").map((event) => [event.call, event]));
  for (const event of events) {
    if (options.role && (event.role ?? event.source) !== options.role) continue;
    if (event.type === "call") {
      const r = row(event);
      r.calls += 1;
      if (event.status === "ok") {
        r.ok += 1;
        if (Number.isFinite(event.durationMs)) r.durations.push(event.durationMs);
        if (Number.isFinite(event.turns)) r.turns.push(event.turns);
      } else if (event.status === "limit" || event.status === "auth") r.limit += 1;
      else r.failed += 1;
      if (Number.isFinite(event.costUsd)) {
        r.cost += event.costUsd;
        r.costCalls += 1;
      }
      for (const field of ["input", "cacheRead", "cacheWrite", "output"]) r[field] += event.usage?.[field] ?? 0;
    } else if (event.type === "triage") {
      // Attribute to the call's row, so a decision lands where its reviewer's cost is.
      const r = row({ ...(calls.get(event.call) ?? {}), ...event, role: calls.get(event.call)?.role ?? event.source });
      r.triaged += 1;
      if (event.decision === "fixed") r.fixed += 1;
      if (event.decision === "wrong") r.wrong += 1;
      if (event.decision === "fixed" && event.serious && !event.preexisting) r.seriousFixed += 1;
    }
  }
  const table = [...rows.values()].map((r) => {
    const prompt = r.input + r.cacheRead + r.cacheWrite;
    return {
      role: r.role, provider: r.provider, model: r.model, effort: r.effort + (r.ab ? " (A/B)" : ""), calls: r.calls, ok: r.ok, limited: r.limit, failed: r.failed,
      p50: percentile(r.durations, 0.5), p90: percentile(r.durations, 0.9), turnsP50: percentile(r.turns, 0.5),
      costPerOk: r.costCalls && r.ok ? r.cost / r.ok : null, cacheRead: prompt ? r.cacheRead / prompt : null,
      triaged: r.triaged, actedOn: r.triaged ? r.fixed / r.triaged : null, wrong: r.triaged ? r.wrong / r.triaged : null,
      seriousFixedPerReview: r.ok ? r.seriousFixed / r.ok : null,
    };
  }).sort((a, b) => a.role.localeCompare(b.role) || b.calls - a.calls);
  if (options.json) return console.log(JSON.stringify({ sinceDays: days, rows: table }, null, 2));
  const pct = (value) => (value === null ? "-" : `${Math.round(value * 100)}%`);
  const secs = (ms) => (ms === null ? "-" : `${Math.round(ms / 1000)}s`);
  const head = ["role", "provider", "model", "effort", "calls", "ok", "limited", "p50", "p90", "turns", "$/review", "cache", "triaged", "acted-on", "wrong", "serious fixed/review"];
  const lines = table.map((r) => [r.role, r.provider, r.model, r.effort, r.calls, r.ok, r.limited, secs(r.p50), secs(r.p90), r.turnsP50 ?? "-", r.costPerOk === null ? "-" : `$${r.costPerOk.toFixed(2)}`, pct(r.cacheRead), r.triaged, pct(r.actedOn), pct(r.wrong), r.seriousFixedPerReview === null ? "-" : r.seriousFixedPerReview.toFixed(2)].map(String));
  const widths = head.map((title, index) => Math.max(title.length, ...lines.map((line) => line[index].length)));
  console.log(`review-ledger stats, last ${days} day(s)`);
  for (const line of [head, ...lines]) console.log(line.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd());
  if (!lines.length) console.log("(no events)");
}

function limits() {
  const active = cooldowns();
  if (!active.size) return console.log("review-ledger: no provider is cooling down");
  for (const [key, { until, status, error }] of active) console.log(`${key}  ${status} until ${until}${error ? `  ${error.split("\n").at(-1).slice(0, 120)}` : ""}`);
}

const [command, ...rest] = process.argv.slice(2);
if (!command || command === "-h" || command === "--help") {
  console.log(USAGE);
  process.exit(command ? 0 : 2);
}
if (command === "clear") {
  const options = flags(rest.slice(1));
  if (!rest[0] || rest[0].startsWith("--") || !options.front) usage("clear needs a provider id and --front");
  appendEvent({ type: "clear", front: options.front, provider: rest[0] });
  console.log(`review-ledger: ${options.front}/${rest[0]} is available again`);
} else {
  const options = flags(rest);
  if (command === "triage") {
    if (!options.decisions || Boolean(options.t1) === Boolean(options.call)) usage("triage needs --decisions and one of --t1 or --call");
    if (options.t1) triageT1(options);
    else triageCall(options);
  } else if (command === "record") record(options);
  else if (command === "stats") stats(options);
  else if (command === "untriaged") untriaged(options);
  else if (command === "findings") findings(options);
  else if (command === "limits") limits();
  else usage(`unknown command ${command}`);
}
