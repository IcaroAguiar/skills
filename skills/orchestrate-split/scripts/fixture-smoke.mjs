#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ledgerCli = path.join(here, "run-ledger.mjs");
const reportDir = path.resolve(here, "../../split-report/scripts");
const renderer = path.join(reportDir, "render-report.mjs");
const cleaner = path.join(reportDir, "cleanup-run.mjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "split-engineering-fixture-"));

function run(script, args, expected = 0) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  assert.equal(result.status, expected, `command failed (${result.status}): node ${path.basename(script)} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function transitionNode(ledger, id, states) {
  for (const state of states) run(ledgerCli, ["transition-node", ledger, id, state, "--actor", "fixture", "--reason", `fixture ${state}`]);
}

try {
  const runId = "fixture-happy";
  const runDir = path.join(root, runId);
  const ledger = path.join(runDir, "run.json");
  const report = path.join(root, "reports", `${runId}.html`);
  run(ledgerCli, ["init", ledger, "--run-id", runId, "--title", "Checkout behavior fixture", "--run-dir", runDir, "--report", report]);

  const plan = writeJson(path.join(root, "plan.json"), {
    objective: "Prove an integrated checkout behavior with independent verification.",
    nonGoals: ["Production deployment"],
    constraints: ["No network", "No push or merge"],
    authority: { localEdits: true, localCommits: true, push: false, merge: false },
    approval: null,
  });
  run(ledgerCli, ["set-plan", ledger, plan]);

  const nodes = [
    { id: "exec-api", title: "Implement checkout contract", kind: "execute", dependencies: [], ownership: ["api/checkout"], acceptanceCriteria: ["Valid checkout returns an order"], reasoning: "medium" },
    { id: "exec-ui", title: "Implement checkout journey", kind: "execute", dependencies: [], ownership: ["web/checkout"], acceptanceCriteria: ["User can submit checkout"], reasoning: "medium" },
    { id: "integrate-checkout", title: "Integrate checkout milestone", kind: "integrate", dependencies: ["exec-api", "exec-ui"], ownership: ["integration branch"], acceptanceCriteria: ["API and UI run together"], reasoning: "medium" },
    { id: "test-checkout", title: "Verify real checkout behavior", kind: "test", dependencies: ["integrate-checkout"], ownership: ["browser and API verification"], acceptanceCriteria: ["Critical journey passes with materialized proof"], reasoning: "medium" },
  ];
  for (const node of nodes) {
    const file = writeJson(path.join(root, `${node.id}.json`), node);
    run(ledgerCli, ["add-node", ledger, file]);
  }

  run(ledgerCli, ["transition-run", ledger, "PLAN_PENDING_USER", "--actor", "fixture", "--reason", "plan ready"]);
  const premature = run(ledgerCli, ["transition-run", ledger, "APPROVED", "--actor", "fixture", "--reason", "missing approval"], 1);
  assert.match(premature.stderr, /requires --approval/);
  run(ledgerCli, ["transition-run", ledger, "APPROVED", "--actor", "fixture", "--reason", "approved plan", "--approval", "fixture-user"]);
  run(ledgerCli, ["transition-run", ledger, "EXECUTING", "--actor", "fixture", "--reason", "begin execution"]);

  for (const id of ["exec-api", "exec-ui"]) {
    transitionNode(ledger, id, ["READY", "DISCUSSING", "RUNNING", "EVIDENCE_PENDING"]);
    const evidence = writeJson(path.join(root, `${id}-evidence.json`), {
      id: `${id}-receipt`, nodeId: id, source: `${id}-sha`, environment: "isolated fixture", procedure: "focused behavior check", result: "PASS", artifacts: [],
    });
    run(ledgerCli, ["add-evidence", ledger, evidence]);
    run(ledgerCli, ["transition-node", ledger, id, "PASSED", "--actor", "fixture", "--reason", "local checks passed", "--receipt", id + "-receipt"]);
  }

  run(ledgerCli, ["transition-run", ledger, "INTEGRATING", "--actor", "fixture", "--reason", "ready to integrate"]);
  transitionNode(ledger, "integrate-checkout", ["READY", "DISCUSSING", "RUNNING", "EVIDENCE_PENDING"]);
  const integrationEvidence = writeJson(path.join(root, "integration-evidence.json"), {
    id: "integration-receipt", nodeId: "integrate-checkout", source: "integration-sha", environment: "isolated fixture", procedure: "integrated smoke", result: "PASS", artifacts: [],
  });
  run(ledgerCli, ["add-evidence", ledger, integrationEvidence]);
  run(ledgerCli, ["transition-node", ledger, "integrate-checkout", "PASSED", "--actor", "fixture", "--reason", "integration passed", "--receipt", "integration-receipt"]);

  run(ledgerCli, ["transition-run", ledger, "TESTING", "--actor", "fixture", "--reason", "independent milestone test"]);
  transitionNode(ledger, "test-checkout", ["READY", "DISCUSSING", "RUNNING", "EVIDENCE_PENDING"]);
  const screenshot = path.join(runDir, "checkout-proof.svg");
  fs.writeFileSync(screenshot, '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#12151a"/><text x="40" y="190" fill="#63d7a0" font-size="32">Checkout behavior passed</text></svg>');
  const artifact = writeJson(path.join(root, "artifact.json"), {
    id: "checkout-proof", nodeId: "test-checkout", label: "Checkout success", kind: "image", path: screenshot, mime: "image/svg+xml", required: true, summary: "Fresh evidence from the integrated checkout journey.", redacted: true,
  });
  run(ledgerCli, ["add-artifact", ledger, artifact]);
  const testEvidence = writeJson(path.join(root, "test-evidence.json"), {
    id: "test-receipt", nodeId: "test-checkout", source: "integration-sha", environment: "production-like isolated fixture", procedure: "real browser checkout journey", result: "PASS", artifacts: ["checkout-proof"],
  });
  run(ledgerCli, ["add-evidence", ledger, testEvidence]);
  run(ledgerCli, ["transition-node", ledger, "test-checkout", "PASSED", "--actor", "fixture", "--reason", "behavior verified", "--receipt", "test-receipt"]);
  run(ledgerCli, ["transition-run", ledger, "REPORTING", "--actor", "fixture", "--reason", "all required nodes passed"]);
  run(renderer, [ledger, report]);
  run(ledgerCli, ["transition-run", ledger, "AWAITING_REVIEW_DECISION", "--actor", "fixture", "--reason", "self-contained report ready"]);
  const html = fs.readFileSync(report, "utf8");
  assert.match(html, /Checkout behavior fixture/);
  assert.match(html, /data:image\/svg\+xml;base64/);
  assert.match(html, /AWAITING_REVIEW_DECISION|REPORTING/);
  assert.match(html, /id="split-ledger"/);

  const retryId = "fixture-retry";
  const retryDir = path.join(root, retryId);
  const retryLedger = path.join(retryDir, "run.json");
  run(ledgerCli, ["init", retryLedger, "--run-id", retryId, "--title", "Retry budget fixture", "--run-dir", retryDir, "--report", path.join(root, "reports", retryId + ".html")]);
  run(ledgerCli, ["set-plan", retryLedger, plan]);
  const retryNodeFile = writeJson(path.join(root, "retry-node.json"), { id: "exec-retry", title: "Exercise retry budget", kind: "execute", dependencies: [], ownership: ["fixture"], acceptanceCriteria: ["Budget blocks fourth attempt"], reasoning: "medium" });
  run(ledgerCli, ["add-node", retryLedger, retryNodeFile]);
  transitionNode(retryLedger, "exec-retry", ["READY", "RUNNING", "FAILED", "REOPENED", "RUNNING", "FAILED", "REOPENED", "RUNNING", "FAILED", "REOPENED"]);
  const exhausted = run(ledgerCli, ["transition-node", retryLedger, "exec-retry", "RUNNING", "--actor", "fixture", "--reason", "fourth attempt"], 1);
  assert.match(exhausted.stderr, /exhausted 3 attempts/);

  const missingId = "fixture-missing-artifact";
  const missingDir = path.join(root, missingId);
  const missingLedger = path.join(missingDir, "run.json");
  run(ledgerCli, ["init", missingLedger, "--run-id", missingId, "--title", "Missing artifact fixture", "--run-dir", missingDir, "--report", path.join(root, "reports", missingId + ".html")]);
  const missingArtifact = writeJson(path.join(root, "missing-artifact.json"), { id: "missing", label: "Missing proof", kind: "image", path: path.join(missingDir, "absent.png"), required: true, summary: "Must block", redacted: true });
  run(ledgerCli, ["add-artifact", missingLedger, missingArtifact]);
  const blockedRender = run(renderer, [missingLedger, path.join(root, "reports", missingId + ".html")], 1);
  assert.match(blockedRender.stderr, /required artifact is unavailable/);

  run(cleaner, [ledger, report, "--confirm-run", runId]);
  assert.equal(fs.existsSync(runDir), false);
  assert.equal(fs.existsSync(report), true);
  process.stdout.write("PASS split-engineering fixture: approval, DAG, receipts, report embedding, retry budget, missing-artifact block, and guarded cleanup\n");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
