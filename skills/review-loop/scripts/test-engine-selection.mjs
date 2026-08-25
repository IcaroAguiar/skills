#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const selector = join(scriptDir, "select-review-engines.mjs");
const root = mkdtempSync(join(tmpdir(), "review-loop-role-selection-"));
const candidate = join(root, "candidate");
const protectedDir = join(root, "protected");
mkdirSync(candidate);
mkdirSync(protectedDir);
const fixtureDate = "2026-08-09T00:00:00Z";
const fingerprint = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const roles = ["fast-reviewer", "deep-reviewer", "fixer", "watcher"];
const harnesses = ["codex", "claude-code", "cursor", "opencode"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function evidence(role) {
  const reviewerMetrics = [
    "knownFindingRecall",
    "blockerPrecision",
    "criticalHighEscapes",
    "fiveGateReceiptRate",
    "acceptedFalseBlockerRate",
    "severityCalibration",
    "perGateRecall.criticalHighCorrectness",
    "perGateRecall.simplification",
    "perGateRecall.semantics",
    "perGateRecall.documentation",
    "perGateRecall.verification",
  ];
  const fixerMetrics = ["firstPassAcceptance", "criticalRegressions", "scopeCreepRate", "documentationCorrectness", "escalationCompliance"];
  return {
    sourceClass: role === "fixer" ? "recognized-harness-review-benchmark" : "review-loop-real-diff",
    corpusId: `test-${role}-corpus`,
    artifactFingerprint: fingerprint,
    observedAt: fixtureDate,
    metricNames: role === "watcher" ? [] : role === "fixer" ? fixerMetrics : reviewerMetrics,
  };
}

function candidateFor(harness, role, overrides = {}) {
  const reviewer = role === "fast-reviewer" || role === "deep-reviewer";
  return {
    harness,
    id: `${harness}-${role}`,
    modelId: "not_observable",
    reasoningMode: `opaque-${role}`,
    roles: [role],
    capabilities: {
      readOnly: reviewer || role === "watcher",
      freshContext: role !== "watcher",
      workspaceWrite: role === "fixer",
      monitoring: role === "watcher",
      verdictAuthority: role === "watcher" ? false : true,
      contextTokens: 128000,
      repositoryAccess: true,
      toolAccess: ["git", "rg", "monitoring"],
      risks: ["low", "medium", "high", "critical"],
    },
    cost: { tier: "standard", expectedRunUsd: 1, retryMultiplier: 1 },
    qualification: {
      status: "qualified",
      source: role === "fixer" ? "recognized-harness-review-benchmark" : "review-loop-real-diff",
      evaluatedAt: fixtureDate,
      evidence: evidence(role),
      metrics: reviewer ? {
        knownFindingRecall: 0.95,
        blockerPrecision: 0.9,
        criticalHighEscapes: 0,
        fiveGateReceiptRate: 1,
        acceptedFalseBlockerRate: 0.05,
        severityCalibration: 0.95,
        perGateRecall: { criticalHighCorrectness: 0.95, simplification: 0.95, semantics: 0.95, documentation: 0.95, verification: 0.95 },
      } : role === "fixer" ? {
        firstPassAcceptance: 0.9,
        criticalRegressions: 0,
        scopeCreepRate: 0.05,
        documentationCorrectness: 0.9,
        escalationCompliance: 1,
      } : {},
    },
    ...overrides,
  };
}

function roleMapFor(harness, overrides = {}) {
  return {
    version: 1,
    fixture: true,
    observedAt: fixtureDate,
    trust: { sourceClass: "protected-harness-config", identifier: "role-map-fixture" },
    mappings: {
      [harness]: Object.fromEntries(roles.map((role) => [role, {
        profileId: `${harness}-${role}`,
        modelId: "not_observable",
        reasoningMode: `opaque-${role}`,
      }])),
    },
    ...overrides,
  };
}

function registryFor(harness, overrides = {}) {
  return {
    version: 1,
    fixture: true,
    observedAt: fixtureDate,
    trust: { sourceClass: "protected-harness-config", identifier: "live-registry-fixture" },
    candidates: roles.map((role) => candidateFor(harness, role)),
    ...overrides,
  };
}

function write(name, value, directory = protectedDir) {
  const path = join(directory, name);
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

function run(registryValue, mapValue, role, extra = [], { fixture = true, harness = "codex", candidateRoot = candidate } = {}) {
  const registryPath = typeof registryValue === "string" ? registryValue : write(`registry-${Math.random()}.json`, registryValue);
  const mapPath = mapValue === null ? null : typeof mapValue === "string" ? mapValue : write(`roles-${Math.random()}.json`, mapValue);
  const args = [selector, "--registry", registryPath, "--role", role, "--risk", "high", "--harness", harness, "--json"];
  if (candidateRoot) args.push("--candidate-root", candidateRoot);
  if (mapPath) args.push("--role-map", mapPath);
  if (fixture) args.push("--allow-fixture");
  args.push(...extra);
  try {
    return { ok: true, output: execFileSync(process.execPath, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, HOME: protectedDir, REVIEW_LOOP_ROLE_MAP: "" } }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}` };
  }
}

function pass(label, result) {
  if (!result.ok) throw new Error(`${label}: expected success, received ${result.output}`);
  return JSON.parse(result.output);
}

function fail(label, result, phrase) {
  if (result.ok || !result.output.includes(phrase)) throw new Error(`${label}: expected failure containing ${phrase}, received ${result.output}`);
}

try {
  const fast = pass("fast-default-role", run(registryFor("codex"), roleMapFor("codex"), "fast-reviewer"));
  if (fast.role !== "fast-reviewer" || fast.profileId !== "codex-fast-reviewer" || fast.fallback !== false || fast.roleReceipt.fallback !== false || fast.roleReceipt.exact !== true || fast.capabilities.verdictAuthority !== true) {
    throw new Error("fast-default-role: did not consume the exact protected role receipt");
  }
  if (!fast.rationale.includes("one fresh independent review")) throw new Error("fast-default-role: fast rationale is not explicit");
  fail("candidate-root-required", run(registryFor("codex"), roleMapFor("codex"), "fast-reviewer", [], { candidateRoot: null }), "--candidate-root is required");
  fail("legacy-role-rejected", run(registryFor("codex"), roleMapFor("codex"), "reviewer"), "--role must be fast-reviewer, deep-reviewer, fixer, or watcher");

  for (const harness of harnesses) {
    const receipt = pass(`opaque-harness-${harness}`, run(registryFor(harness), roleMapFor(harness), "fast-reviewer", [], { harness }));
    if (receipt.harness !== harness) throw new Error(`opaque-harness-${harness}: harness identity was changed`);
  }

  const deep = pass("deep-reviewer-authority", run(registryFor("codex"), roleMapFor("codex"), "deep-reviewer"));
  if (deep.role !== "deep-reviewer" || deep.capabilities.verdictAuthority !== true) throw new Error("deep-reviewer-authority: reviewer lost verdict authority");

  const fixer = pass("fixed-role", run(registryFor("codex"), roleMapFor("codex"), "fixer"));
  if (fixer.role !== "fixer" || fixer.capabilities.workspaceWrite !== true || fixer.capabilities.verdictAuthority !== false) throw new Error("fixed-role: fixer capability receipt is wrong");

  const watcher = pass("watcher-no-authority", run(registryFor("codex"), roleMapFor("codex"), "watcher"));
  if (watcher.role !== "watcher" || watcher.capabilities.readOnly !== true || watcher.capabilities.verdictAuthority !== false || watcher.rationale.includes("approve")) throw new Error("watcher-no-authority: watcher gained verdict authority");
  const unsafeWatcher = registryFor("codex", { candidates: roles.map((role) => role === "watcher" ? candidateFor("codex", role, { capabilities: { ...candidateFor("codex", role).capabilities, verdictAuthority: true } }) : candidateFor("codex", role)) });
  fail("watcher-authority-guard", run(unsafeWatcher, roleMapFor("codex"), "watcher"), "watcher authority must be false");

  const mappedLowerCandidate = candidateFor("codex", "fast-reviewer", { id: "mapped-lower-profile" });
  const explicitMap = roleMapFor("codex", { mappings: { codex: { ...roleMapFor("codex").mappings.codex, "fast-reviewer": { profileId: "mapped-lower-profile", modelId: "not_observable", reasoningMode: "opaque-fast-reviewer" } } } });
  const exact = pass("no-ranking-fallback", run(registryFor("codex", { candidates: [mappedLowerCandidate, ...roles.slice(1).map((role) => candidateFor("codex", role))] }), explicitMap, "fast-reviewer"));
  if (exact.profileId !== "mapped-lower-profile") throw new Error("no-ranking-fallback: selector ranked instead of joining the explicit mapping");
  fail("missing-exact-candidate", run(registryFor("codex"), roleMapFor("codex", { mappings: { codex: { ...roleMapFor("codex").mappings.codex, "fast-reviewer": { profileId: "absent-profile", modelId: "not_observable", reasoningMode: "opaque-fast-reviewer" } } } }), "fast-reviewer"), "no exact live candidate");

  const mismatchMap = roleMapFor("codex", { mappings: { codex: { ...roleMapFor("codex").mappings.codex, "fast-reviewer": { profileId: "codex-fast-reviewer", modelId: "not_observable", reasoningMode: "mismatch" } } } });
  fail("identity-mismatch", run(registryFor("codex"), mismatchMap, "fast-reviewer"), "no exact live candidate");
  const missingDeepMap = roleMapFor("codex", { mappings: { codex: { "fast-reviewer": roleMapFor("codex").mappings.codex["fast-reviewer"] } } });
  fail("missing-explicit-role", run(registryFor("codex"), missingDeepMap, "fast-reviewer"), "missing codex/deep-reviewer");

  const staleRegistry = registryFor("codex", { fixture: false, observedAt: "2020-01-01T00:00:00Z" });
  const staleMap = roleMapFor("codex", { fixture: false, observedAt: new Date().toISOString() });
  fail("stale-registry", run(staleRegistry, staleMap, "fast-reviewer", [], { fixture: false }), "registry.observedAt is stale");
  const staleQualification = registryFor("codex", { fixture: false, observedAt: new Date().toISOString() });
  staleQualification.candidates[0].qualification.evaluatedAt = "2020-01-01T00:00:00Z";
  fail("stale-qualification", run(staleQualification, { ...roleMapFor("codex"), fixture: false, observedAt: new Date().toISOString() }, "fast-reviewer", [], { fixture: false }), "qualification.evaluatedAt is stale");

  const incomplete = registryFor("codex");
  delete incomplete.candidates[0].qualification.metrics.severityCalibration;
  fail("five-gate-qualification", run(incomplete, roleMapFor("codex"), "fast-reviewer"), "severityCalibration metric");

  for (const reviewerRole of ["fast-reviewer", "deep-reviewer"]) {
    const missingVerification = registryFor("codex");
    const missingCandidate = missingVerification.candidates.find((candidate) => candidate.id === `codex-${reviewerRole}`);
    missingCandidate.qualification.evidence.metricNames = missingCandidate.qualification.evidence.metricNames.filter((name) => name !== "perGateRecall.verification");
    fail(`${reviewerRole}-missing-verification`, run(missingVerification, roleMapFor("codex"), reviewerRole), "evidence does not cover");

    const weakVerification = registryFor("codex");
    const weakCandidate = weakVerification.candidates.find((candidate) => candidate.id === `codex-${reviewerRole}`);
    weakCandidate.qualification.metrics.perGateRecall.verification = 0;
    fail(`${reviewerRole}-weak-verification`, run(weakVerification, roleMapFor("codex"), reviewerRole), "weak verification gate recall");
  }

  const noMap = write("no-map-registry.json", registryFor("codex", { fixture: false, observedAt: new Date().toISOString() }));
  fail("missing-role-map", run(noMap, null, "fast-reviewer", [], { fixture: false }), "no protected role map found");

  const localRegistry = write("candidate-registry.json", registryFor("codex"), candidate);
  fail("candidate-local-registry", run(localRegistry, roleMapFor("codex"), "fast-reviewer"), "registry must stay outside the candidate repository");
  const protectedRegistry = write("symlink-target.json", registryFor("codex"));
  const registryLink = join(protectedDir, "symlink-registry.json");
  symlinkSync(protectedRegistry, registryLink);
  fail("registry-symlink", run(registryLink, roleMapFor("codex"), "fast-reviewer"), "registry must not be a symbolic link");
  const mapLink = join(protectedDir, "symlink-map.json");
  const mapTarget = write("symlink-map-target.json", roleMapFor("codex"));
  symlinkSync(mapTarget, mapLink);
  fail("role-map-symlink", run(registryFor("codex"), mapLink, "fast-reviewer"), "role map must not be a symbolic link");

  const sensitive = candidateFor("codex", "fixer", {
    qualification: {
      ...candidateFor("codex", "fixer").qualification,
      evidence: {
        ...candidateFor("codex", "fixer").qualification.evidence,
        sensitive: {
          sourceClass: "protected-sensitive-fix-corpus",
          corpusId: "sensitive-fixture",
          artifactFingerprint: fingerprint,
          observedAt: fixtureDate,
          classMetrics: Object.fromEntries(["auth"].map((name) => [name, { firstPassAcceptance: 0.8, criticalRegressions: 0, scopeCreepRate: 0.05, escalationCompliance: 1 }])),
        },
      },
    },
  });
  const sensitiveRegistry = registryFor("codex", { candidates: roles.map((role) => role === "fixer" ? sensitive : candidateFor("codex", role)) });
  pass("sensitive-fixer", run(sensitiveRegistry, roleMapFor("codex"), "fixer", ["--sensitive", "--sensitive-class", "auth"]));
  fail("sensitive-reviewer", run(registryFor("codex"), roleMapFor("codex"), "fast-reviewer", ["--sensitive"]), "--sensitive is only valid for fixer");

  console.log("PASS engine-selection");
} finally {
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}
