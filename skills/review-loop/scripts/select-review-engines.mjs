#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const ROLES = ["fast-reviewer", "deep-reviewer", "fixer", "watcher"];
const RISKS = ["low", "medium", "high", "critical"];
const OPAQUE_HARNESSES = new Set(["codex", "claude-code", "cursor", "opencode"]);
const REVIEWER_GATE_RECALL_THRESHOLD = 0.85;
const TRUSTED_SOURCES = new Set(["protected-harness-config", "trusted-base-artifact"]);
const REVIEWER_EVIDENCE = [
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
const FIXER_EVIDENCE = [
  "firstPassAcceptance",
  "criticalRegressions",
  "scopeCreepRate",
  "documentationCorrectness",
  "escalationCompliance",
];
const SENSITIVE_CLASSES = ["auth", "tenancy", "credentials", "migrations", "transactions", "concurrency", "public-contracts-ops"];
const SENSITIVE_EVIDENCE = ["firstPassAcceptance", "criticalRegressions", "scopeCreepRate", "escalationCompliance"];
const SHA256 = /^sha256:[a-f0-9]{64}$/i;
const ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const DAY = 86_400_000;
const MAX_CLOCK_SKEW_HOURS = 1;
const DEFAULT_REGISTRY_AGE_HOURS = 24;
const DEFAULT_ROLE_MAP_AGE_HOURS = 24;
const DEFAULT_QUALIFICATION_AGE_DAYS = 180;

function option(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function has(name) {
  return args.includes(name);
}

function die(message) {
  console.error(`review-loop role selection failed: ${message}`);
  process.exit(1);
}

function requirePositive(name, fallback) {
  const value = Number(option(name, String(fallback)));
  if (!Number.isFinite(value) || value <= 0) die(`${name} must be a finite positive number`);
  return value;
}

function requireString(label, value) {
  if (typeof value !== "string" || !value.trim()) die(`${label} must be a non-empty string`);
  return value.trim();
}

function inside(root, path) {
  const local = relative(root, path);
  return !local || (!local.startsWith("..") && !isAbsolute(local));
}

function pathOutsideCandidate(label, rawPath, candidateRootLexical, candidateRootCanonical) {
  if (!rawPath) die(`${label} path is required`);
  const lexical = resolve(rawPath);
  let stat;
  try {
    stat = lstatSync(lexical);
  } catch (error) {
    if (error.code === "ENOENT") die(`${label} file is missing`);
    die(`cannot inspect ${label}: ${error.message}`);
  }
  if (stat.isSymbolicLink()) die(`${label} must not be a symbolic link`);
  if (inside(candidateRootLexical, lexical)) die(`${label} must stay outside the candidate repository`);
  const canonical = realpathSync.native(lexical);
  if (inside(candidateRootCanonical, canonical)) die(`${label} must stay outside the candidate repository`);
  return lexical;
}

function readJson(label, path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    die(`${label} is invalid JSON: ${error.message}`);
  }
}

function trust(label, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !TRUSTED_SOURCES.has(value.sourceClass)) {
    die(`${label}.trust.sourceClass must be protected-harness-config or trusted-base-artifact`);
  }
  requireString(`${label}.trust.identifier`, value.identifier);
}

function hash(value) {
  return `sha256:${createHash("sha256").update(String(value ?? "not_observable")).digest("hex")}`;
}

function receiptId(value) {
  if (typeof value === "string" && ID.test(value) && !/(credential|jwt|key|password|private|secret|token)/i.test(value)) return value;
  return hash(value);
}

function dateMs(label, value) {
  const parsed = Date.parse(value ?? "");
  if (!Number.isFinite(parsed)) die(`${label} must be an ISO timestamp`);
  return parsed;
}

function fresh(label, value, maxAge, fixture) {
  const observed = dateMs(label, value);
  if (fixture) return;
  const age = Date.now() - observed;
  if (age < -(MAX_CLOCK_SKEW_HOURS * 60 * 60 * 1000) || age > maxAge) die(`${label} is stale or dated in the future`);
}

function exactIdentity(candidate) {
  return [candidate.harness, candidate.id, candidate.modelId, candidate.reasoningMode].join("\u001f");
}

function expectedCost(candidate) {
  const run = candidate.cost?.expectedRunUsd;
  const retry = candidate.cost?.retryMultiplier;
  if (typeof run !== "number" || !Number.isFinite(run) || run <= 0) return Number.POSITIVE_INFINITY;
  if (typeof retry !== "number" || !Number.isFinite(retry) || retry <= 0) return Number.POSITIVE_INFINITY;
  return run * retry;
}

function repeated(name) {
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

function evidenceFor(candidate, role, fixture, maxAgeDays) {
  const qualification = candidate.qualification;
  if (!qualification || typeof qualification !== "object" || Array.isArray(qualification)) die(`candidate ${candidate.id} has no qualification`);
  if (qualification.status !== "qualified") die(`candidate ${candidate.id} is not qualified for ${role}`);
  requireString(`candidate ${candidate.id} qualification.source`, qualification.source);
  fresh(`candidate ${candidate.id} qualification.evaluatedAt`, qualification.evaluatedAt, maxAgeDays * DAY, fixture);
  const evidence = qualification.evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) die(`candidate ${candidate.id} has no qualification evidence`);
  if (!["review-loop-real-diff", "recognized-harness-review-benchmark"].includes(evidence.sourceClass)) die(`candidate ${candidate.id} has unsupported qualification evidence`);
  if (qualification.source !== evidence.sourceClass) die(`candidate ${candidate.id} qualification source does not match its evidence`);
  requireString(`candidate ${candidate.id} evidence.corpusId`, evidence.corpusId);
  if (!SHA256.test(requireString(`candidate ${candidate.id} evidence.artifactFingerprint`, evidence.artifactFingerprint))) die(`candidate ${candidate.id} evidence fingerprint is invalid`);
  fresh(`candidate ${candidate.id} evidence.observedAt`, evidence.observedAt, maxAgeDays * DAY, fixture);
  const required = role === "fixer" ? FIXER_EVIDENCE : role === "watcher" ? [] : REVIEWER_EVIDENCE;
  if (!Array.isArray(evidence.metricNames) || required.some((metric) => !evidence.metricNames.includes(metric))) die(`candidate ${candidate.id} evidence does not cover ${role}`);
  return evidence;
}

function metric(candidate, metrics, name, { min = 0, max = 1, integer = false } = {}) {
  const value = metrics?.[name];
  if (typeof value !== "number" || !Number.isFinite(value)) die(`candidate ${candidate.id} is missing finite ${name} metric`);
  if (value < min || value > max || (integer && !Number.isInteger(value))) die(`candidate ${candidate.id} has invalid ${name} metric`);
  return value;
}

function sensitiveEvidence(candidate, classes, fixture, maxAgeDays) {
  const evidence = candidate.qualification?.evidence?.sensitive;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) die(`candidate ${candidate.id} lacks protected sensitive-fix evidence`);
  if (evidence.sourceClass !== "protected-sensitive-fix-corpus") die(`candidate ${candidate.id} has unsupported sensitive-fix evidence`);
  requireString(`candidate ${candidate.id} sensitive.corpusId`, evidence.corpusId);
  if (!SHA256.test(requireString(`candidate ${candidate.id} sensitive.artifactFingerprint`, evidence.artifactFingerprint))) die(`candidate ${candidate.id} sensitive evidence fingerprint is invalid`);
  fresh(`candidate ${candidate.id} sensitive.observedAt`, evidence.observedAt, maxAgeDays * DAY, fixture);
  for (const sensitiveClass of classes) {
    const values = evidence.classMetrics?.[sensitiveClass];
    if (!values || typeof values !== "object") die(`candidate ${candidate.id} lacks ${sensitiveClass} sensitive-fix metrics`);
    const firstPass = metric(candidate, values, "firstPassAcceptance");
    const regressions = metric(candidate, values, "criticalRegressions", { max: Number.MAX_SAFE_INTEGER, integer: true });
    const creep = metric(candidate, values, "scopeCreepRate");
    const escalation = metric(candidate, values, "escalationCompliance");
    if (firstPass < 0.75 || regressions !== 0 || creep > 0.1 || escalation < 1) die(`candidate ${candidate.id} fails ${sensitiveClass} sensitive-fix qualification`);
  }
  return evidence;
}

function capabilities(candidate, role, risk, requiredContext, requireRepository, requiredTools) {
  const value = candidate.capabilities;
  if (!value || typeof value !== "object" || Array.isArray(value)) die(`candidate ${candidate.id} has no normalized capabilities`);
  if (!Array.isArray(value.risks) || !value.risks.includes(risk)) die(`candidate ${candidate.id} does not cover ${risk} risk`);
  if (!Number.isSafeInteger(value.contextTokens) || value.contextTokens <= 0 || value.contextTokens < requiredContext) die(`candidate ${candidate.id} has insufficient context capacity`);
  if (typeof value.repositoryAccess !== "boolean") die(`candidate ${candidate.id} has no repository access receipt`);
  if (requireRepository && !value.repositoryAccess) die(`candidate ${candidate.id} lacks required repository access`);
  if (!Array.isArray(value.toolAccess) || value.toolAccess.some((tool) => typeof tool !== "string" || !tool)) die(`candidate ${candidate.id} has no normalized tool access`);
  const missing = requiredTools.filter((tool) => !value.toolAccess.includes(tool));
  if (missing.length) die(`candidate ${candidate.id} lacks required tools: ${missing.join(", ")}`);
  if (role !== "watcher" && value.freshContext !== true) die(`candidate ${candidate.id} lacks fresh-context capability`);
  if (role === "fast-reviewer" || role === "deep-reviewer") {
    if (value.readOnly !== true || value.workspaceWrite === true) die(`candidate ${candidate.id} is not isolated for review`);
  }
  if (role === "fixer" && value.workspaceWrite !== true) die(`candidate ${candidate.id} lacks workspace-write capability`);
  if (role === "watcher") {
    if (value.readOnly !== true || value.workspaceWrite === true) die(`candidate ${candidate.id} is not read-only for monitoring`);
    if (value.monitoring !== true && !value.toolAccess.some((tool) => /^(monitor|monitoring)$/i.test(tool))) die(`candidate ${candidate.id} lacks monitoring capability`);
    if ((value.verdictAuthority ?? candidate.verdictAuthority) !== false) die(`candidate ${candidate.id} watcher authority must be false`);
  }
  return value;
}

function validateCandidate(candidate, role, risk, fixture, maxAgeDays, requiredContext, requireRepository, requiredTools, sensitiveClasses) {
  requireString("candidate.harness", candidate.harness);
  requireString("candidate.id", candidate.id);
  requireString(`candidate ${candidate.id}.modelId`, candidate.modelId);
  requireString(`candidate ${candidate.id}.reasoningMode`, candidate.reasoningMode);
  if (!Array.isArray(candidate.roles) || candidate.roles.length === 0) die(`candidate ${candidate.id} has no roles`);
  if (!candidate.roles.includes(role)) die(`candidate ${candidate.id} does not expose ${role}`);
  const evidence = evidenceFor(candidate, role, fixture, maxAgeDays);
  const caps = capabilities(candidate, role, risk, requiredContext, requireRepository, requiredTools);
  const cost = expectedCost(candidate);
  if (!Number.isFinite(cost)) die(`candidate ${candidate.id} has no expected total cost`);
  const metrics = candidate.qualification.metrics ?? {};
  if (role === "fast-reviewer" || role === "deep-reviewer") {
    if (metric(candidate, metrics, "knownFindingRecall") < 0.85) die(`candidate ${candidate.id} has weak known-finding recall`);
    if (metric(candidate, metrics, "blockerPrecision") < 0.6) die(`candidate ${candidate.id} has weak blocker precision`);
    if (metric(candidate, metrics, "criticalHighEscapes", { max: Number.MAX_SAFE_INTEGER, integer: true }) !== 0) die(`candidate ${candidate.id} has known critical/high escapes`);
    if (metric(candidate, metrics, "fiveGateReceiptRate") < 1) die(`candidate ${candidate.id} does not cover all five gates`);
    if (metric(candidate, metrics, "acceptedFalseBlockerRate") > 0.2) die(`candidate ${candidate.id} has too many accepted false blockers`);
    if (metric(candidate, metrics, "severityCalibration") < 0.8) die(`candidate ${candidate.id} has weak severity calibration`);
    for (const gate of ["criticalHighCorrectness", "simplification", "semantics", "documentation", "verification"]) {
      if (metric(candidate, metrics.perGateRecall, gate) < REVIEWER_GATE_RECALL_THRESHOLD) die(`candidate ${candidate.id} has weak ${gate} gate recall`);
    }
  }
  if (role === "fixer") {
    if (metric(candidate, metrics, "firstPassAcceptance") < 0.75) die(`candidate ${candidate.id} has weak first-pass acceptance`);
    if (metric(candidate, metrics, "criticalRegressions", { max: Number.MAX_SAFE_INTEGER, integer: true }) !== 0) die(`candidate ${candidate.id} has known critical regressions`);
    if (metric(candidate, metrics, "scopeCreepRate") > 0.1) die(`candidate ${candidate.id} has excessive scope creep`);
    if (metric(candidate, metrics, "documentationCorrectness") < 0.8) die(`candidate ${candidate.id} has weak documentation correctness`);
    if (metric(candidate, metrics, "escalationCompliance") < 1) die(`candidate ${candidate.id} has unsafe escalation behavior`);
    if (sensitiveClasses.length) sensitiveEvidence(candidate, sensitiveClasses, fixture, maxAgeDays);
  }
  return { evidence, capabilities: caps, cost };
}

function mappingRoot(roleMap, harness) {
  const roots = [roleMap.mappings, roleMap.roleMappings, roleMap.harnesses].filter((value) => value && typeof value === "object" && !Array.isArray(value));
  for (const root of roots) if (root[harness] && typeof root[harness] === "object" && !Array.isArray(root[harness])) return root[harness];
  if (roleMap.harness === harness && roleMap.roles && typeof roleMap.roles === "object" && !Array.isArray(roleMap.roles)) return roleMap.roles;
  if (roleMap[harness] && typeof roleMap[harness] === "object" && !Array.isArray(roleMap[harness])) return roleMap[harness];
  return null;
}

function mapHarnesses(roleMap) {
  const root = roleMap.mappings ?? roleMap.roleMappings ?? roleMap.harnesses;
  return root && typeof root === "object" && !Array.isArray(root) ? Object.keys(root) : [];
}

function mappingIdentity(role, mapping) {
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) die(`protected role map entry for ${role} is invalid`);
  if (mapping.fallback !== undefined || mapping.fallbacks !== undefined || mapping.alternates !== undefined) die(`protected role map entry for ${role} declares fallback; silent fallback is forbidden`);
  const profile = mapping.profile && typeof mapping.profile === "object" ? mapping.profile : mapping;
  const profileId = profile.profileId ?? profile.id ?? mapping.profileId ?? mapping.id;
  const modelId = profile.modelId ?? mapping.modelId;
  const reasoningMode = profile.reasoningMode ?? mapping.reasoningMode;
  return {
    harness: mapping.harness,
    profileId: requireString(`${role}.profileId`, profileId),
    modelId: requireString(`${role}.modelId`, modelId),
    reasoningMode: requireString(`${role}.reasoningMode`, reasoningMode),
  };
}

function usage() {
  console.log(`review-loop protected role selection

Usage:
  node select-review-engines.mjs --registry <protected-registry.json> --role-map <protected-role-map.json>
    --harness <opaque-id> --role fast-reviewer|deep-reviewer|fixer|watcher
    --risk low|medium|high|critical --candidate-root <repo> [--json]
    [--required-context-tokens <integer>] [--required-tool <name>]
    [--require-repository-access] [--sensitive --sensitive-class <class>]

The role map is protected harness configuration. The selector performs one
exact map-to-registry-to-qualification join and never chooses a fallback.`);
}

if (has("--help")) {
  usage();
  process.exit(0);
}

const role = option("--role");
if (!ROLES.includes(role)) die("--role must be fast-reviewer, deep-reviewer, fixer, or watcher");
const risk = option("--risk", "medium");
if (!RISKS.includes(risk)) die("--risk must be low, medium, high, or critical");
const candidateRootOption = option("--candidate-root");
if (!candidateRootOption) die("--candidate-root is required");
const candidateRootLexical = resolve(candidateRootOption);
if (!existsSync(candidateRootLexical)) die("--candidate-root must exist");
if (lstatSync(candidateRootLexical).isSymbolicLink()) die("--candidate-root must not be a symbolic link");
const candidateRootCanonical = realpathSync.native(candidateRootLexical);

function protectedPath(name, explicit, envName, fallback) {
  if (explicit) return explicit;
  if (envName && process.env[envName]) return process.env[envName];
  if (fallback && existsSync(fallback)) return fallback;
  die(`no protected ${name} found`);
}

const registryPath = protectedPath(
  "live registry",
  option("--registry"),
  "REVIEW_LOOP_ENGINE_REGISTRY",
  resolve(homedir(), ".config", "review-loop", "engines.json"),
);
const registryFile = pathOutsideCandidate("registry", registryPath, candidateRootLexical, candidateRootCanonical);
const registry = readJson("registry", registryFile);
trust("registry", registry.trust);
const fixture = registry.fixture === true;
if (fixture && !has("--allow-fixture")) die("fixture registry cannot select production roles");
const maxRegistryAge = requirePositive("--max-registry-age-hours", DEFAULT_REGISTRY_AGE_HOURS) * 60 * 60 * 1000;
fresh("registry.observedAt", registry.observedAt, maxRegistryAge, fixture);
if (!Array.isArray(registry.candidates) || registry.candidates.length === 0) die("registry.candidates must be a non-empty array");
const candidateKeys = new Set();
for (const candidate of registry.candidates) {
  const key = exactIdentity(candidate);
  if (candidateKeys.has(key)) die("registry has duplicate exact live identity");
  candidateKeys.add(key);
}

const roleMapFile = pathOutsideCandidate(
  "role map",
  protectedPath("role map", option("--role-map"), "REVIEW_LOOP_ROLE_MAP", resolve(homedir(), ".config", "review-loop", "roles.json")),
  candidateRootLexical,
  candidateRootCanonical,
);
const roleMap = readJson("role map", roleMapFile);
trust("role map", roleMap.trust);
const mapFixture = roleMap.fixture === true;
if (mapFixture && !has("--allow-fixture")) die("fixture role map cannot select production roles");
fresh("roleMap.observedAt", roleMap.observedAt, requirePositive("--max-role-map-age-hours", DEFAULT_ROLE_MAP_AGE_HOURS) * 60 * 60 * 1000, fixture || mapFixture);

const observedHarnesses = [...new Set(registry.candidates.map((candidate) => candidate.harness).filter((value) => typeof value === "string" && value))];
const mappedHarnesses = roleMap ? mapHarnesses(roleMap) : [];
const requestedHarness = option("--harness").trim();
if (!requestedHarness && new Set([...observedHarnesses, ...mappedHarnesses]).size !== 1) die("--harness is required when protected state contains multiple harnesses");
const activeHarness = requestedHarness || observedHarnesses[0] || mappedHarnesses[0];
requireString("harness", activeHarness);
if (!OPAQUE_HARNESSES.has(activeHarness) && !fixture && !mappedHarnesses.includes(activeHarness)) die("harness is not present in protected role state");
if (!observedHarnesses.includes(activeHarness)) die(`harness ${activeHarness} is absent from the live registry`);

const mapping = mappingRoot(roleMap, activeHarness);
if (!mapping) die(`protected role map has no mapping for harness ${activeHarness}`);
const requiredRoles = ROLES;
for (const requiredRole of requiredRoles) if (!mapping[requiredRole]) die(`protected role map is missing ${activeHarness}/${requiredRole}`);
const selectedMapping = mappingIdentity(role, mapping[role]);
if (selectedMapping.harness && selectedMapping.harness !== activeHarness) die(`protected ${role} mapping names a different harness`);

const requiredContext = Number(option("--required-context-tokens", "0"));
if (!Number.isSafeInteger(requiredContext) || requiredContext < 0) die("--required-context-tokens must be a non-negative safe integer");
const requiredRepository = has("--require-repository-access");
const requiredTools = repeated("--required-tool");
const sensitiveRequested = has("--sensitive");
if (sensitiveRequested && role !== "fixer") die("--sensitive is only valid for fixer selection");
const sensitiveClasses = [...new Set(repeated("--sensitive-class"))];
if (sensitiveClasses.length && !sensitiveRequested) die("--sensitive-class requires --sensitive");
if (sensitiveClasses.some((value) => !SENSITIVE_CLASSES.includes(value))) die(`--sensitive-class must be one of ${SENSITIVE_CLASSES.join(", ")}`);
const effectiveSensitiveClasses = sensitiveRequested && sensitiveClasses.length ? sensitiveClasses : sensitiveRequested ? SENSITIVE_CLASSES : [];
const maxAgeDays = requirePositive("--max-age-days", DEFAULT_QUALIFICATION_AGE_DAYS);
const matching = registry.candidates.filter((candidate) => (
  candidate.harness === activeHarness &&
  candidate.id === selectedMapping.profileId &&
  candidate.modelId === selectedMapping.modelId &&
  candidate.reasoningMode === selectedMapping.reasoningMode
));
if (matching.length === 0) die(`no exact live candidate for protected ${activeHarness}/${role} mapping`);
if (matching.length > 1) die(`multiple live candidates match protected ${activeHarness}/${role} mapping`);
const selected = matching[0];
const validated = validateCandidate(selected, role, risk, fixture, maxAgeDays, requiredContext, requiredRepository, requiredTools, effectiveSensitiveClasses);
const selectedEvidence = validated.evidence;

const registryTrust = registry.trust;
const roleMapTrust = roleMap?.trust ?? registryTrust;
const receipt = {
  status: "selected",
  role,
  harness: receiptId(activeHarness),
  profileId: receiptId(selected.id),
  engine: receiptId(selected.id),
  modelId: receiptId(selected.modelId),
  reasoningMode: receiptId(selected.reasoningMode),
  roleReceipt: {
    exact: true,
    role,
    harness: receiptId(activeHarness),
    profileId: receiptId(selectedMapping.profileId),
    modelId: receiptId(selectedMapping.modelId),
    reasoningMode: receiptId(selectedMapping.reasoningMode),
    fallback: false,
  },
  registry: {
    sourceClass: registryTrust.sourceClass,
    identifierHash: hash(registryTrust.identifier),
    observedAt: registry.observedAt,
  },
  roleMap: {
    sourceClass: roleMapTrust.sourceClass,
    identifierHash: hash(roleMapTrust.identifier),
    observedAt: roleMap?.observedAt ?? registry.observedAt,
    exact: true,
  },
  qualification: {
    source: selected.qualification.source,
    evaluatedAt: selected.qualification.evaluatedAt,
    evidence: {
      sourceClass: selectedEvidence.sourceClass,
      corpusIdHash: hash(selectedEvidence.corpusId),
      artifactFingerprint: selectedEvidence.artifactFingerprint,
      observedAt: selectedEvidence.observedAt,
    },
  },
  capabilities: {
    readOnly: validated.capabilities.readOnly === true,
    freshContext: validated.capabilities.freshContext === true,
    workspaceWrite: validated.capabilities.workspaceWrite === true,
    monitoring: validated.capabilities.monitoring === true,
    verdictAuthority: role === "fast-reviewer" || role === "deep-reviewer",
    contextTokens: validated.capabilities.contextTokens,
    repositoryAccess: validated.capabilities.repositoryAccess,
    toolAccess: validated.capabilities.toolAccess.map(receiptId),
  },
  fallback: false,
  expectedTotalCostUsd: validated.cost,
  rationale: role === "fast-reviewer"
    ? "explicit protected fast-reviewer mapping; one fresh independent review"
    : role === "deep-reviewer"
      ? "explicit protected deep-reviewer mapping for one authorized escalation"
      : role === "fixer"
        ? "explicit protected fixer mapping reused for local blocker corrections"
        : "explicit protected watcher mapping; read-only monitoring without verdict authority",
};
if (sensitiveRequested) {
  const sensitive = selected.qualification.evidence.sensitive;
  receipt.qualification.sensitive = {
    requiredClasses: effectiveSensitiveClasses,
    sourceClass: sensitive.sourceClass,
    corpusIdHash: hash(sensitive.corpusId),
    artifactFingerprint: sensitive.artifactFingerprint,
    observedAt: sensitive.observedAt,
    classMetrics: Object.fromEntries(effectiveSensitiveClasses.map((sensitiveClass) => [
      sensitiveClass,
      Object.fromEntries(SENSITIVE_EVIDENCE.map((metricName) => [metricName, sensitive.classMetrics[sensitiveClass][metricName]])),
    ])),
  };
}
if (has("--json")) {
  console.log(JSON.stringify(receipt, null, 2));
} else {
  console.log(`${receipt.role}: ${receipt.profileId} (${receipt.harness})`);
  console.log(`qualification: ${receipt.qualification.source} @ ${receipt.qualification.evaluatedAt}`);
  console.log(`fallback: ${receipt.fallback}`);
  console.log(`rationale: ${receipt.rationale}`);
}
