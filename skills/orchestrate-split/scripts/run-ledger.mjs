#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const RUN_STATES = new Set([
  "DRAFT", "PLAN_PENDING_USER", "APPROVED", "EXECUTING", "INTEGRATING",
  "TESTING", "REPORTING", "AWAITING_REVIEW_DECISION", "BLOCKED",
  "COMPLETE", "CANCELLED",
]);
const NODE_STATES = new Set([
  "PROPOSED", "READY", "DISCUSSING", "RUNNING", "EVIDENCE_PENDING",
  "PASSED", "FAILED", "REOPENED", "BLOCKED", "INVALIDATED",
]);
const NODE_KINDS = new Set(["scout", "execute", "integrate", "test", "report"]);
const RUN_TRANSITIONS = {
  DRAFT: ["PLAN_PENDING_USER", "BLOCKED", "CANCELLED"],
  PLAN_PENDING_USER: ["DRAFT", "APPROVED", "BLOCKED", "CANCELLED"],
  APPROVED: ["EXECUTING", "BLOCKED", "CANCELLED"],
  EXECUTING: ["INTEGRATING", "TESTING", "REPORTING", "BLOCKED", "CANCELLED"],
  INTEGRATING: ["EXECUTING", "TESTING", "BLOCKED", "CANCELLED"],
  TESTING: ["EXECUTING", "INTEGRATING", "REPORTING", "BLOCKED", "CANCELLED"],
  REPORTING: ["AWAITING_REVIEW_DECISION", "BLOCKED", "CANCELLED"],
  AWAITING_REVIEW_DECISION: ["COMPLETE", "EXECUTING", "BLOCKED", "CANCELLED"],
  BLOCKED: [],
  COMPLETE: [],
  CANCELLED: [],
};
const NODE_TRANSITIONS = {
  PROPOSED: ["READY", "BLOCKED", "INVALIDATED"],
  READY: ["DISCUSSING", "RUNNING", "BLOCKED", "INVALIDATED"],
  DISCUSSING: ["READY", "RUNNING", "FAILED", "BLOCKED", "INVALIDATED"],
  RUNNING: ["EVIDENCE_PENDING", "FAILED", "BLOCKED", "INVALIDATED"],
  EVIDENCE_PENDING: ["PASSED", "RUNNING", "FAILED", "BLOCKED", "INVALIDATED"],
  PASSED: ["REOPENED", "INVALIDATED"],
  FAILED: ["REOPENED", "BLOCKED", "INVALIDATED"],
  REOPENED: ["DISCUSSING", "RUNNING", "BLOCKED", "INVALIDATED"],
  BLOCKED: [],
  INVALIDATED: [],
};

function fail(message) {
  process.stderr.write(`split-engineering: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) flags[key] = true;
    else {
      flags[key] = next;
      i += 1;
    }
  }
  return { positional, flags };
}

function now() {
  return new Date().toISOString();
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`cannot read JSON ${file}: ${error.message}`);
  }
}

function saveAtomic(file, value) {
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const temp = `${absolute}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, absolute);
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || value.trim() === "") errors.push(`${label} must be a non-empty string`);
}

function validateLedger(ledger) {
  const errors = [];
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) return ["ledger must be an object"];
  if (ledger.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  requireString(ledger.runId, "runId", errors);
  requireString(ledger.title, "title", errors);
  if (!RUN_STATES.has(ledger.state)) errors.push(`invalid run state: ${ledger.state}`);
  if (!Number.isInteger(ledger.graphVersion) || ledger.graphVersion < 1) errors.push("graphVersion must be a positive integer");
  if (!ledger.plan || typeof ledger.plan !== "object") errors.push("plan must be an object");
  else {
    if (typeof ledger.plan.objective !== "string") errors.push("plan.objective must be a string");
    if (!Array.isArray(ledger.plan.nonGoals)) errors.push("plan.nonGoals must be an array");
    if (!Array.isArray(ledger.plan.constraints)) errors.push("plan.constraints must be an array");
    if (!ledger.plan.authority || typeof ledger.plan.authority !== "object" || Array.isArray(ledger.plan.authority)) errors.push("plan.authority must be an object");
  }
  if (!Array.isArray(ledger.nodes)) errors.push("nodes must be an array");
  if (!Array.isArray(ledger.evidence)) errors.push("evidence must be an array");
  if (!Array.isArray(ledger.artifacts)) errors.push("artifacts must be an array");
  if (!Array.isArray(ledger.stateHistory)) errors.push("stateHistory must be an array");
  if (!Array.isArray(ledger.graphVersions) || ledger.graphVersions.length === 0) errors.push("graphVersions must contain at least one version");
  if (!ledger.report || typeof ledger.report !== "object") errors.push("report must be an object");
  if (errors.length || !Array.isArray(ledger.nodes)) return errors;

  const ids = new Set();
  for (const node of ledger.nodes) {
    requireString(node.id, "node.id", errors);
    requireString(node.title, `node ${node.id ?? "?"}.title`, errors);
    if (ids.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    ids.add(node.id);
    if (!NODE_KINDS.has(node.kind)) errors.push(`node ${node.id}: invalid kind ${node.kind}`);
    if (!NODE_STATES.has(node.state)) errors.push(`node ${node.id}: invalid state ${node.state}`);
    for (const key of ["dependencies", "ownership", "acceptanceCriteria", "receipts", "stateHistory"]) {
      if (!Array.isArray(node[key])) errors.push(`node ${node.id}: ${key} must be an array`);
    }
    if (!new Set(["low", "medium"]).has(node.reasoning)) errors.push(`node ${node.id}: reasoning must be low or medium`);
    if (!Number.isInteger(node.attempts) || node.attempts < 0) errors.push(`node ${node.id}: attempts must be a non-negative integer`);
    if (!Number.isInteger(node.maxAttempts) || node.maxAttempts < 1 || node.maxAttempts > 3) errors.push(`node ${node.id}: maxAttempts must be 1..3`);
    if (node.attempts > node.maxAttempts) errors.push(`node ${node.id}: attempts exceed maxAttempts`);
    if (node.state === "PASSED" && node.receipts.length === 0) errors.push(`node ${node.id}: PASSED requires a receipt`);
  }
  for (const node of ledger.nodes) {
    for (const dependency of node.dependencies ?? []) {
      if (!ids.has(dependency)) errors.push(`node ${node.id}: missing dependency ${dependency}`);
      if (dependency === node.id) errors.push(`node ${node.id}: self dependency`);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const byId = new Map(ledger.nodes.map((node) => [node.id, node]));
  function visit(id) {
    if (visiting.has(id)) {
      errors.push(`dependency cycle includes ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);

  const evidenceIds = new Set();
  for (const receipt of ledger.evidence) {
    requireString(receipt.id, "evidence.id", errors);
    if (evidenceIds.has(receipt.id)) errors.push(`duplicate evidence id: ${receipt.id}`);
    evidenceIds.add(receipt.id);
    requireString(receipt.nodeId, `evidence ${receipt.id ?? "?"}.nodeId`, errors);
    if (!ids.has(receipt.nodeId)) errors.push(`evidence ${receipt.id}: unknown node ${receipt.nodeId}`);
    for (const key of ["source", "environment", "procedure", "result"]) requireString(receipt[key], `evidence ${receipt.id ?? "?"}.${key}`, errors);
  }
  for (const node of ledger.nodes) {
    for (const receipt of node.receipts ?? []) if (!evidenceIds.has(receipt)) errors.push(`node ${node.id}: unknown receipt ${receipt}`);
  }
  const artifactIds = new Set();
  for (const artifact of ledger.artifacts) {
    requireString(artifact.id, "artifact.id", errors);
    if (artifactIds.has(artifact.id)) errors.push(`duplicate artifact id: ${artifact.id}`);
    artifactIds.add(artifact.id);
    if (!new Set(["image", "video", "log", "text"]).has(artifact.kind)) errors.push(`artifact ${artifact.id}: invalid kind ${artifact.kind}`);
    requireString(artifact.path, `artifact ${artifact.id ?? "?"}.path`, errors);
    if (artifact.nodeId && !ids.has(artifact.nodeId)) errors.push(`artifact ${artifact.id}: unknown node ${artifact.nodeId}`);
    if (artifact.redacted !== true) errors.push(`artifact ${artifact.id}: redacted must be true`);
  }
  return [...new Set(errors)];
}

function assertValid(ledger) {
  const errors = validateLedger(ledger);
  if (errors.length) fail(`ledger validation failed:\n- ${errors.join("\n- ")}`);
}

function recordHistory(target, from, to, flags) {
  target.stateHistory.push({
    from,
    to,
    at: now(),
    actor: String(flags.actor ?? "orchestrator"),
    reason: String(flags.reason ?? "state transition"),
    receipt: flags.receipt ? String(flags.receipt) : null,
  });
}

function allowedNext(current, next, transitions, resumeState) {
  if (current === "BLOCKED") return next === resumeState;
  return (transitions[current] ?? []).includes(next);
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const [command, ledgerPath, third, fourth] = positional;
if (!command) fail("usage: run-ledger.mjs <init|validate|set-plan|add-node|add-evidence|add-artifact|transition-run|transition-node|bump-graph> ...");

if (command === "init") {
  if (!ledgerPath) fail("init requires <ledger.json>");
  for (const key of ["run-id", "title", "run-dir", "report"]) if (!flags[key]) fail(`init requires --${key}`);
  if (fs.existsSync(ledgerPath)) fail(`refusing to overwrite existing ledger: ${ledgerPath}`);
  const timestamp = now();
  const ledger = {
    schemaVersion: 1,
    runId: String(flags["run-id"]),
    title: String(flags.title),
    createdAt: timestamp,
    updatedAt: timestamp,
    runDir: path.resolve(String(flags["run-dir"])),
    state: "DRAFT",
    resumeState: null,
    graphVersion: 1,
    plan: { objective: "", nonGoals: [], constraints: [], authority: {}, approval: null },
    nodes: [],
    evidence: [],
    artifacts: [],
    stateHistory: [],
    graphVersions: [{ version: 1, at: timestamp, status: "DRAFT", delta: "Initial graph", approval: null }],
    report: { path: path.resolve(String(flags.report)), lastRenderedAt: null },
    extensions: {},
  };
  assertValid(ledger);
  saveAtomic(ledgerPath, ledger);
  process.stdout.write(`${path.resolve(ledgerPath)}\n`);
  process.exit(0);
}

if (!ledgerPath) fail(`${command} requires <ledger.json>`);
const ledger = loadJson(ledgerPath);

if (command === "validate") {
  assertValid(ledger);
  process.stdout.write(`VALID ${ledger.runId} graph-v${ledger.graphVersion} ${ledger.state}\n`);
  process.exit(0);
}

if (command === "set-plan") {
  if (!third) fail("set-plan requires <plan.json>");
  const plan = loadJson(third);
  if (typeof plan.objective !== "string" || plan.objective.trim() === "") fail("plan.objective must be a non-empty string");
  ledger.plan = { ...plan, approval: plan.approval ?? null };
} else if (command === "add-node") {
  if (!third) fail("add-node requires <node.json>");
  const node = loadJson(third);
  if (ledger.nodes.some((item) => item.id === node.id)) fail(`node already exists: ${node.id}`);
  ledger.nodes.push({
    ...node,
    graphVersion: node.graphVersion ?? ledger.graphVersion,
    state: node.state ?? "PROPOSED",
    dependencies: node.dependencies ?? [],
    ownership: node.ownership ?? [],
    acceptanceCriteria: node.acceptanceCriteria ?? [],
    reasoning: node.reasoning ?? "medium",
    attempts: node.attempts ?? 0,
    maxAttempts: node.maxAttempts ?? 3,
    receipts: node.receipts ?? [],
    stateHistory: node.stateHistory ?? [],
    extensions: node.extensions ?? {},
  });
} else if (command === "add-evidence") {
  if (!third) fail("add-evidence requires <evidence.json>");
  const evidence = { ...loadJson(third), current: true, admittedAt: now() };
  if (ledger.evidence.some((item) => item.id === evidence.id)) fail(`evidence already exists: ${evidence.id}`);
  ledger.evidence.push(evidence);
  const node = ledger.nodes.find((item) => item.id === evidence.nodeId);
  if (!node) fail(`evidence references unknown node: ${evidence.nodeId}`);
  if (!node.receipts.includes(evidence.id)) node.receipts.push(evidence.id);
} else if (command === "add-artifact") {
  if (!third) fail("add-artifact requires <artifact.json>");
  const artifact = loadJson(third);
  if (ledger.artifacts.some((item) => item.id === artifact.id)) fail(`artifact already exists: ${artifact.id}`);
  ledger.artifacts.push(artifact);
} else if (command === "transition-run") {
  const next = third;
  if (!RUN_STATES.has(next)) fail(`invalid run state: ${next}`);
  if (!allowedNext(ledger.state, next, RUN_TRANSITIONS, ledger.resumeState)) fail(`invalid run transition ${ledger.state} -> ${next}`);
  if (next === "APPROVED") {
    if (!flags.approval) fail("APPROVED requires --approval");
    if (!ledger.plan.objective) fail("APPROVED requires a non-empty plan objective");
    ledger.plan.approval = { by: String(flags.approval), at: now(), graphVersion: ledger.graphVersion };
    ledger.graphVersions.find((item) => item.version === ledger.graphVersion).approval = ledger.plan.approval;
    ledger.graphVersions.find((item) => item.version === ledger.graphVersion).status = "APPROVED";
  }
  if (next === "REPORTING") {
    const incomplete = ledger.nodes.filter((node) => ["execute", "integrate", "test"].includes(node.kind) && node.state !== "PASSED" && node.state !== "INVALIDATED");
    if (incomplete.length) fail(`REPORTING blocked by nodes: ${incomplete.map((node) => node.id).join(", ")}`);
  }
  if (next === "AWAITING_REVIEW_DECISION" && !fs.existsSync(ledger.report.path)) fail(`report does not exist: ${ledger.report.path}`);
  const previous = ledger.state;
  if (next === "BLOCKED") ledger.resumeState = previous;
  if (previous === "BLOCKED") ledger.resumeState = null;
  ledger.state = next;
  recordHistory(ledger, previous, next, flags);
} else if (command === "transition-node") {
  const nodeId = third;
  const next = fourth;
  const node = ledger.nodes.find((item) => item.id === nodeId);
  if (!node) fail(`unknown node: ${nodeId}`);
  if (!NODE_STATES.has(next)) fail(`invalid node state: ${next}`);
  if (!allowedNext(node.state, next, NODE_TRANSITIONS, node.resumeState)) fail(`invalid node transition ${node.id}: ${node.state} -> ${next}`);
  if (next === "PASSED") {
    if (!flags.receipt || !node.receipts.includes(String(flags.receipt))) fail("PASSED requires --receipt already admitted to the node");
    const receipt = ledger.evidence.find((item) => item.id === String(flags.receipt));
    if (!receipt?.current) fail(`receipt is missing or stale: ${flags.receipt}`);
  }
  if (next === "RUNNING" && ["READY", "DISCUSSING", "REOPENED"].includes(node.state)) {
    if (node.attempts >= node.maxAttempts) fail(`node ${node.id} exhausted ${node.maxAttempts} attempts`);
    node.attempts += 1;
  }
  const previous = node.state;
  if (next === "BLOCKED") node.resumeState = previous;
  if (previous === "BLOCKED") node.resumeState = null;
  node.state = next;
  recordHistory(node, previous, next, flags);
  if (next === "INVALIDATED") {
    for (const receipt of ledger.evidence.filter((item) => item.nodeId === node.id)) receipt.current = false;
  }
} else if (command === "bump-graph") {
  if (!third) fail("bump-graph requires <delta.json>");
  const delta = loadJson(third);
  if (!Array.isArray(delta.affectedNodeIds)) fail("delta.affectedNodeIds must be an array");
  ledger.graphVersion += 1;
  ledger.plan.approval = null;
  ledger.graphVersions.push({ version: ledger.graphVersion, at: now(), status: "DRAFT", delta, approval: null });
  for (const nodeId of delta.affectedNodeIds) {
    const node = ledger.nodes.find((item) => item.id === nodeId);
    if (!node) fail(`delta references unknown node: ${nodeId}`);
    const previous = node.state;
    node.state = "INVALIDATED";
    recordHistory(node, previous, "INVALIDATED", { ...flags, reason: flags.reason ?? "material graph change" });
    for (const receipt of ledger.evidence.filter((item) => item.nodeId === node.id)) receipt.current = false;
  }
  const previous = ledger.state;
  ledger.state = "DRAFT";
  recordHistory(ledger, previous, "DRAFT", { ...flags, reason: flags.reason ?? "material graph change" });
} else {
  fail(`unknown command: ${command}`);
}

ledger.updatedAt = now();
assertValid(ledger);
saveAtomic(ledgerPath, ledger);
process.stdout.write(`UPDATED ${ledger.runId} graph-v${ledger.graphVersion} ${ledger.state}\n`);
