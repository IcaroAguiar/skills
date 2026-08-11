#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, isAbsolute, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const VALID_ROLES = ["reviewer", "fixer"];
const VALID_RISKS = ["low", "medium", "high", "critical"];
const CODEX_DEFAULT_ENGINE_POLICY = {
  reviewer: { modelId: "gpt-5.6-sol", reasoningModes: ["high"] },
  fixer: { modelId: "gpt-5.6-luna", reasoningModes: ["xhigh", "max"] },
};
const MILLISECONDS_PER_DAY = 86_400_000;
const DEFAULT_MAX_QUALIFICATION_AGE_DAYS = 180;
const DEFAULT_MAX_REGISTRY_AGE_HOURS = 24;
const MAX_CLOCK_SKEW_HOURS = 1;
const REVIEWER_THRESHOLDS = {
  knownFindingRecall: 0.85,
  blockerPrecision: 0.6,
  criticalHighEscapes: 0,
  fiveGateReceiptRate: 1,
  acceptedFalseBlockerRate: 0.2,
  severityCalibration: 0.8,
};
const REVIEWER_GATE_RECALL_THRESHOLDS = {
  criticalHighCorrectness: 0.85,
  simplification: 0.85,
  semantics: 0.85,
  documentation: 0.85,
};
const FIXER_THRESHOLDS = {
  firstPassAcceptance: 0.75,
  criticalRegressions: 0,
  scopeCreepRate: 0.1,
  documentationCorrectness: 0.8,
  escalationCompliance: 1,
};
const REVIEWER_SCORE_WEIGHTS = {
  knownFindingRecall: 0.36,
  blockerPrecision: 0.2,
  severityCalibration: 0.12,
  acceptedFalseBlockerRate: 0.12,
  perGateRecall: 0.2,
};
const SUPPORTED_EVIDENCE_CLASSES = new Set([
  "review-loop-real-diff",
  "recognized-harness-review-benchmark",
]);
const TRUSTED_REGISTRY_SOURCE_CLASSES = new Set([
  "protected-harness-config",
  "trusted-base-artifact",
]);
const REVIEWER_EVIDENCE_METRICS = [
  "knownFindingRecall",
  "blockerPrecision",
  "criticalHighEscapes",
  "fiveGateReceiptRate",
  "acceptedFalseBlockerRate",
  "severityCalibration",
  ...Object.keys(REVIEWER_GATE_RECALL_THRESHOLDS).map((gate) => `perGateRecall.${gate}`),
];
const FIXER_EVIDENCE_METRICS = [
  "firstPassAcceptance",
  "criticalRegressions",
  "scopeCreepRate",
  "documentationCorrectness",
  "escalationCompliance",
];
const SENSITIVE_FIX_CLASSES = [
  "auth",
  "tenancy",
  "credentials",
  "migrations",
  "transactions",
  "concurrency",
  "public-contracts-ops",
];
const SENSITIVE_FIX_EVIDENCE_METRICS = [
  "firstPassAcceptance",
  "criticalRegressions",
  "scopeCreepRate",
  "escalationCompliance",
];
const SENSITIVE_FIXER_THRESHOLDS = {
  firstPassAcceptance: FIXER_THRESHOLDS.firstPassAcceptance,
  criticalRegressions: FIXER_THRESHOLDS.criticalRegressions,
  scopeCreepRate: FIXER_THRESHOLDS.scopeCreepRate,
  escalationCompliance: FIXER_THRESHOLDS.escalationCompliance,
};
const SUPPORTED_SENSITIVE_EVIDENCE_CLASSES = new Set([
  "protected-sensitive-fix-corpus",
]);
const SHA256_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const RECEIPT_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;

function option(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function has(name) {
  return args.includes(name);
}

function die(message) {
  console.error(`review-loop engine selection failed: ${message}`);
  process.exit(1);
}

function isInside(root, path) {
  const local = relative(root, path);
  return !local || (!local.startsWith("..") && !isAbsolute(local));
}

if (has("--help")) {
  console.log(`review-loop engine selection

Usage:
  node select-review-engines.mjs --registry <file> --role reviewer|fixer --risk low|medium|high|critical [--harness <name>] [--premium-reason <reason>] [--json]
    [--candidate-root <repo>] [--required-context-tokens <integer>]
    [--require-repository-access] [--required-tool <name>]
    [--sensitive [--sensitive-class <auth|tenancy|credentials|migrations|transactions|concurrency|public-contracts-ops>]]
  node select-review-engines.mjs --registry <fixture> --role reviewer --allow-fixture --self-test

Registry discovery order:
  --registry, REVIEW_LOOP_ENGINE_REGISTRY, then the protected user
  configuration directory. Candidate-repository files are never discovered.

The active harness must populate the registry from the engines it actually
exposes. The selector ranks only observed and benchmark-qualified candidates.`);
  process.exit(0);
}

const role = option("--role");
const risk = option("--risk", "medium");
if (!VALID_ROLES.includes(role)) die("--role must be reviewer or fixer");
if (!VALID_RISKS.includes(risk)) die("--risk must be low, medium, high, or critical");

const explicitRegistryPath = option("--registry");
const registryCandidates = explicitRegistryPath
  ? [explicitRegistryPath]
  : [process.env.REVIEW_LOOP_ENGINE_REGISTRY, resolve(homedir(), ".config", "review-loop", "engines.json")].filter(Boolean);
const registryPath = registryCandidates.find((candidate) => existsSync(candidate));
if (!registryPath) {
  die("no trusted engine registry found; provide --registry for a trusted base artifact or export protected harness inventory");
}
const candidateRootLexical = resolve(option("--candidate-root", process.cwd()));
if (!existsSync(candidateRootLexical)) die("--candidate-root must exist");
const candidateRootCanonical = realpathSync.native(candidateRootLexical);
const registryLexicalPath = resolve(registryPath);
const registryCanonicalPath = realpathSync.native(registryLexicalPath);
if (isInside(candidateRootLexical, registryLexicalPath) || isInside(candidateRootCanonical, registryCanonicalPath)) {
  die("candidate-repository registry files are untrusted; use protected harness/user config or an extracted trusted-base artifact");
}

let registry;
try {
  registry = JSON.parse(readFileSync(registryPath, "utf8"));
} catch (error) {
  die(`cannot parse ${registryPath}: ${error.message}`);
}

if (!Array.isArray(registry.candidates) || registry.candidates.length === 0) {
  die("registry.candidates must be a non-empty array");
}
const observedHarnesses = [...new Set(registry.candidates.map((candidate) => candidate.harness).filter(Boolean))];
const requestedHarness = option("--harness").trim();
if (!requestedHarness && observedHarnesses.length !== 1) {
  die("registry contains multiple or unobservable harnesses; provide --harness from protected runtime state");
}
const activeHarness = requestedHarness || observedHarnesses[0];
if (!observedHarnesses.includes(activeHarness)) die(`active harness ${activeHarness} is absent from the protected registry`);
const registryTrust = registry.trust;
if (!registryTrust || typeof registryTrust !== "object" || Array.isArray(registryTrust)) {
  die("registry.trust must declare a protected source class and identifier");
}
if (!TRUSTED_REGISTRY_SOURCE_CLASSES.has(registryTrust.sourceClass)) {
  die("registry.trust.sourceClass must be protected-harness-config or trusted-base-artifact");
}
if (typeof registryTrust.identifier !== "string" || !registryTrust.identifier.trim()) {
  die("registry.trust.identifier must be non-empty");
}
if (registry.fixture === true && !has("--allow-fixture")) {
  die("fixture registry cannot select production engines; --allow-fixture is test-only");
}
const registryObservedAt = Date.parse(registry.observedAt ?? "");
const maxRegistryAgeHours = positiveFiniteOption("--max-registry-age-hours", DEFAULT_MAX_REGISTRY_AGE_HOURS);
const registryAgeHours = (Date.now() - registryObservedAt) / (MILLISECONDS_PER_DAY / 24);
if (registry.fixture !== true && (!Number.isFinite(registryObservedAt) || registryAgeHours > maxRegistryAgeHours || registryAgeHours < -MAX_CLOCK_SKEW_HOURS)) {
  die("registry inventory is missing, stale, or dated in the future; refresh it from the active harness");
}
const ceiling = Number(registry.policy?.reviewerCostCeilingUsd);
if (role === "reviewer" && (!Number.isFinite(ceiling) || ceiling <= 0)) {
  die("policy.reviewerCostCeilingUsd must be a positive number");
}

const maxAgeDays = positiveFiniteOption("--max-age-days", DEFAULT_MAX_QUALIFICATION_AGE_DAYS);
const requiredContextTokens = nonNegativeSafeIntegerOption("--required-context-tokens", 0);
const requiredRepositoryAccess = has("--require-repository-access");
const requiredTools = repeatedNonEmptyOptions("--required-tool");
const sensitiveFixesRequested = has("--sensitive");
const requestedSensitiveClasses = repeatedNonEmptyOptions("--sensitive-class");
if (sensitiveFixesRequested && role !== "fixer") die("--sensitive is only valid for fixer selection");
if (requestedSensitiveClasses.length > 0 && !sensitiveFixesRequested) die("--sensitive-class requires --sensitive");
if (requestedSensitiveClasses.some((sensitiveClass) => !SENSITIVE_FIX_CLASSES.includes(sensitiveClass))) {
  die(`--sensitive-class must be one of ${SENSITIVE_FIX_CLASSES.join(", ")}`);
}
const requiredSensitiveClasses = sensitiveFixesRequested
  ? [...new Set(requestedSensitiveClasses.length > 0 ? requestedSensitiveClasses : SENSITIVE_FIX_CLASSES)]
  : [];
const now = Date.now();
const rejections = [];
const premiumEscalation = option("--premium-reason").trim();

function positiveFiniteOption(name, fallback) {
  const value = Number(option(name, String(fallback)));
  if (!Number.isFinite(value) || value <= 0) die(`${name} must be a finite positive number`);
  return value;
}

function nonNegativeSafeIntegerOption(name, fallback) {
  const value = Number(option(name, String(fallback)));
  if (!Number.isSafeInteger(value) || value < 0) die(`${name} must be a non-negative safe integer`);
  return value;
}

function repeatedNonEmptyOptions(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (!value || value.startsWith("--")) die(`${name} requires a non-empty value`);
    values.push(value);
    index += 1;
  }
  return values;
}

function reject(candidate, reason) {
  rejections.push({ id: receiptIdentifier(candidate.id), reason });
  return false;
}

function matchesHarnessPolicy(candidate) {
  if (candidate.harness !== activeHarness) return reject(candidate, `belongs to inactive harness ${candidate.harness ?? "not_observable"}`);
  if (activeHarness !== "codex") return true;
  const required = CODEX_DEFAULT_ENGINE_POLICY[role];
  if (candidate.modelId !== required.modelId || !required.reasoningModes.includes(candidate.reasoningMode)) {
    return reject(candidate, `Codex ${role} default requires ${required.modelId} with reasoning ${required.reasoningModes.join("|")}`);
  }
  return true;
}

function receiptIdentifier(value) {
  if (
    typeof value === "string" &&
    RECEIPT_ID_PATTERN.test(value) &&
    !/^eyJ[a-z0-9_-]*\.[a-z0-9_-]+\.[a-z0-9_-]+$/i.test(value) &&
    !/(credential|jwt|key|password|private|secret|token)/i.test(value)
  ) return value;
  return `sha256:${createHash("sha256").update(String(value ?? "not_observable")).digest("hex")}`;
}

function identifierHash(value) {
  return `sha256:${createHash("sha256").update(String(value ?? "")).digest("hex")}`;
}

function expectedCost(candidate) {
  const run = candidate.cost?.expectedRunUsd;
  const retry = candidate.cost?.retryMultiplier;
  return typeof run === "number" && Number.isFinite(run) && run > 0 && typeof retry === "number" && Number.isFinite(retry) && retry > 0
    ? run * retry
    : Number.POSITIVE_INFINITY;
}

function requiresPremiumEscalation(candidate) {
  return candidate.cost?.tier === "extreme" || (role === "reviewer" && expectedCost(candidate) > ceiling);
}

function isFresh(candidate) {
  if (registry.fixture === true) return true;
  const timestamp = Date.parse(candidate.qualification?.evaluatedAt ?? "");
  if (!Number.isFinite(timestamp)) return false;
  const ageDays = (now - timestamp) / MILLISECONDS_PER_DAY;
  return ageDays >= -(MAX_CLOCK_SKEW_HOURS / 24) && ageDays <= maxAgeDays;
}

function isEvidenceFresh(evidence) {
  const observedAt = Date.parse(evidence?.observedAt ?? "");
  if (!Number.isFinite(observedAt)) return false;
  if (registry.fixture === true) return true;
  const ageDays = (now - observedAt) / MILLISECONDS_PER_DAY;
  return ageDays >= -(MAX_CLOCK_SKEW_HOURS / 24) && ageDays <= maxAgeDays;
}

function evidenceSupportsRequiredMetrics(candidate, targetRole) {
  const evidence = candidate.qualification?.evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return reject(candidate, "missing normalized qualification evidence");
  if (!SUPPORTED_EVIDENCE_CLASSES.has(evidence.sourceClass)) return reject(candidate, "qualification evidence class is unsupported");
  if (candidate.qualification?.source !== evidence.sourceClass) return reject(candidate, "qualification source must match the normalized evidence class");
  if (typeof evidence.corpusId !== "string" || !evidence.corpusId.trim()) return reject(candidate, "qualification evidence is missing corpus identity");
  if (typeof evidence.artifactLocator !== "string" || !evidence.artifactLocator.trim()) return reject(candidate, "qualification evidence is missing artifact locator");
  if (typeof evidence.artifactFingerprint !== "string" || !SHA256_FINGERPRINT_PATTERN.test(evidence.artifactFingerprint)) return reject(candidate, "qualification evidence is missing a SHA-256 artifact fingerprint");
  if (!isEvidenceFresh(evidence)) return reject(candidate, "qualification evidence is missing or stale");
  const requiredMetrics = targetRole === "reviewer" ? REVIEWER_EVIDENCE_METRICS : FIXER_EVIDENCE_METRICS;
  if (!Array.isArray(evidence.metricNames) || requiredMetrics.some((metric) => !evidence.metricNames.includes(metric))) {
    return reject(candidate, "qualification evidence does not substantiate every required metric");
  }
  return true;
}

function sensitiveEvidenceSupportsRequiredClasses(candidate) {
  if (!sensitiveFixesRequested) return true;
  const evidence = candidate.qualification?.evidence?.sensitive;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return reject(candidate, "sensitive fixes require protected per-class benchmark evidence");
  if (!SUPPORTED_SENSITIVE_EVIDENCE_CLASSES.has(evidence.sourceClass)) return reject(candidate, "sensitive fix evidence class is unsupported");
  if (typeof evidence.corpusId !== "string" || !evidence.corpusId.trim()) return reject(candidate, "sensitive fix evidence is missing corpus identity");
  if (typeof evidence.artifactFingerprint !== "string" || !SHA256_FINGERPRINT_PATTERN.test(evidence.artifactFingerprint)) return reject(candidate, "sensitive fix evidence is missing a SHA-256 artifact fingerprint");
  if (!isEvidenceFresh(evidence)) return reject(candidate, "sensitive fix evidence is missing or stale");
  const classMetrics = evidence.classMetrics;
  if (!classMetrics || typeof classMetrics !== "object" || Array.isArray(classMetrics)) return reject(candidate, "sensitive fix evidence is missing per-class metrics");
  for (const sensitiveClass of requiredSensitiveClasses) {
    const metrics = classMetrics[sensitiveClass];
    if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return reject(candidate, `sensitive fix evidence is missing ${sensitiveClass} class metrics`);
    const values = Object.fromEntries(SENSITIVE_FIX_EVIDENCE_METRICS.map((metric) => [
      metric,
      requiredMetric(candidate, metrics, metric, {
        min: 0,
        max: metric === "criticalRegressions" ? Number.MAX_SAFE_INTEGER : 1,
        integer: metric === "criticalRegressions",
        label: `${sensitiveClass}.${metric}`,
      }),
    ]));
    if (Object.values(values).some((value) => value === undefined)) return false;
    if (values.firstPassAcceptance < SENSITIVE_FIXER_THRESHOLDS.firstPassAcceptance) return reject(candidate, `${sensitiveClass} first-pass acceptance below threshold`);
    if (values.criticalRegressions !== SENSITIVE_FIXER_THRESHOLDS.criticalRegressions) return reject(candidate, `${sensitiveClass} known critical regression`);
    if (values.scopeCreepRate > SENSITIVE_FIXER_THRESHOLDS.scopeCreepRate) return reject(candidate, `${sensitiveClass} scope-creep rate above threshold`);
    if (values.escalationCompliance < SENSITIVE_FIXER_THRESHOLDS.escalationCompliance) return reject(candidate, `${sensitiveClass} unsafe escalation behavior`);
  }
  return true;
}

function hasCommonQualification(candidate, targetRole = role) {
  if (!candidate.id || !candidate.harness) return reject(candidate, "missing identity or harness");
  if (typeof candidate.modelId !== "string" || !candidate.modelId.trim()) return reject(candidate, "missing observed model identity or not_observable");
  if (!candidate.roles?.includes(targetRole)) return reject(candidate, `does not expose ${targetRole}`);
  if (candidate.qualification?.status !== "qualified") return reject(candidate, "not benchmark-qualified");
  if (!candidate.qualification?.source || !candidate.qualification?.evaluatedAt) return reject(candidate, "missing qualification source/date");
  if (!isFresh(candidate)) return reject(candidate, "qualification is missing or stale");
  if (!evidenceSupportsRequiredMetrics(candidate, targetRole)) return false;
  if (!candidate.capabilities?.risks?.includes(risk)) return reject(candidate, `does not cover ${risk} risk`);
  const contextTokens = candidate.capabilities?.contextTokens;
  if (!Number.isSafeInteger(contextTokens) || contextTokens <= 0) return reject(candidate, "missing normalized context capacity");
  if (typeof candidate.capabilities?.repositoryAccess !== "boolean") return reject(candidate, "missing normalized repository access capability");
  if (!Array.isArray(candidate.capabilities?.toolAccess) || candidate.capabilities.toolAccess.some((tool) => typeof tool !== "string" || !tool)) return reject(candidate, "missing normalized tool access capability");
  if (contextTokens < requiredContextTokens) return reject(candidate, `context capacity below required ${requiredContextTokens} tokens`);
  if (requiredRepositoryAccess && !candidate.capabilities.repositoryAccess) return reject(candidate, "required repository access unavailable");
  const missingTools = requiredTools.filter((tool) => !candidate.capabilities.toolAccess.includes(tool));
  if (missingTools.length > 0) return reject(candidate, `required tool access unavailable: ${missingTools.join(", ")}`);
  if (!Number.isFinite(expectedCost(candidate))) return reject(candidate, "missing expected total cost");
  return true;
}

function requiredMetric(candidate, metrics, name, { min = 0, max = 1, integer = false, label = name } = {}) {
  const value = metrics[name];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    reject(candidate, `missing finite ${label} metric`);
    return undefined;
  }
  if (value < min || value > max || (integer && !Number.isInteger(value))) {
    reject(candidate, `${label} metric is outside its valid range`);
    return undefined;
  }
  return value;
}

function qualifiesReviewer(candidate) {
  if (!hasCommonQualification(candidate, "reviewer")) return false;
  const metrics = candidate.qualification.metrics ?? {};
  const knownFindingRecall = requiredMetric(candidate, metrics, "knownFindingRecall");
  const blockerPrecision = requiredMetric(candidate, metrics, "blockerPrecision");
  const criticalHighEscapes = requiredMetric(candidate, metrics, "criticalHighEscapes", { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true });
  const fiveGateReceiptRate = requiredMetric(candidate, metrics, "fiveGateReceiptRate");
  const acceptedFalseBlockerRate = requiredMetric(candidate, metrics, "acceptedFalseBlockerRate");
  const severityCalibration = requiredMetric(candidate, metrics, "severityCalibration");
  const perGateRecall = metrics.perGateRecall;
  if (!perGateRecall || typeof perGateRecall !== "object" || Array.isArray(perGateRecall)) return reject(candidate, "missing perGateRecall metrics");
  const gateRecallValues = Object.fromEntries(Object.keys(REVIEWER_GATE_RECALL_THRESHOLDS).map((gate) => [
    gate,
    requiredMetric(candidate, perGateRecall, gate, { label: `perGateRecall.${gate}` }),
  ]));
  if ([knownFindingRecall, blockerPrecision, criticalHighEscapes, fiveGateReceiptRate, acceptedFalseBlockerRate, severityCalibration, ...Object.values(gateRecallValues)].some((value) => value === undefined)) return false;
  if (!candidate.capabilities?.readOnly || !candidate.capabilities?.freshContext) return reject(candidate, "reviewer isolation unavailable");
  if (criticalHighEscapes !== REVIEWER_THRESHOLDS.criticalHighEscapes) return reject(candidate, "known critical/high escape");
  if (knownFindingRecall < REVIEWER_THRESHOLDS.knownFindingRecall) return reject(candidate, "known-finding recall below threshold");
  if (blockerPrecision < REVIEWER_THRESHOLDS.blockerPrecision) return reject(candidate, "blocker precision below threshold");
  if (fiveGateReceiptRate < REVIEWER_THRESHOLDS.fiveGateReceiptRate) return reject(candidate, "five-gate receipt incomplete");
  if (acceptedFalseBlockerRate > REVIEWER_THRESHOLDS.acceptedFalseBlockerRate) return reject(candidate, "accepted-state false blockers above threshold");
  if (severityCalibration < REVIEWER_THRESHOLDS.severityCalibration) return reject(candidate, "severity calibration below threshold");
  for (const [gate, threshold] of Object.entries(REVIEWER_GATE_RECALL_THRESHOLDS)) {
    if (gateRecallValues[gate] < threshold) return reject(candidate, `${gate} gate recall below threshold`);
  }
  if (requiresPremiumEscalation(candidate) && !premiumEscalation) return reject(candidate, "premium candidate requires a non-empty --premium-reason");
  return true;
}

function qualifiesFixer(candidate) {
  if (!hasCommonQualification(candidate, "fixer")) return false;
  const metrics = candidate.qualification.metrics ?? {};
  const firstPassAcceptance = requiredMetric(candidate, metrics, "firstPassAcceptance");
  const criticalRegressions = requiredMetric(candidate, metrics, "criticalRegressions", { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true });
  const scopeCreepRate = requiredMetric(candidate, metrics, "scopeCreepRate");
  const documentationCorrectness = requiredMetric(candidate, metrics, "documentationCorrectness");
  const escalationCompliance = requiredMetric(candidate, metrics, "escalationCompliance");
  if ([firstPassAcceptance, criticalRegressions, scopeCreepRate, documentationCorrectness, escalationCompliance].some((value) => value === undefined)) return false;
  if (!candidate.capabilities?.workspaceWrite) return reject(candidate, "workspace-write unavailable");
  if (criticalRegressions !== FIXER_THRESHOLDS.criticalRegressions) return reject(candidate, "known critical regression");
  if (firstPassAcceptance < FIXER_THRESHOLDS.firstPassAcceptance) return reject(candidate, "first-pass acceptance below threshold");
  if (scopeCreepRate > FIXER_THRESHOLDS.scopeCreepRate) return reject(candidate, "scope-creep rate above threshold");
  if (documentationCorrectness < FIXER_THRESHOLDS.documentationCorrectness) return reject(candidate, "documentation correctness below threshold");
  if (escalationCompliance < FIXER_THRESHOLDS.escalationCompliance) return reject(candidate, "unsafe escalation behavior");
  if (!sensitiveEvidenceSupportsRequiredClasses(candidate)) return false;
  if (requiresPremiumEscalation(candidate) && !premiumEscalation) return reject(candidate, "premium candidate requires a non-empty --premium-reason");
  return true;
}

function selfTestCandidate(overrides = {}) {
  return {
    id: "self-test-engine",
    harness: "self-test",
    modelId: "not_observable",
    roles: ["reviewer", "fixer"],
    capabilities: {
      readOnly: true,
      freshContext: true,
      workspaceWrite: true,
      contextTokens: 128000,
      repositoryAccess: true,
      toolAccess: ["git", "rg"],
      risks: VALID_RISKS,
    },
    cost: { tier: "medium", expectedRunUsd: 1, retryMultiplier: 1 },
    qualification: {
      status: "qualified",
      source: "review-loop-real-diff",
      evaluatedAt: "2026-08-09",
      evidence: {
        sourceClass: "review-loop-real-diff",
        corpusId: "selector-self-test-v1",
        artifactLocator: "self-test://selector",
        artifactFingerprint: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        observedAt: "2026-08-09",
        metricNames: [...REVIEWER_EVIDENCE_METRICS, ...FIXER_EVIDENCE_METRICS],
      },
      metrics: {
        knownFindingRecall: 0.9,
        blockerPrecision: 0.8,
        criticalHighEscapes: 0,
        fiveGateReceiptRate: 1,
        acceptedFalseBlockerRate: 0.1,
        severityCalibration: 0.9,
        perGateRecall: {
          criticalHighCorrectness: 0.9,
          simplification: 0.9,
          semantics: 0.9,
          documentation: 0.9,
        },
        firstPassAcceptance: 0.8,
        criticalRegressions: 0,
        scopeCreepRate: 0.05,
        documentationCorrectness: 0.9,
        escalationCompliance: 1,
      },
    },
    ...overrides,
  };
}

function verifyFailClosed() {
  const reviewer = selfTestCandidate();
  delete reviewer.qualification.metrics.severityCalibration;
  const fixer = selfTestCandidate();
  delete fixer.qualification.metrics.documentationCorrectness;
  const reviewerStart = rejections.length;
  if (qualifiesReviewer(reviewer)) die("self-test expected incomplete reviewer registry to fail closed");
  const reviewerRejections = rejections.slice(reviewerStart);
  if (!reviewerRejections.some(({ reason }) => reason.includes("severityCalibration"))) {
    die("self-test did not identify the incomplete reviewer metric");
  }
  const fixerStart = rejections.length;
  if (qualifiesFixer(fixer)) die("self-test expected incomplete fixer registry to fail closed");
  const fixerRejections = rejections.slice(fixerStart);
  if (!fixerRejections.some(({ reason }) => reason.includes("documentationCorrectness"))) {
    die("self-test did not identify the incomplete fixer metric");
  }
  console.log("review-loop selector self-test passed: incomplete reviewer and fixer registries fail closed");
  process.exit(0);
}

if (has("--self-test")) verifyFailClosed();

const qualifiesRole = role === "reviewer" ? qualifiesReviewer : qualifiesFixer;
const qualified = registry.candidates.filter((candidate) => matchesHarnessPolicy(candidate) && qualifiesRole(candidate));
if (qualified.length === 0) {
  const detail = rejections.map(({ id, reason }) => `${id}: ${reason}`).join("; ");
  die(`no qualified ${role} for ${risk} risk${detail ? ` (${detail})` : ""}`);
}

function reviewerScore(candidate) {
  const metrics = candidate.qualification.metrics;
  const averageGateRecall = Object.keys(REVIEWER_GATE_RECALL_THRESHOLDS)
    .reduce((total, gate) => total + metrics.perGateRecall[gate], 0) / Object.keys(REVIEWER_GATE_RECALL_THRESHOLDS).length;
  return (
    metrics.knownFindingRecall * REVIEWER_SCORE_WEIGHTS.knownFindingRecall +
    metrics.blockerPrecision * REVIEWER_SCORE_WEIGHTS.blockerPrecision +
    metrics.severityCalibration * REVIEWER_SCORE_WEIGHTS.severityCalibration +
    (1 - metrics.acceptedFalseBlockerRate) * REVIEWER_SCORE_WEIGHTS.acceptedFalseBlockerRate +
    averageGateRecall * REVIEWER_SCORE_WEIGHTS.perGateRecall
  );
}

function reviewerCapabilityVector(candidate) {
  const metrics = candidate.qualification.metrics;
  return [
    metrics.knownFindingRecall,
    metrics.blockerPrecision,
    metrics.severityCalibration,
    1 - metrics.acceptedFalseBlockerRate,
    ...Object.keys(REVIEWER_GATE_RECALL_THRESHOLDS).map((gate) => metrics.perGateRecall[gate]),
  ];
}

function dominatesReviewer(left, right) {
  const leftMetrics = reviewerCapabilityVector(left);
  const rightMetrics = reviewerCapabilityVector(right);
  return leftMetrics.every((value, index) => value >= rightMetrics[index]) && leftMetrics.some((value, index) => value > rightMetrics[index]);
}

function candidateKey(candidate) {
  return [candidate.harness, candidate.id, candidate.modelId, candidate.reasoningMode ?? "not_observable"].join("\u001f");
}

function compareCandidates(left, right) {
  if (role === "fixer") {
    return expectedCost(left) - expectedCost(right) ||
      Number(right.qualification.metrics.firstPassAcceptance) - Number(left.qualification.metrics.firstPassAcceptance) ||
      candidateKey(left).localeCompare(candidateKey(right));
  }
  return reviewerScore(right) - reviewerScore(left) || expectedCost(left) - expectedCost(right) || candidateKey(left).localeCompare(candidateKey(right));
}

const ranked = role === "reviewer"
  ? qualified.filter((candidate) => {
    const dominator = qualified
      .filter((other) => other !== candidate && dominatesReviewer(other, candidate))
      .sort(compareCandidates)[0];
    if (!dominator) return true;
    rejections.push({ id: receiptIdentifier(candidate.id), reason: `Pareto-dominated reviewer capability by ${receiptIdentifier(dominator.id)}` });
    return false;
  })
  : qualified;
ranked.sort(compareCandidates);

const selected = ranked[0];
const selectedAboveCeiling = role === "reviewer" && expectedCost(selected) > ceiling;
const selectedExtremeTier = selected.cost?.tier === "extreme";
const receipt = {
  status: "selected",
  role,
  risk,
  defaultPolicy: activeHarness === "codex" ? {
    enforced: true,
    modelId: CODEX_DEFAULT_ENGINE_POLICY[role].modelId,
    allowedReasoningModes: CODEX_DEFAULT_ENGINE_POLICY[role].reasoningModes,
  } : { enforced: false },
  registry: {
    sourceClass: registryTrust.sourceClass,
    identifierHash: identifierHash(registryTrust.identifier || basename(registryPath)),
  },
  harness: receiptIdentifier(selected.harness),
  engine: receiptIdentifier(selected.id),
  modelId: receiptIdentifier(selected.modelId),
  reasoningMode: receiptIdentifier(selected.reasoningMode ?? "not_observable"),
  qualification: {
    source: selected.qualification.source,
    evaluatedAt: selected.qualification.evaluatedAt,
    perGateRecall: role === "reviewer" ? selected.qualification.metrics.perGateRecall : null,
    evidence: {
      sourceClass: selected.qualification.evidence.sourceClass,
      corpusIdHash: identifierHash(selected.qualification.evidence.corpusId),
      artifactFingerprint: selected.qualification.evidence.artifactFingerprint,
      observedAt: selected.qualification.evidence.observedAt,
    },
    ...(sensitiveFixesRequested ? {
      sensitive: {
        requiredClasses: requiredSensitiveClasses,
        sourceClass: selected.qualification.evidence.sensitive.sourceClass,
        corpusIdHash: identifierHash(selected.qualification.evidence.sensitive.corpusId),
        artifactFingerprint: selected.qualification.evidence.sensitive.artifactFingerprint,
        observedAt: selected.qualification.evidence.sensitive.observedAt,
        classMetrics: Object.fromEntries(requiredSensitiveClasses.map((sensitiveClass) => [
          sensitiveClass,
          Object.fromEntries(SENSITIVE_FIX_EVIDENCE_METRICS.map((metric) => [
            metric,
            selected.qualification.evidence.sensitive.classMetrics[sensitiveClass][metric],
          ])),
        ])),
      },
    } : {}),
  },
  observedCapabilities: {
    contextTokens: selected.capabilities.contextTokens,
    repositoryAccess: selected.capabilities.repositoryAccess,
    toolAccess: selected.capabilities.toolAccess.map(receiptIdentifier),
  },
  expectedTotalCostUsd: expectedCost(selected),
  costCeilingUsd: role === "reviewer" ? ceiling : null,
  aboveCeiling: selectedAboveCeiling,
  premiumEscalation: selectedExtremeTier || selectedAboveCeiling ? premiumEscalation : null,
  rationale: selectedExtremeTier || selectedAboveCeiling
    ? `selected through explicit premium escalation (${premiumEscalation})${selectedExtremeTier ? "; extreme tier" : ""}${selectedAboveCeiling ? "; above sustainable reviewer cost ceiling" : ""}`
    : activeHarness === "codex"
      ? `required Codex ${role} default; ranked within the protected ${CODEX_DEFAULT_ENGINE_POLICY[role].modelId} reasoning policy`
    : role === "reviewer"
      ? "highest qualified capability inside the sustainable cost ceiling"
      : "lowest expected total cost among qualified capable fixers",
  rejected: rejections.sort((left, right) => left.id.localeCompare(right.id) || left.reason.localeCompare(right.reason)),
  qualifiedAlternatives: ranked.slice(1).map((candidate) => ({
    id: receiptIdentifier(candidate.id),
    expectedTotalCostUsd: expectedCost(candidate),
  })),
};

if (has("--json")) {
  console.log(JSON.stringify(receipt, null, 2));
} else {
  console.log(`${receipt.role}: ${receipt.engine} (${receipt.harness}, ${receipt.reasoningMode})`);
  console.log(`qualification: ${receipt.qualification.source} @ ${receipt.qualification.evaluatedAt}`);
  console.log(`expected total cost: USD ${receipt.expectedTotalCostUsd.toFixed(4)}`);
  console.log(`rationale: ${receipt.rationale}`);
}
