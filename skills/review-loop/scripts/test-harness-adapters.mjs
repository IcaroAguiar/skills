#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const composer = join(scriptDir, "compose-engine-registry.mjs");
const selector = join(scriptDir, "select-review-engines.mjs");
const exporter = join(scriptDir, "export-harness-inventory.mjs");
const root = mkdtempSync(join(tmpdir(), "review-loop-harness-adapter-"));
const candidateDirectory = join(root, "candidate");
const protectedDirectory = join(root, "protected");
mkdirSync(candidateDirectory);
mkdirSync(protectedDirectory);
const fingerprint = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function write(name, value) {
  const path = join(protectedDirectory, name);
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

function run(args) {
  try {
    return { ok: true, output: execFileSync(process.execPath, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}` };
  }
}

function expectFailure(label, result, phrase) {
  if (result.ok || !result.output.includes(phrase)) throw new Error(`${label}: expected failure containing ${phrase}, received ${result.output}`);
}

const identity = { harness: "example-harness", id: "review-profile", modelId: "not_observable", reasoningMode: "not_observable" };
const inventory = {
  version: 1,
  fixture: true,
  observedAt: "2026-08-09T00:00:00Z",
  trust: { sourceClass: "protected-harness-config", identifier: "runtime-inventory" },
  engines: [{
    ...identity,
    roles: ["fast-reviewer"],
    capabilities: { readOnly: true, freshContext: true, workspaceWrite: false, verdictAuthority: true, contextTokens: 128000, repositoryAccess: true, toolAccess: ["git", "rg"], risks: ["low", "medium", "high"] },
    cost: { tier: "high", expectedRunUsd: 2, retryMultiplier: 1 },
  }],
};
const qualification = {
  status: "qualified",
  source: "review-loop-real-diff",
  evaluatedAt: "2026-08-09",
  evidence: {
    sourceClass: "review-loop-real-diff",
    corpusId: "adapter-test",
    artifactLocator: "test://adapter-test",
    artifactFingerprint: fingerprint,
    observedAt: "2026-08-09",
    metricNames: ["knownFindingRecall", "blockerPrecision", "criticalHighEscapes", "fiveGateReceiptRate", "acceptedFalseBlockerRate", "severityCalibration", "perGateRecall.criticalHighCorrectness", "perGateRecall.simplification", "perGateRecall.semantics", "perGateRecall.documentation", "perGateRecall.verification"],
  },
  metrics: {
    knownFindingRecall: 0.9,
    blockerPrecision: 0.8,
    criticalHighEscapes: 0,
    fiveGateReceiptRate: 1,
    acceptedFalseBlockerRate: 0.1,
    severityCalibration: 0.9,
    perGateRecall: { criticalHighCorrectness: 0.9, simplification: 0.9, semantics: 0.9, documentation: 0.9, verification: 0.9 },
  },
};
const ledger = {
  version: 1,
  fixture: true,
  trust: { sourceClass: "trusted-base-artifact", identifier: "qualification-ledger" },
  records: [{ ...identity, qualification }],
};

const roleMap = {
  version: 1,
  fixture: true,
  observedAt: "2026-08-09T00:00:00Z",
  trust: { sourceClass: "protected-harness-config", identifier: "fixture-role-map" },
  mappings: {
    "example-harness": {
      "fast-reviewer": { profileId: identity.id, modelId: identity.modelId, reasoningMode: identity.reasoningMode },
      "deep-reviewer": { profileId: identity.id, modelId: identity.modelId, reasoningMode: identity.reasoningMode },
      fixer: { profileId: identity.id, modelId: identity.modelId, reasoningMode: identity.reasoningMode },
      watcher: { profileId: identity.id, modelId: identity.modelId, reasoningMode: identity.reasoningMode },
    },
  },
};

function nativeExport(harness, profile = identity) {
  return {
    version: 1,
    fixture: true,
    harness,
    observedAt: "2026-08-09T00:00:00Z",
    trust: { sourceClass: "protected-harness-config", identifier: `${harness}-runtime-export` },
    profiles: [{
      id: profile.id,
      modelId: profile.modelId,
      reasoningMode: profile.reasoningMode,
      roles: ["fast-reviewer"],
      capabilities: inventory.engines[0].capabilities,
      cost: inventory.engines[0].cost,
    }],
  };
}

try {
  for (const harness of ["codex", "cursor", "claude-code", "opencode"]) {
    const exportPath = write(`${harness}-native-export.json`, nativeExport(harness));
    const normalizedPath = join(protectedDirectory, `${harness}-inventory.json`);
    const exportResult = run([exporter, "--harness", harness, "--input", exportPath, "--output", normalizedPath, "--candidate-root", candidateDirectory, "--allow-fixture"]);
    if (!exportResult.ok) throw new Error(`${harness} adapter export failed: ${exportResult.output}`);
    const normalized = JSON.parse(readFileSync(normalizedPath, "utf8"));
    if (normalized.engines[0].harness !== harness || normalized.engines[0].modelId !== identity.modelId || normalized.engines[0].reasoningMode !== identity.reasoningMode) {
      throw new Error(`${harness} adapter did not preserve the protected observed identity`);
    }
  }

  const mismatchExport = nativeExport("codex");
  expectFailure("adapter-harness-mismatch", run([exporter, "--harness", "cursor", "--input", write("mismatch-native-export.json", mismatchExport), "--output", join(protectedDirectory, "mismatch-inventory.json"), "--candidate-root", candidateDirectory, "--allow-fixture"]), "input.harness must exactly match --harness");
  const incompleteExport = nativeExport("codex");
  delete incompleteExport.profiles[0].modelId;
  expectFailure("adapter-fail-closed", run([exporter, "--harness", "codex", "--input", write("incomplete-native-export.json", incompleteExport), "--output", join(protectedDirectory, "incomplete-inventory.json"), "--candidate-root", candidateDirectory, "--allow-fixture"]), "profiles[0].modelId must be a non-empty observed value or not_observable");

  const protectedCodexExport = write("protected-codex-native-export.json", nativeExport("codex"));
  const candidateToOutsideInput = join(candidateDirectory, "input-link.json");
  symlinkSync(protectedCodexExport, candidateToOutsideInput);
  expectFailure("adapter-lexical-candidate-input", run([exporter, "--harness", "codex", "--input", candidateToOutsideInput, "--output", join(protectedDirectory, "lexical-inventory.json"), "--candidate-root", candidateDirectory, "--allow-fixture"]), "input must stay outside the candidate repository");
  const candidateNativeExport = join(candidateDirectory, "native-export.json");
  writeFileSync(candidateNativeExport, JSON.stringify(nativeExport("codex")));
  const outsideToCandidateInput = join(protectedDirectory, "input-to-candidate-link.json");
  symlinkSync(candidateNativeExport, outsideToCandidateInput);
  expectFailure("adapter-canonical-candidate-input", run([exporter, "--harness", "codex", "--input", outsideToCandidateInput, "--output", join(protectedDirectory, "canonical-inventory.json"), "--candidate-root", candidateDirectory, "--allow-fixture"]), "input must stay outside the candidate repository");
  const adapterOutputTarget = join(protectedDirectory, "adapter-output-target.json");
  writeFileSync(adapterOutputTarget, "do-not-overwrite");
  const adapterOutputLink = join(protectedDirectory, "adapter-output-link.json");
  symlinkSync(adapterOutputTarget, adapterOutputLink);
  expectFailure("adapter-output-symlink", run([exporter, "--harness", "codex", "--input", protectedCodexExport, "--output", adapterOutputLink, "--candidate-root", candidateDirectory, "--allow-fixture"]), "output must not be a symbolic link");
  if (readFileSync(adapterOutputTarget, "utf8") !== "do-not-overwrite") throw new Error("adapter-output-symlink: exporter followed the output symlink");
  expectFailure("adapter-lexical-candidate-output", run([exporter, "--harness", "codex", "--input", protectedCodexExport, "--output", join(candidateDirectory, "inventory.json"), "--candidate-root", candidateDirectory, "--allow-fixture"]), "output must stay outside the candidate repository");

  const inventoryPath = write("inventory.json", inventory);
  const ledgerPath = write("qualifications.json", ledger);
  const registryPath = join(protectedDirectory, "registry.json");
  const composition = run([composer, "--inventory", inventoryPath, "--qualifications", ledgerPath, "--reviewer-cost-ceiling-usd", "4", "--output", registryPath, "--candidate-root", candidateDirectory, "--allow-fixture"]);
  if (!composition.ok) throw new Error(`exact-match composition failed: ${composition.output}`);
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  if (registry.candidates[0].modelId !== "not_observable" || registry.candidates[0].qualification.status !== "qualified") {
    throw new Error("exact-match composition lost observable identity or qualification");
  }
  const roleMapPath = write("role-map.json", roleMap);
  const selection = run([selector, "--registry", registryPath, "--role-map", roleMapPath, "--harness", "example-harness", "--role", "fast-reviewer", "--risk", "high", "--candidate-root", candidateDirectory, "--allow-fixture", "--json"]);
  if (!selection.ok) throw new Error(`composed registry was not selectable: ${selection.output}`);
  const selectionReceipt = JSON.parse(selection.output);
  if (selectionReceipt.engine !== identity.id || selectionReceipt.modelId !== identity.modelId) {
    throw new Error("selection receipt lost the exact harness profile or model identity");
  }

  const templateRoot = join(scriptDir, "..", "templates");
  const publicInventory = JSON.parse(readFileSync(join(templateRoot, "harness-inventory.example.json"), "utf8"));
  const publicLedger = JSON.parse(readFileSync(join(templateRoot, "qualification-ledger.example.json"), "utf8"));
  const publicRoleMap = JSON.parse(readFileSync(join(templateRoot, "role-map.example.json"), "utf8"));
  const publicNativeExport = {
    version: publicInventory.version,
    fixture: publicInventory.fixture,
    harness: "codex",
    observedAt: publicInventory.observedAt,
    trust: publicInventory.trust,
    profiles: publicInventory.engines.map((engine) => ({
      id: engine.id,
      modelId: engine.modelId,
      reasoningMode: engine.reasoningMode,
      roles: engine.roles,
      capabilities: engine.capabilities,
      cost: engine.cost,
    })),
  };
  const publicExportPath = write("public-template-native-export.json", publicNativeExport);
  const publicInventoryPath = join(protectedDirectory, "public-template-inventory.json");
  const publicExport = run([exporter, "--harness", "codex", "--input", publicExportPath, "--output", publicInventoryPath, "--candidate-root", candidateDirectory, "--allow-fixture"]);
  if (!publicExport.ok) throw new Error(`public template export failed: ${publicExport.output}`);
  const publicLedgerPath = write("public-template-qualification-ledger.json", publicLedger);
  const publicRoleMapPath = write("public-template-role-map.json", publicRoleMap);
  const publicRegistryPath = join(protectedDirectory, "public-template-registry.json");
  const publicComposition = run([composer, "--inventory", publicInventoryPath, "--qualifications", publicLedgerPath, "--reviewer-cost-ceiling-usd", "4", "--output", publicRegistryPath, "--candidate-root", candidateDirectory, "--allow-fixture"]);
  if (!publicComposition.ok) throw new Error(`public template composition failed: ${publicComposition.output}`);
  const publicRegistry = JSON.parse(readFileSync(publicRegistryPath, "utf8"));
  for (const role of ["fast-reviewer", "deep-reviewer", "fixer", "watcher"]) {
    const candidate = publicRegistry.candidates.find((value) => value.roles.includes(role));
    const mapping = publicRoleMap.mappings.codex[role];
    if (!candidate || candidate.harness !== "codex" || candidate.id !== mapping.profileId || candidate.modelId !== mapping.modelId || candidate.reasoningMode !== mapping.reasoningMode) {
      throw new Error(`public template identity mismatch for ${role}`);
    }
  }
  const publicSelection = run([selector, "--registry", publicRegistryPath, "--role-map", publicRoleMapPath, "--harness", "codex", "--role", "fast-reviewer", "--risk", "high", "--candidate-root", candidateDirectory, "--allow-fixture", "--json"]);
  if (!publicSelection.ok) throw new Error(`public template selection failed: ${publicSelection.output}`);
  const publicReceipt = JSON.parse(publicSelection.output);
  if (publicReceipt.role !== "fast-reviewer" || publicReceipt.profileId !== "fast-profile" || publicReceipt.capabilities.verdictAuthority !== true) {
    throw new Error("public template selection did not produce the fast-reviewer receipt");
  }

  const mismatch = structuredClone(ledger);
  mismatch.records[0].modelId = "different-model";
  expectFailure("identity-mismatch", run([composer, "--inventory", inventoryPath, "--qualifications", write("mismatch.json", mismatch), "--reviewer-cost-ceiling-usd", "4", "--allow-fixture"]), "no exact protected qualification");

  const untrusted = structuredClone(inventory);
  untrusted.trust.sourceClass = "candidate-head";
  expectFailure("untrusted-inventory", run([composer, "--inventory", write("untrusted.json", untrusted), "--qualifications", ledgerPath, "--reviewer-cost-ceiling-usd", "4", "--allow-fixture"]), "inventory.trust must use");

  expectFailure("candidate-local-inventory", run([composer, "--inventory", inventoryPath, "--qualifications", ledgerPath, "--reviewer-cost-ceiling-usd", "4", "--candidate-root", root, "--allow-fixture"]), "inventory must stay outside the candidate repository");
  const candidateToOutsideInventory = join(candidateDirectory, "inventory-link.json");
  symlinkSync(inventoryPath, candidateToOutsideInventory);
  expectFailure("composer-lexical-candidate-input", run([composer, "--inventory", candidateToOutsideInventory, "--qualifications", ledgerPath, "--reviewer-cost-ceiling-usd", "4", "--candidate-root", candidateDirectory, "--allow-fixture"]), "inventory must stay outside the candidate repository");
  const candidateQualification = join(candidateDirectory, "qualifications.json");
  writeFileSync(candidateQualification, JSON.stringify(ledger));
  const outsideToCandidateQualification = join(protectedDirectory, "qualification-link.json");
  symlinkSync(candidateQualification, outsideToCandidateQualification);
  expectFailure("composer-canonical-candidate-input", run([composer, "--inventory", inventoryPath, "--qualifications", outsideToCandidateQualification, "--reviewer-cost-ceiling-usd", "4", "--candidate-root", candidateDirectory, "--allow-fixture"]), "qualifications must stay outside the candidate repository");
  const outputTarget = join(protectedDirectory, "registry-target.json");
  writeFileSync(outputTarget, "do-not-overwrite");
  const outputLink = join(protectedDirectory, "registry-output-link.json");
  symlinkSync(outputTarget, outputLink);
  expectFailure("composer-output-symlink", run([composer, "--inventory", inventoryPath, "--qualifications", ledgerPath, "--reviewer-cost-ceiling-usd", "4", "--output", outputLink, "--candidate-root", candidateDirectory, "--allow-fixture"]), "output must not be a symbolic link");
  if (readFileSync(outputTarget, "utf8") !== "do-not-overwrite") throw new Error("composer-output-symlink: composer followed the output symlink");
  expectFailure("composer-lexical-candidate-output", run([composer, "--inventory", inventoryPath, "--qualifications", ledgerPath, "--reviewer-cost-ceiling-usd", "4", "--output", join(candidateDirectory, "registry.json"), "--candidate-root", candidateDirectory, "--allow-fixture"]), "output must stay outside the candidate repository");

  expectFailure("fixture-refusal", run([composer, "--inventory", inventoryPath, "--qualifications", ledgerPath, "--reviewer-cost-ceiling-usd", "4"]), "fixture inputs require --allow-fixture");
  expectFailure("invalid-cost-ceiling", run([composer, "--inventory", inventoryPath, "--qualifications", ledgerPath, "--reviewer-cost-ceiling-usd", "NaN", "--allow-fixture"]), "finite positive number");
  console.log("PASS harness-adapters");
} finally {
  for (const directory of [candidateDirectory, protectedDirectory]) {
    for (const entry of readdirSync(directory)) unlinkSync(join(directory, entry));
    rmdirSync(directory);
  }
  rmdirSync(root);
}
