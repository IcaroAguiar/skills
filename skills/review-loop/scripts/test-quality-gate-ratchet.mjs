#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findingCategory } from "./lib/gate-categories.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const generator = join(scriptDirectory, "generate-quality-gate-ratchet.mjs");
const fixtureDirectory = mkdtempSync(join(tmpdir(), "review-loop-ratchet-"));
const gateDirectory = join(fixtureDirectory, "docs/ai/quality-gate");

function removeOwnedTree(path) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    for (const entry of readdirSync(path)) removeOwnedTree(join(path, entry));
    rmdirSync(path);
    return;
  }
  unlinkSync(path);
}

function run(script, args = []) {
  try {
    return { ok: true, output: execFileSync(process.execPath, [script, ...args], { cwd: fixtureDirectory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (error) {
    return { ok: false, output: String(error.stdout || "") + String(error.stderr || "") };
  }
}

function runCommand(command, args, cwd = fixtureDirectory) {
  try {
    return { ok: true, output: execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (error) {
    return { ok: false, output: String(error.stdout || "") + String(error.stderr || "") };
  }
}

function resolverSource(workflow) {
  const startMarker = "          node --input-type=commonjs <<'NODE'";
  const endMarker = "          NODE";
  const start = workflow.indexOf(startMarker);
  const end = workflow.indexOf(`\n${endMarker}`, start);
  expect(start >= 0 && end > start, "generated workflow is missing the executable context resolver");
  return workflow
    .slice(start + startMarker.length, end)
    .split("\n")
    .map((line) => line.startsWith("          ") ? line.slice(10) : line)
    .join("\n") + "\n";
}

function resolveContext(source, label, eventName, payload, headSha) {
  const eventPath = join(fixtureDirectory, `${label}-event.json`);
  const outputPath = join(fixtureDirectory, `${label}-output.txt`);
  writeFileSync(eventPath, JSON.stringify(payload));
  try {
    execFileSync(process.execPath, ["--input-type=commonjs"], {
      cwd: fixtureDirectory,
      env: { ...process.env, GITHUB_EVENT_NAME: eventName, GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: outputPath, GITHUB_SHA: headSha },
      input: source,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(`${label} context resolver failed: ${String(error.stderr || error.message)}`);
  }
  const values = Object.fromEntries(readFileSync(outputPath, "utf8").trim().split("\n").map((line) => line.split("=")));
  expect(values.base && values.head, `${label} context resolver did not emit base and head outputs`);
  return values;
}

function git(...args) {
  const commandArgs = Array.isArray(args[1]) ? [args[0], ...args[1]] : args;
  const result = runCommand("git", commandArgs, fixtureDirectory);
  expect(result.ok, `git ${commandArgs.join(" ")} failed: ${result.output}`);
  return result.output.trim();
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function writePacket(packet) {
  writeFileSync(join(gateDirectory, "review-loop-packet.json"), JSON.stringify(packet, null, 2) + "\n");
}

try {
  expect(findingCategory({ rule: "swallowed-error", severity: "high" }, () => false) === "review-signal", "collector high severity must not become a blocker before adjudication");
  writeFileSync(join(fixtureDirectory, "package.json"), JSON.stringify({ name: "fixture", private: true }, null, 2) + "\n");
  execFileSync(process.execPath, [generator, "--root", fixtureDirectory, "--write"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  const workflow = readFileSync(join(gateDirectory, "github-action-quality-gate-ratchet.yml"), "utf8");
  expect(workflow.includes("contents: read"), "generated workflow lost read-only contents permission");
  expect(!workflow.includes("origin/main"), "generated workflow still depends on origin/main fallback");
  expect(!workflow.includes("pull-requests: write"), "generated workflow grants pull-request write permission to candidate analysis");
  expect(!workflow.includes("post-pr-comment.mjs"), "generated workflow still runs the PR comment publisher with candidate code");
  expect(!workflow.includes("GITHUB_TOKEN:"), "generated workflow exports GITHUB_TOKEN during candidate analysis");
  expect(!workflow.includes("${{ github.base_ref"), "generated workflow still interpolates base_ref directly into commands");
  expect(!workflow.includes("execSync(`git"), "generated workflow interpolates untrusted context into a shell command");
  expect(workflow.includes("execFileSync(\"git\""), "generated workflow does not use argument-safe Git execution");
  expect(workflow.includes("review_loop_context.outputs.base"), "generated workflow context outputs not wired to packet/check steps");
  expect(workflow.includes("vendor/collect-review-context.mjs"), "generated workflow does not vendor collector path");
  expect(workflow.includes("Resolve review-loop context"), "generated workflow missing deterministic event-based base resolver");
  expect(workflow.includes("eventName === \"pull_request\""), "generated workflow does not explicitly handle pull_request context");
  expect(workflow.includes("eventName === \"push\""), "generated workflow does not explicitly handle push context");
  expect(workflow.includes("eventPayload?.before"), "generated workflow does not derive push base from event payload");
  expect(workflow.includes("eventPayload?.pull_request?.base?.sha"), "generated workflow does not derive pull_request base from event payload");
  expect(workflow.includes('value + "^"'), "generated workflow cannot derive parent-base fallback for empty/invalid base");
  expect(workflow.includes("GITHUB_EVENT_NAME"), "generated workflow does not read event name from workflow environment");
  expect(workflow.includes("GITHUB_EVENT_PATH"), "generated workflow does not read event payload from trusted GitHub env");
  expect(workflow.includes("GITHUB_EVENT_NAME: ${{ github.event_name }}"), "generated workflow does not pass event name through env");
  expect(workflow.includes("GITHUB_EVENT_PATH: ${{ github.event_path }}"), "generated workflow does not pass event path through env");
  expect(workflow.includes("GITHUB_SHA: ${{ github.sha }}"), "generated workflow does not pass checked-out SHA through env");
  expect(workflow.includes("workflow_dispatch"), "generated workflow does not include workflow_dispatch-safe base fallback");
  expect(!/uses:\s+\S+@v\d+\b/.test(workflow), "generated workflow still pins mutable action tags such as @v4 or @v2");
  expect(/uses:\s+actions\/checkout@[0-9a-f]{40}/.test(workflow), "generated workflow must pin actions/checkout to an immutable commit SHA");
  expect(/uses:\s+actions\/setup-node@[0-9a-f]{40}/.test(workflow), "generated workflow must pin actions/setup-node to an immutable commit SHA");
  expect(/uses:\s+gitleaks\/gitleaks-action@[0-9a-f]{40}/.test(workflow), "generated workflow must pin gitleaks/gitleaks-action to an immutable commit SHA");
  expect(/uses:\s+actions\/upload-artifact@[0-9a-f]{40}/.test(workflow), "generated workflow must pin actions/upload-artifact to an immutable commit SHA");

  const vendoredFiles = [
    "vendor/collect-review-context.mjs",
    "vendor/fingerprint-review-state.mjs",
    "vendor/lib/external-toolbelt.mjs",
    "vendor/lib/gate-categories.mjs",
  ];
  for (const relativePath of vendoredFiles) expect(existsSync(join(gateDirectory, relativePath)), `generated package is missing vendored file ${relativePath}`);

  expect(existsSync(join(gateDirectory, "vendor/lib")), "generated package missing vendor/lib directory for relative collector dependencies");
  mkdirSync(join(fixtureDirectory, "src"), { recursive: true });
  writeFileSync(join(fixtureDirectory, "src", "service.ts"), "export const service = \"ok\";\\n");
  git("init", ["-q"]);
  git("add", ["package.json", "src/service.ts"]);
  git("-c", "user.name=Codex Smoke", "-c", "user.email=codex-smoke@example.local", "commit", "-m", "fixture baseline");
  writeFileSync(join(fixtureDirectory, "src", "service.ts"), "export const service = \"ok2\";\\n");
  git("add", ["src/service.ts"]);
  git("-c", "user.name=Codex Smoke", "-c", "user.email=codex-smoke@example.local", "commit", "-m", "candidate");
  const baseSha = git("rev-parse", ["HEAD~1"]);
  const headSha = git("rev-parse", ["HEAD"]);
  const collected = runCommand(process.execPath, [join(gateDirectory, "vendor", "collect-review-context.mjs"), "--candidate-mode", "commit", "--base", baseSha, "--head", headSha, "--json"], fixtureDirectory);
  expect(collected.ok, "generated vendored collector could not run in fixture scope");
  expect(!collected.output.includes("Cannot find module"), "generated vendored collector still references missing relative dependencies");
  expect(Array.isArray(JSON.parse(collected.output).repositories), "vendored collector did not return packet repositories");

  const contextResolver = resolverSource(workflow);
  const contextCases = [
    ["pull-request", "pull_request", { pull_request: { base: { sha: baseSha }, head: { sha: headSha } } }],
    ["push", "push", { before: baseSha, after: headSha }],
    ["push-empty-base", "push", { before: "", after: headSha }],
    ["workflow-dispatch", "workflow_dispatch", {}],
  ];
  for (const [label, eventName, payload] of contextCases) {
    const context = resolveContext(contextResolver, label, eventName, payload, headSha);
    expect(context.base === baseSha, `${label} context resolver chose an incorrect exact base SHA`);
    expect(context.head === headSha, `${label} context resolver chose an incorrect candidate SHA`);
  }

  const heuristic = { id: "collector:fixture/src/service.ts:10", rule: "swallowed-error", severity: "high", repo: "fixture", file: "src/service.ts", line: 10, text: "catch (error) {}" };
  writePacket({ findings: [heuristic] });
  let result = run(join(gateDirectory, "check-ratchet.mjs"));
  expect(result.ok, "a high-severity deterministic collector heuristic must remain a review signal");
  let report = JSON.parse(readFileSync(join(gateDirectory, "quality-gate-report.json"), "utf8"));
  expect(report.metrics.review.blocking === 0 && report.metrics.review.signals === 1, "heuristic packet was not reported as a signal-only result");

  const configPath = join(gateDirectory, "quality-gate.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.policies.reviewLoop.calibratedDetectors = [{ rule: "swallowed-error", calibrationEvidence: "review history fixture qg-17" }];
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  result = run(join(gateDirectory, "check-ratchet.mjs"));
  expect(!result.ok && result.output.includes("review-loop.blocking"), "an explicitly calibrated deterministic detector did not block");

  writeFileSync(join(gateDirectory, "review-feedback.json"), JSON.stringify({ feedback: [{ outcome: "false-positive", findingId: heuristic.id }] }, null, 2) + "\n");
  result = run(join(gateDirectory, "check-ratchet.mjs"));
  expect(result.ok, "an exact known false positive still blocked the ratchet");

  writeFileSync(join(gateDirectory, "review-feedback.json"), JSON.stringify({ feedback: [] }, null, 2) + "\n");
  writePacket({
    findings: [heuristic],
    adjudicatedFindings: [{ ...heuristic, id: "receipt:fixture:10", adjudication: "adjudicated", decision: "block", evidence: "maintainer review receipt: tests show the catch swallows the failure" }],
  });
  config.policies.reviewLoop.calibratedDetectors = [];
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  result = run(join(gateDirectory, "check-ratchet.mjs"));
  expect(!result.ok && result.output.includes("review-loop.blocking"), "an adjudicated blocking receipt did not block");
  report = JSON.parse(readFileSync(join(gateDirectory, "quality-gate-report.json"), "utf8"));
  expect(report.metrics.review.adjudicated === 1, "adjudicated receipt was not counted independently from collector signals");
  console.log("PASS quality-gate-ratchet trust-and-adjudication");
} finally {
  removeOwnedTree(fixtureDirectory);
}
