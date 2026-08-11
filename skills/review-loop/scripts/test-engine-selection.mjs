#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const selectorPath = join(scriptDir, "select-review-engines.mjs");
const testDirectory = mkdtempSync(join(tmpdir(), "review-loop-engine-selection-"));
const candidateDirectory = join(testDirectory, "candidate");
const protectedDirectory = join(testDirectory, "protected");
mkdirSync(candidateDirectory);
mkdirSync(protectedDirectory);
const REVIEWER_CEILING_USD = 4;
const HIGH_RISK = "high";
const FIXTURE_DATE = "2026-08-09T00:00:00Z";
const ARTIFACT_FINGERPRINT = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const REVIEWER_EVIDENCE_METRICS = ["knownFindingRecall", "blockerPrecision", "criticalHighEscapes", "fiveGateReceiptRate", "acceptedFalseBlockerRate", "severityCalibration", "perGateRecall.criticalHighCorrectness", "perGateRecall.simplification", "perGateRecall.semantics", "perGateRecall.documentation"];
const FIXER_EVIDENCE_METRICS = ["firstPassAcceptance", "criticalRegressions", "scopeCreepRate", "documentationCorrectness", "escalationCompliance"];
const SENSITIVE_FIX_CLASSES = ["auth", "tenancy", "credentials", "migrations", "transactions", "concurrency", "public-contracts-ops"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function evidence(sourceClass, corpusId, metricNames) {
  return {
    sourceClass,
    corpusId,
    artifactLocator: `test://${corpusId}`,
    artifactFingerprint: ARTIFACT_FINGERPRINT,
    observedAt: FIXTURE_DATE,
    metricNames,
  };
}

function sensitiveEvidence(classes = SENSITIVE_FIX_CLASSES) {
  return {
    sourceClass: "protected-sensitive-fix-corpus",
    corpusId: "protected-sensitive-fixer-corpus",
    artifactFingerprint: ARTIFACT_FINGERPRINT,
    observedAt: FIXTURE_DATE,
    classMetrics: Object.fromEntries(classes.map((sensitiveClass) => [
      sensitiveClass,
      { firstPassAcceptance: 0.8, criticalRegressions: 0, scopeCreepRate: 0.05, escalationCompliance: 1 },
    ])),
  };
}

function reviewer(id, overrides = {}) {
  const candidate = {
    id,
    harness: "test-harness",
    modelId: "test-review-model",
    roles: ["reviewer"],
    capabilities: { readOnly: true, freshContext: true, workspaceWrite: false, contextTokens: 128000, repositoryAccess: true, toolAccess: ["git", "rg"], risks: ["low", "medium", HIGH_RISK] },
    cost: { tier: "high", expectedRunUsd: 2, retryMultiplier: 1 },
    qualification: {
      status: "qualified",
      source: "review-loop-real-diff",
      evaluatedAt: FIXTURE_DATE,
      evidence: evidence("review-loop-real-diff", "reviewer-test-corpus", REVIEWER_EVIDENCE_METRICS),
      metrics: {
        knownFindingRecall: 0.9,
        blockerPrecision: 0.8,
        criticalHighEscapes: 0,
        fiveGateReceiptRate: 1,
        acceptedFalseBlockerRate: 0.1,
        severityCalibration: 0.9,
        perGateRecall: { criticalHighCorrectness: 0.9, simplification: 0.9, semantics: 0.9, documentation: 0.9 },
      },
    },
  };
  return { ...candidate, ...overrides };
}

function fixer(id, overrides = {}) {
  const candidate = {
    id,
    harness: "test-harness",
    modelId: "test-fix-model",
    roles: ["fixer"],
    capabilities: { readOnly: false, freshContext: true, workspaceWrite: true, contextTokens: 64000, repositoryAccess: true, toolAccess: ["git", "rg"], risks: ["low", "medium", HIGH_RISK] },
    cost: { tier: "medium", expectedRunUsd: 1, retryMultiplier: 1 },
    qualification: {
      status: "qualified",
      source: "recognized-harness-review-benchmark",
      evaluatedAt: FIXTURE_DATE,
      evidence: evidence("recognized-harness-review-benchmark", "fixer-test-corpus", FIXER_EVIDENCE_METRICS),
      metrics: {
        firstPassAcceptance: 0.8,
        criticalRegressions: 0,
        scopeCreepRate: 0.05,
        documentationCorrectness: 0.9,
        escalationCompliance: 1,
      },
    },
  };
  return { ...candidate, ...overrides };
}

function registry(candidates, overrides = {}) {
  return {
    version: 1,
    fixture: true,
    observedAt: FIXTURE_DATE,
    trust: { sourceClass: "protected-harness-config", identifier: "deterministic-test-registry" },
    policy: { reviewerCostCeilingUsd: REVIEWER_CEILING_USD },
    candidates,
    ...overrides,
  };
}

function writeRegistry(name, value) {
  const path = join(testDirectory, `${name}.json`);
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

function runSelection(name, value, role, extraArgs = []) {
  const path = writeRegistry(name, value);
  const args = [selectorPath, "--registry", path, "--role", role, "--risk", HIGH_RISK, "--json", ...extraArgs];
  try {
    return { ok: true, output: execFileSync(process.execPath, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}` };
  }
}

function runWithoutRegistry(name, value, role) {
  writeFileSync(join(testDirectory, ".review-loop-engines.json"), JSON.stringify(value, null, 2));
  const args = [selectorPath, "--role", role, "--risk", HIGH_RISK, "--json"];
  try {
    return {
      ok: true,
      output: execFileSync(process.execPath, args, {
        cwd: testDirectory,
        env: { ...process.env, HOME: testDirectory, REVIEW_LOOP_ENGINE_REGISTRY: "" },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return { ok: false, output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}` };
  }
}

function runCandidateLocalRegistry(name, value, role) {
  const path = writeRegistry(name, value);
  const args = [selectorPath, "--registry", path, "--role", role, "--risk", HIGH_RISK, "--json"];
  try {
    return { ok: true, output: execFileSync(process.execPath, args, { cwd: testDirectory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}` };
  }
}

function runRegistryPath(path, role, extraArgs = []) {
  const args = [selectorPath, "--registry", path, "--role", role, "--risk", HIGH_RISK, "--json", ...extraArgs];
  try {
    return { ok: true, output: execFileSync(process.execPath, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}` };
  }
}

function expectPass(label, result) {
  if (!result.ok) throw new Error(`${label}: expected success, received ${result.output}`);
  return JSON.parse(result.output);
}

function expectFailure(label, result, expectedMessage) {
  if (result.ok) throw new Error(`${label}: expected failure`);
  if (!result.output.includes(expectedMessage)) throw new Error(`${label}: expected ${expectedMessage}, received ${result.output}`);
}

try {
  const strongReviewer = reviewer("strong-reviewer", {
    cost: { tier: "high", expectedRunUsd: 3.5, retryMultiplier: 1 },
    qualification: { ...reviewer("source").qualification, metrics: { ...reviewer("source").qualification.metrics, knownFindingRecall: 0.98, blockerPrecision: 0.9, severityCalibration: 0.95, acceptedFalseBlockerRate: 0.05 } },
  });
  const cheapReviewer = reviewer("cheap-reviewer");
  const reviewerReceipt = expectPass("highest-capable-reviewer", runSelection("reviewer-ranking", registry([cheapReviewer, strongReviewer]), "reviewer", ["--allow-fixture"]));
  if (reviewerReceipt.engine !== "strong-reviewer" || reviewerReceipt.aboveCeiling !== false || reviewerReceipt.costCeilingUsd !== REVIEWER_CEILING_USD || reviewerReceipt.premiumEscalation !== null) {
    throw new Error("highest-capable-reviewer: receipt does not describe the sustainable selection");
  }
  if (JSON.stringify(reviewerReceipt).includes(testDirectory) || reviewerReceipt.registry.sourceClass !== "protected-harness-config" || reviewerReceipt.registry.identifier) {
    throw new Error("highest-capable-reviewer: receipt exposed a registry path or omitted its trust source");
  }

  const codexSolReviewer = reviewer("codex-sol-high", {
    harness: "codex",
    modelId: "gpt-5.6-sol",
    reasoningMode: "high",
  });
  const codexWrongReviewer = reviewer("codex-wrong-reviewer", {
    harness: "codex",
    modelId: "gpt-5.6-terra",
    reasoningMode: "max",
    qualification: { ...reviewer("source").qualification, metrics: { ...reviewer("source").qualification.metrics, knownFindingRecall: 1, blockerPrecision: 1 } },
  });
  const codexReviewerReceipt = expectPass("codex-reviewer-default", runSelection("codex-reviewer-default", registry([codexWrongReviewer, codexSolReviewer]), "reviewer", ["--allow-fixture"]));
  if (codexReviewerReceipt.engine !== "codex-sol-high" || codexReviewerReceipt.modelId !== "gpt-5.6-sol" || codexReviewerReceipt.reasoningMode !== "high" || codexReviewerReceipt.defaultPolicy?.enforced !== true) {
    throw new Error("codex-reviewer-default: required Sol high policy was not enforced");
  }
  expectFailure("codex-reviewer-no-fallback", runSelection("codex-reviewer-no-fallback", registry([codexWrongReviewer]), "reviewer", ["--allow-fixture"]), "Codex reviewer default requires gpt-5.6-sol with reasoning high");

  const codexLunaXhigh = fixer("codex-luna-xhigh", {
    harness: "codex",
    modelId: "gpt-5.6-luna",
    reasoningMode: "xhigh",
    cost: { tier: "medium", expectedRunUsd: 0.7, retryMultiplier: 1 },
  });
  const codexLunaMax = fixer("codex-luna-max", {
    harness: "codex",
    modelId: "gpt-5.6-luna",
    reasoningMode: "max",
    cost: { tier: "medium", expectedRunUsd: 1, retryMultiplier: 1 },
  });
  const codexWrongFixer = fixer("codex-wrong-fixer", {
    harness: "codex",
    modelId: "gpt-5.6-luna",
    reasoningMode: "medium",
    cost: { tier: "low", expectedRunUsd: 0.1, retryMultiplier: 1 },
  });
  const codexFixerReceipt = expectPass("codex-fixer-default", runSelection("codex-fixer-default", registry([codexWrongFixer, codexLunaMax, codexLunaXhigh]), "fixer", ["--allow-fixture"]));
  if (codexFixerReceipt.engine !== "codex-luna-xhigh" || codexFixerReceipt.modelId !== "gpt-5.6-luna" || !["xhigh", "max"].includes(codexFixerReceipt.reasoningMode)) {
    throw new Error("codex-fixer-default: required Luna xhigh|max policy was not enforced before cost ranking");
  }
  expectFailure("codex-fixer-no-fallback", runSelection("codex-fixer-no-fallback", registry([codexWrongFixer]), "fixer", ["--allow-fixture"]), "Codex fixer default requires gpt-5.6-luna with reasoning xhigh|max");

  expectFailure("mixed-harness-requires-selection", runSelection("mixed-harness-requires-selection", registry([codexSolReviewer, reviewer("other-harness-reviewer")]), "reviewer", ["--allow-fixture"]), "provide --harness from protected runtime state");
  const explicitCodexReceipt = expectPass("mixed-harness-explicit-codex", runSelection("mixed-harness-explicit-codex", registry([reviewer("other-harness-reviewer"), codexSolReviewer]), "reviewer", ["--allow-fixture", "--harness", "codex"]));
  if (explicitCodexReceipt.engine !== "codex-sol-high") throw new Error("mixed-harness-explicit-codex: selected an inactive harness");

  const gateFavoredReviewer = reviewer("gate-favored-reviewer", {
    qualification: { ...reviewer("source").qualification, metrics: { ...reviewer("source").qualification.metrics, perGateRecall: { criticalHighCorrectness: 1, simplification: 1, semantics: 1, documentation: 1 } } },
  });
  const aggregateFavoredReviewer = reviewer("aggregate-favored-reviewer", {
    qualification: { ...reviewer("source").qualification, metrics: { ...reviewer("source").qualification.metrics, knownFindingRecall: 0.95, perGateRecall: { criticalHighCorrectness: 0.85, simplification: 0.85, semantics: 0.85, documentation: 0.85 } } },
  });
  const gateReceipt = expectPass("reviewer-gate-recall-ranking", runSelection("reviewer-gate-recall-ranking", registry([aggregateFavoredReviewer, gateFavoredReviewer]), "reviewer", ["--allow-fixture"]));
  if (gateReceipt.engine !== "gate-favored-reviewer") throw new Error("reviewer-gate-recall-ranking: perGateRecall did not affect ranking");

  const ParetoLeader = reviewer("pareto-leader", {
    qualification: { ...reviewer("source").qualification, metrics: { ...reviewer("source").qualification.metrics, knownFindingRecall: 0.95, blockerPrecision: 0.9, severityCalibration: 0.95, acceptedFalseBlockerRate: 0.05, perGateRecall: { criticalHighCorrectness: 0.95, simplification: 0.95, semantics: 0.95, documentation: 0.95 } } },
  });
  const dominatedReviewer = reviewer("dominated-reviewer");
  const paretoForward = expectPass("reviewer-pareto-forward", runSelection("reviewer-pareto-forward", registry([dominatedReviewer, ParetoLeader]), "reviewer", ["--allow-fixture"]));
  const paretoReverse = expectPass("reviewer-pareto-reverse", runSelection("reviewer-pareto-reverse", registry([ParetoLeader, dominatedReviewer]), "reviewer", ["--allow-fixture"]));
  if (paretoForward.engine !== "pareto-leader" || JSON.stringify(paretoForward) !== JSON.stringify(paretoReverse) || !paretoForward.rejected.some(({ id, reason }) => id === "dominated-reviewer" && reason.includes("Pareto-dominated"))) {
    throw new Error("reviewer-pareto-ranking: dominated reviewers were retained or candidate order changed the receipt");
  }

  const lowExpectedCostFixer = fixer("low-expected-cost-fixer", { cost: { tier: "medium", expectedRunUsd: 0.4, retryMultiplier: 2 } });
  const higherExpectedCostFixer = fixer("higher-expected-cost-fixer", { cost: { tier: "medium", expectedRunUsd: 0.75, retryMultiplier: 1.2 } });
  const fixerReceipt = expectPass("cheapest-qualified-fixer", runSelection("fixer-ranking", registry([higherExpectedCostFixer, lowExpectedCostFixer]), "fixer", ["--allow-fixture"]));
  if (fixerReceipt.engine !== "low-expected-cost-fixer" || fixerReceipt.expectedTotalCostUsd !== 0.8) {
    throw new Error("cheapest-qualified-fixer: expected total cost was not used for ranking");
  }

  const incompleteReviewer = reviewer("incomplete-reviewer");
  delete incompleteReviewer.qualification.metrics.severityCalibration;
  expectFailure("missing-reviewer-metric", runSelection("missing-reviewer-metric", registry([incompleteReviewer]), "reviewer", ["--allow-fixture"]), "missing finite severityCalibration metric");

  const serializedNaNFixer = fixer("serialized-nan-fixer");
  serializedNaNFixer.qualification.metrics.documentationCorrectness = Number.NaN;
  expectFailure("nan-fixer-metric", runSelection("nan-fixer-metric", registry([serializedNaNFixer]), "fixer", ["--allow-fixture"]), "missing finite documentationCorrectness metric");

  const outOfRangeReviewer = reviewer("out-of-range-reviewer");
  outOfRangeReviewer.qualification.metrics.blockerPrecision = 1.1;
  expectFailure("out-of-range-reviewer-metric", runSelection("out-of-range-reviewer-metric", registry([outOfRangeReviewer]), "reviewer", ["--allow-fixture"]), "blockerPrecision metric is outside its valid range");

  const deficientSemanticReviewer = reviewer("deficient-semantic-reviewer");
  deficientSemanticReviewer.qualification.metrics.perGateRecall.semantics = 0.8;
  expectFailure("deficient-semantic-gate-recall", runSelection("deficient-semantic-gate-recall", registry([deficientSemanticReviewer]), "reviewer", ["--allow-fixture"]), "semantics gate recall below threshold");

  const marketingOnlyReviewer = reviewer("marketing-only-reviewer");
  marketingOnlyReviewer.qualification.evidence.sourceClass = "marketing-claim";
  expectFailure("unsupported-evidence-class", runSelection("unsupported-evidence-class", registry([marketingOnlyReviewer]), "reviewer", ["--allow-fixture"]), "qualification evidence class is unsupported");
  const mismatchedSourceReviewer = reviewer("mismatched-source-reviewer");
  mismatchedSourceReviewer.qualification.source = "marketing-claim";
  expectFailure("mismatched-evidence-source", runSelection("mismatched-evidence-source", registry([mismatchedSourceReviewer]), "reviewer", ["--allow-fixture"]), "qualification source must match the normalized evidence class");

  const zeroCostFixer = fixer("zero-cost-fixer", { cost: { tier: "medium", expectedRunUsd: 0, retryMultiplier: 1 } });
  expectFailure("zero-cost-fixer", runSelection("zero-cost-fixer", registry([zeroCostFixer]), "fixer", ["--allow-fixture"]), "missing expected total cost");
  const negativeRetryFixer = fixer("negative-retry-fixer", { cost: { tier: "medium", expectedRunUsd: 1, retryMultiplier: -1 } });
  expectFailure("negative-retry-fixer", runSelection("negative-retry-fixer", registry([negativeRetryFixer]), "fixer", ["--allow-fixture"]), "missing expected total cost");

  const observedNow = new Date().toISOString();
  const productionCandidate = reviewer("production-reviewer", { qualification: { ...reviewer("source").qualification, evaluatedAt: observedNow } });
  expectFailure("stale-production-registry", runSelection("stale-production-registry", registry([productionCandidate], { fixture: false, observedAt: "2020-01-01T00:00:00Z" }), "reviewer"), "registry inventory is missing, stale, or dated in the future");
  expectFailure("future-production-registry", runSelection("future-production-registry", registry([productionCandidate], { fixture: false, observedAt: "2099-01-01T00:00:00Z" }), "reviewer"), "registry inventory is missing, stale, or dated in the future");
  expectFailure("nan-registry-age", runSelection("nan-registry-age", registry([reviewer("fixture-reviewer")]), "reviewer", ["--allow-fixture", "--max-registry-age-hours", "NaN"]), "--max-registry-age-hours must be a finite positive number");
  expectFailure("nan-qualification-age", runSelection("nan-qualification-age", registry([reviewer("fixture-reviewer")]), "reviewer", ["--allow-fixture", "--max-age-days", "NaN"]), "--max-age-days must be a finite positive number");

  const costlyReviewer = reviewer("costly-reviewer", { cost: { tier: "high", expectedRunUsd: 5, retryMultiplier: 1 } });
  expectFailure("reviewer-cost-ceiling", runSelection("reviewer-cost-ceiling", registry([costlyReviewer]), "reviewer", ["--allow-fixture"]), "premium candidate requires a non-empty --premium-reason");
  const premiumReceipt = expectPass("reviewer-premium-escalation", runSelection("reviewer-premium-escalation", registry([costlyReviewer]), "reviewer", ["--allow-fixture", "--premium-reason", "production incident review"]));
  if (premiumReceipt.aboveCeiling !== true || premiumReceipt.premiumEscalation !== "production incident review" || !premiumReceipt.rationale.includes("above sustainable reviewer cost ceiling")) {
    throw new Error("reviewer-premium-escalation: receipt is not truthful about the escalation");
  }

  const extremeReviewer = reviewer("extreme-reviewer", { cost: { tier: "extreme", expectedRunUsd: 3, retryMultiplier: 1 } });
  expectFailure("extreme-premium-reason", runSelection("extreme-premium-reason", registry([extremeReviewer]), "reviewer", ["--allow-fixture"]), "premium candidate requires a non-empty --premium-reason");
  const extremeReceipt = expectPass("extreme-premium-escalation", runSelection("extreme-premium-escalation", registry([extremeReviewer]), "reviewer", ["--allow-fixture", "--premium-reason", "critical security review"]));
  if (extremeReceipt.premiumEscalation !== "critical security review" || !extremeReceipt.rationale.includes("extreme tier")) throw new Error("extreme-premium-escalation: receipt is incomplete");

  expectFailure("fixture-refusal", runSelection("fixture-refusal", registry([reviewer("fixture-refusal-reviewer")]), "reviewer"), "fixture registry cannot select production engines");
  expectFailure("repository-local-registry-refusal", runWithoutRegistry("repository-local-registry-refusal", registry([reviewer("repository-local-reviewer")]), "reviewer"), "no trusted engine registry found");
  expectFailure("explicit-candidate-registry-refusal", runCandidateLocalRegistry("explicit-candidate-registry-refusal", registry([reviewer("candidate-local-reviewer")]), "reviewer"), "candidate-repository registry files are untrusted");
  const protectedRegistryPath = join(protectedDirectory, "registry.json");
  writeFileSync(protectedRegistryPath, JSON.stringify(registry([reviewer("symlink-reviewer")])));
  const candidateToOutsideRegistry = join(candidateDirectory, "registry-link.json");
  symlinkSync(protectedRegistryPath, candidateToOutsideRegistry);
  expectFailure("selector-lexical-candidate-registry", runRegistryPath(candidateToOutsideRegistry, "reviewer", ["--allow-fixture", "--candidate-root", candidateDirectory]), "candidate-repository registry files are untrusted");
  const candidateRegistryPath = join(candidateDirectory, "registry.json");
  writeFileSync(candidateRegistryPath, JSON.stringify(registry([reviewer("canonical-symlink-reviewer")])));
  const outsideToCandidateRegistry = join(protectedDirectory, "registry-link-to-candidate.json");
  symlinkSync(candidateRegistryPath, outsideToCandidateRegistry);
  expectFailure("selector-canonical-candidate-registry", runRegistryPath(outsideToCandidateRegistry, "reviewer", ["--allow-fixture", "--candidate-root", candidateDirectory]), "candidate-repository registry files are untrusted");
  expectFailure("untrusted-registry-source", runSelection("untrusted-registry-source", registry([reviewer("untrusted-registry-reviewer")], { trust: { sourceClass: "candidate-head", identifier: "branch-local" } }), "reviewer", ["--allow-fixture"]), "registry.trust.sourceClass must be protected-harness-config or trusted-base-artifact");

  const regularFixer = fixer("regular-fixer");
  expectFailure("sensitive-fixer-refusal", runSelection("sensitive-fixer-refusal", registry([regularFixer]), "fixer", ["--allow-fixture", "--sensitive"]), "sensitive fixes require protected per-class benchmark evidence");
  const declaredSensitiveFixer = fixer("declared-sensitive-fixer", { capabilities: { ...regularFixer.capabilities, sensitiveFixes: true } });
  expectFailure("sensitive-fixer-capability-refusal", runSelection("sensitive-fixer-capability-refusal", registry([declaredSensitiveFixer]), "fixer", ["--allow-fixture", "--sensitive"]), "sensitive fixes require protected per-class benchmark evidence");
  const sensitiveFixer = fixer("sensitive-fixer", {
    capabilities: { ...regularFixer.capabilities, sensitiveFixes: true },
    qualification: {
      ...regularFixer.qualification,
      evidence: { ...regularFixer.qualification.evidence, sensitive: sensitiveEvidence() },
    },
  });
  const sensitiveReceipt = expectPass("sensitive-fixer-qualified", runSelection("sensitive-fixer-qualified", registry([sensitiveFixer]), "fixer", ["--allow-fixture", "--sensitive"]));
  if (sensitiveReceipt.engine !== "sensitive-fixer" || sensitiveReceipt.qualification.sensitive.classMetrics.auth.firstPassAcceptance !== 0.8) throw new Error("sensitive-fixer-qualified: selected the wrong correction lane or omitted class proof");
  const authOnlyReceipt = expectPass("sensitive-fixer-auth-subset", runSelection("sensitive-fixer-auth-subset", registry([sensitiveFixer]), "fixer", ["--allow-fixture", "--sensitive", "--sensitive-class", "auth"]));
  if (JSON.stringify(authOnlyReceipt.qualification.sensitive.requiredClasses) !== JSON.stringify(["auth"])) throw new Error("sensitive-fixer-auth-subset: explicit requested subset was not preserved");
  const authOnlyFixer = fixer("auth-only-fixer", {
    qualification: {
      ...regularFixer.qualification,
      evidence: { ...regularFixer.qualification.evidence, sensitive: sensitiveEvidence(["auth"]) },
    },
  });
  expectFailure("sensitive-fixer-missing-required-class", runSelection("sensitive-fixer-missing-required-class", registry([authOnlyFixer]), "fixer", ["--allow-fixture", "--sensitive"]), "sensitive fix evidence is missing tenancy class metrics");
  expectPass("sensitive-fixer-explicit-class", runSelection("sensitive-fixer-explicit-class", registry([authOnlyFixer]), "fixer", ["--allow-fixture", "--sensitive", "--sensitive-class", "auth"]));
  expectFailure("sensitive-class-without-sensitive", runSelection("sensitive-class-without-sensitive", registry([regularFixer]), "fixer", ["--allow-fixture", "--sensitive-class", "auth"]), "--sensitive-class requires --sensitive");
  expectFailure("unknown-sensitive-class", runSelection("unknown-sensitive-class", registry([regularFixer]), "fixer", ["--allow-fixture", "--sensitive", "--sensitive-class", "permissions"]), "--sensitive-class must be one of");
  expectFailure("sensitive-reviewer-refusal", runSelection("sensitive-reviewer-refusal", registry([reviewer("sensitive-reviewer")]), "reviewer", ["--allow-fixture", "--sensitive"]), "--sensitive is only valid for fixer selection");

  // Low-entropy fixture: intentionally not JWT/token-shaped so secret scanners ignore it.
  const fixtureSecretMarker = "TEST_FIXTURE_SECRET_VALUE";
  const secretReceiptFixer = fixer("private-engine", {
    harness: "private-harness",
    modelId: fixtureSecretMarker,
    capabilities: { ...regularFixer.capabilities, toolAccess: ["git", "/private/protected/tool"] },
    qualification: {
      ...regularFixer.qualification,
      evidence: {
        ...regularFixer.qualification.evidence,
        artifactLocator: "/private/protected/corpus.json",
        secret: fixtureSecretMarker,
        trust: { identifier: "/private/protected/ledger" },
        sensitive: { ...sensitiveEvidence(["auth"]), artifactLocator: "/private/protected/sensitive-corpus.json", protectedLocator: "s3://private/corpus" },
      },
    },
  });
  const secretReceipt = expectPass("sensitive-receipt-allowlist", runSelection("sensitive-receipt-allowlist", registry([secretReceiptFixer]), "fixer", ["--allow-fixture", "--sensitive", "--sensitive-class", "auth"]));
  const serializedSecretReceipt = JSON.stringify(secretReceipt);
  for (const forbidden of [fixtureSecretMarker, "/private/protected", "s3://private", "artifactLocator", "protectedLocator", "secret", "trust", "private-engine", "private-harness"]) {
    if (serializedSecretReceipt.includes(forbidden)) throw new Error(`sensitive-receipt-allowlist: leaked ${forbidden}`);
  }

  const contextLimitedReviewer = reviewer("context-limited-reviewer", { capabilities: { ...reviewer("source").capabilities, contextTokens: 32000 } });
  expectFailure("context-capacity-refusal", runSelection("context-capacity-refusal", registry([contextLimitedReviewer]), "reviewer", ["--allow-fixture", "--required-context-tokens", "64000"]), "context capacity below required 64000 tokens");
  const repositoryLimitedReviewer = reviewer("repository-limited-reviewer", { capabilities: { ...reviewer("source").capabilities, repositoryAccess: false } });
  expectFailure("repository-access-refusal", runSelection("repository-access-refusal", registry([repositoryLimitedReviewer]), "reviewer", ["--allow-fixture", "--require-repository-access"]), "required repository access unavailable");
  const toolLimitedReviewer = reviewer("tool-limited-reviewer", { capabilities: { ...reviewer("source").capabilities, toolAccess: ["git"] } });
  expectFailure("tool-access-refusal", runSelection("tool-access-refusal", registry([toolLimitedReviewer]), "reviewer", ["--allow-fixture", "--required-tool", "rg"]), "required tool access unavailable: rg");

  const selfTest = runSelection("self-test", registry([reviewer("self-test-reviewer")]), "reviewer", ["--allow-fixture", "--self-test"]);
  if (!selfTest.ok || !selfTest.output.includes("incomplete reviewer and fixer registries fail closed")) throw new Error("selector-self-test: expected both incomplete registries to fail closed");
  console.log("PASS engine-selection");
} finally {
  for (const directory of [candidateDirectory, protectedDirectory]) {
    for (const entry of readdirSync(directory)) unlinkSync(join(directory, entry));
    rmdirSync(directory);
  }
  for (const entry of readdirSync(testDirectory)) unlinkSync(join(testDirectory, entry));
  rmdirSync(testDirectory);
}
