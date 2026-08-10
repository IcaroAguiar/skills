#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateManifest, verifyManifestRemotely } from "./validate-real-diff-corpus.mjs";

const SHA = {
  base: "a".repeat(40),
  candidate: "b".repeat(40),
  accepted: "c".repeat(40),
};
const FINGERPRINT = "1".repeat(64);

function fabricatedCase(index) {
  const category = ["simplification", "semantics", "documentation"][Math.floor(index / 6)];
  return {
    id: `fabricated-${index}`,
    mode: "adjudicated",
    category,
    language: ["TypeScript", "Python", "Go"][index % 3],
    size: ["small", "medium", "large"][index % 3],
    repository: "https://github.com/example/project",
    prUrl: "https://github.com/example/project/pull/7",
    license: "MIT",
    retrievalStatus: "verified",
    retrievedAt: "2026-08-09T00:00:00Z",
    candidate: { baseSha: SHA.base, headSha: SHA.candidate },
    accepted: { baseSha: SHA.base, headSha: SHA.accepted },
    acceptedFinality: { kind: "pr-head", sha: SHA.accepted },
    acceptedDiffSha256: "2".repeat(64),
    acceptedStats: { files: 1, additions: 2, deletions: 1 },
    diffSha256: FINGERPRINT,
    stats: { files: 1, additions: 1, deletions: 0 },
    evidenceUrls: ["https://github.com/example/project/commit/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
    acceptedEvidenceUrls: ["https://github.com/example/project/commit/cccccccccccccccccccccccccccccccccccccccc"],
    maintainerEvidenceUrls: ["https://github.com/example/project/commit/cccccccccccccccccccccccccccccccccccccccc"],
    groundTruthRef: `ground-truth/fabricated-${index}.json`,
    groundTruthSha256: FINGERPRINT,
    projectChecks: ["pnpm test -- review-forge"],
    documentationSources: [],
  };
}

const fabricatedPromotion = {
  version: 1,
  status: "adjudicated",
  cases: Array.from({ length: 18 }, (_, index) => fabricatedCase(index)),
};
const promotionResult = validateManifest(process.cwd() + "/fabricated-corpus.json", fabricatedPromotion, { promotion: true });
assert(promotionResult.failures.some((failure) => failure.includes("duplicates promotion case example/project#7")), "promotion must reject duplicate PR identities");
assert(promotionResult.failures.some((failure) => failure.includes("candidate head duplicates promotion case")), "promotion must reject duplicate candidate identities");
assert(promotionResult.failures.some((failure) => failure.includes("hidden adjudication artifact")), "promotion must require existing ground-truth artifacts");
assert(promotionResult.failures.some((failure) => failure.includes("critical/high correctness finding")), "promotion must require explicit critical/high correctness coverage");
assert(promotionResult.failures.some((failure) => failure.includes("critical/high verification finding")), "promotion must require explicit critical/high verification coverage");

const corpusDirectory = mkdtempSync(join(tmpdir(), "review-forge-corpus-"));
const groundTruthDirectory = join(corpusDirectory, "ground-truth");
mkdirSync(groundTruthDirectory);
const promotionCasesWithoutRiskCoverage = Array.from({ length: 18 }, (_, index) => {
  const corpusCase = fabricatedCase(index);
  const suffix = index.toString(16).padStart(2, "0");
  const candidateHead = index === 0 ? SHA.candidate : `${"b".repeat(38)}${suffix}`;
  const acceptedHead = index === 0 ? SHA.accepted : `${"c".repeat(38)}${suffix}`;
  corpusCase.prUrl = `https://github.com/example/project/pull/${index + 1}`;
  corpusCase.candidate = { baseSha: SHA.base, headSha: candidateHead };
  corpusCase.accepted = { baseSha: SHA.base, headSha: acceptedHead };
  corpusCase.acceptedFinality = { kind: "pr-head", sha: acceptedHead };
  corpusCase.evidenceUrls = [`https://github.com/example/project/commit/${candidateHead}`];
  corpusCase.acceptedEvidenceUrls = [`https://github.com/example/project/commit/${acceptedHead}`];
  corpusCase.maintainerEvidenceUrls = [`https://github.com/example/project/commit/${acceptedHead}`];
  const groundTruth = {
    caseId: corpusCase.id,
    candidate: corpusCase.candidate,
    accepted: corpusCase.accepted,
    adjudicatedAt: "2026-08-09T00:00:00Z",
    adjudicator: "maintainer",
    findings: [{
      id: `finding-${index}`,
      category: corpusCase.category,
      severity: "low",
      summary: "Maintainer-backed correction for the selected review gate.",
      resolution: "Apply the accepted correction.",
      evidenceRefs: [corpusCase.maintainerEvidenceUrls[0]],
    }],
  };
  const bytes = Buffer.from(JSON.stringify(groundTruth));
  writeFileSync(join(groundTruthDirectory, `${corpusCase.id}.json`), bytes);
  corpusCase.groundTruthSha256 = createHash("sha256").update(bytes).digest("hex");
  return corpusCase;
});
const riskCoverageResult = validateManifest(join(corpusDirectory, "manifest.json"), { version: 1, status: "adjudicated", cases: promotionCasesWithoutRiskCoverage }, { promotion: true });
assert(riskCoverageResult.failures.some((failure) => failure.includes("critical/high correctness finding")), "an otherwise valid 18-case corpus must fail without critical/high correctness coverage");
assert(riskCoverageResult.failures.some((failure) => failure.includes("critical/high verification finding")), "an otherwise valid 18-case corpus must fail without critical/high verification coverage");
rmSync(corpusDirectory, { recursive: true, force: true });

const invalidAccepted = fabricatedCase(0);
invalidAccepted.accepted = { baseSha: SHA.base, headSha: SHA.candidate };
const acceptedResult = validateManifest(process.cwd() + "/fabricated-corpus.json", { version: 1, status: "adjudicated", cases: [invalidAccepted] }, { promotion: true });
assert(acceptedResult.failures.some((failure) => failure.includes("accepted head must differ")), "promotion must reject an accepted head equal to the candidate");

const incoherentAcceptedBase = fabricatedCase(0);
incoherentAcceptedBase.accepted.baseSha = SHA.candidate;
const incoherentAcceptedBaseResult = validateManifest(process.cwd() + "/fabricated-corpus.json", { version: 1, status: "adjudicated", cases: [incoherentAcceptedBase] }, { promotion: true });
assert(incoherentAcceptedBaseResult.failures.some((failure) => failure.includes("accepted.baseSha must equal candidate.baseSha")), "promotion must reject accepted snapshots that do not use the candidate merge base");

const mismatchedAcceptedFinality = fabricatedCase(0);
mismatchedAcceptedFinality.acceptedFinality.sha = SHA.candidate;
const mismatchedAcceptedFinalityResult = validateManifest(process.cwd() + "/fabricated-corpus.json", { version: 1, status: "adjudicated", cases: [mismatchedAcceptedFinality] }, { promotion: true });
assert(mismatchedAcceptedFinalityResult.failures.some((failure) => failure.includes("acceptedFinality.sha must equal accepted.headSha")), "promotion must bind accepted finality to the accepted snapshot");

const mutableMaintainerEvidence = fabricatedCase(0);
mutableMaintainerEvidence.maintainerEvidenceUrls = ["https://github.com/example/project/pull/7"];
const mutableMaintainerEvidenceResult = validateManifest(process.cwd() + "/fabricated-corpus.json", { version: 1, status: "adjudicated", cases: [mutableMaintainerEvidence] }, { promotion: true });
assert(mutableMaintainerEvidenceResult.failures.some((failure) => failure.includes("only immutable direct GitHub commit URLs")), "promotion must reject mutable PR-page maintainer evidence");

const incompleteAcceptedSnapshot = fabricatedCase(0);
delete incompleteAcceptedSnapshot.acceptedDiffSha256;
delete incompleteAcceptedSnapshot.acceptedStats;
delete incompleteAcceptedSnapshot.acceptedEvidenceUrls;
const incompleteAcceptedSnapshotResult = validateManifest(process.cwd() + "/fabricated-corpus.json", { version: 1, status: "adjudicated", cases: [incompleteAcceptedSnapshot] }, { promotion: true });
assert(incompleteAcceptedSnapshotResult.failures.some((failure) => failure.includes("acceptedDiffSha256")), "promotion must require an accepted snapshot fingerprint");
assert(incompleteAcceptedSnapshotResult.failures.some((failure) => failure.includes("acceptedStats")), "promotion must require accepted snapshot stats");
assert(incompleteAcceptedSnapshotResult.failures.some((failure) => failure.includes("acceptedEvidenceUrls")), "promotion must require accepted snapshot evidence");

const unboundAcceptedEvidence = fabricatedCase(0);
unboundAcceptedEvidence.acceptedEvidenceUrls = ["https://github.com/example/project/commit/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"];
unboundAcceptedEvidence.maintainerEvidenceUrls = ["https://github.com/other/project/commit/cccccccccccccccccccccccccccccccccccccccc"];
const unboundAcceptedEvidenceResult = validateManifest(process.cwd() + "/fabricated-corpus.json", { version: 1, status: "adjudicated", cases: [unboundAcceptedEvidence] }, { promotion: true });
assert(unboundAcceptedEvidenceResult.failures.some((failure) => failure.includes("acceptedEvidenceUrls must include the direct commit evidence")), "promotion must bind accepted evidence to its snapshot head");
assert(unboundAcceptedEvidenceResult.failures.some((failure) => failure.includes("maintainerEvidenceUrls must identify the declared GitHub repository")), "promotion must bind maintainer evidence to the declared repository");

const emptyArtifact = fabricatedCase(0);
emptyArtifact.mode = "discovery";
emptyArtifact.diffSha256 = "0".repeat(64);
emptyArtifact.stats = { files: 0, additions: 0, deletions: 0 };
emptyArtifact.projectChecks = ["TBD"];
const emptyArtifactResult = validateManifest(process.cwd() + "/fabricated-corpus.json", { version: 1, status: "discovery", cases: [emptyArtifact] });
assert(emptyArtifactResult.failures.some((failure) => failure.includes("non-zero SHA-256")), "corpus must reject a zero fingerprint");
assert(emptyArtifactResult.failures.some((failure) => failure.includes("non-empty diff")), "corpus must reject zero diff stats");
assert(emptyArtifactResult.failures.some((failure) => failure.includes("non-placeholder checks")), "corpus must reject placeholder checks");

const remoteCandidateDiff = Buffer.from("diff --git a/a b/a\n--- a/a\n+++ b/a\n+candidate\n");
const remoteAcceptedDiff = Buffer.from("diff --git a/a b/a\n--- a/a\n+++ b/a\n+accepted\n");
const remoteCase = fabricatedCase(0);
remoteCase.id = "remote-accepted";
remoteCase.diffSha256 = createHash("sha256").update(remoteCandidateDiff).digest("hex");
remoteCase.acceptedDiffSha256 = createHash("sha256").update(remoteAcceptedDiff).digest("hex");
remoteCase.stats = { files: 1, additions: 1, deletions: 0 };
remoteCase.acceptedStats = { files: 1, additions: 1, deletions: 0 };

function responseFor(url, body, headers = {}) {
  const response = new Response(body, { status: 200, headers });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

async function verifyWithGitHubFixture({ corpusCase = remoteCase, merged = true, finalPrHead = corpusCase.accepted.headSha, prCommits = [corpusCase.candidate.headSha, corpusCase.accepted.headSha], comparisonStatus = "ahead", mergeCommitSha = corpusCase.acceptedFinality.kind === "merge-commit" ? corpusCase.acceptedFinality.sha : null } = {}) {
  const candidateSha = corpusCase.candidate.headSha;
  const acceptedSha = corpusCase.accepted.headSha;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const parsed = new URL(url);
    if (parsed.pathname === "/repos/example/project/pulls/7") {
      return responseFor(url, JSON.stringify({
        number: 7,
        state: merged ? "closed" : "open",
        merged,
        merged_at: merged ? "2026-08-09T00:00:00Z" : null,
        merged_by: merged ? { login: "maintainer" } : null,
        merge_commit_sha: mergeCommitSha,
        base: { repo: { full_name: "example/project" } },
        head: { sha: finalPrHead },
      }));
    }
    if (parsed.pathname === "/repos/example/project/pulls/7/commits") {
      return responseFor(url, JSON.stringify(prCommits.map((sha) => ({ sha }))));
    }
    if (parsed.pathname === `/repos/example/project/commits/${candidateSha}/pulls` || parsed.pathname === `/repos/example/project/commits/${acceptedSha}/pulls`) {
      return responseFor(url, JSON.stringify([{ number: 7, base: { repo: { full_name: "example/project" } } }]));
    }
    if (parsed.pathname === `/repos/example/project/commits/${acceptedSha}` && mergeCommitSha === acceptedSha) {
      return responseFor(url, JSON.stringify({ parents: [{ sha: finalPrHead }] }));
    }
    if (parsed.pathname === `/repos/example/project/compare/${candidateSha}...${acceptedSha}`) {
      return responseFor(url, JSON.stringify({ status: comparisonStatus, ahead_by: comparisonStatus === "ahead" ? 1 : 0 }));
    }
    if (parsed.hostname === "github.com" && parsed.pathname === `/example/project/compare/${corpusCase.candidate.baseSha}...${candidateSha}.diff`) {
      return responseFor(url, remoteCandidateDiff);
    }
    if (parsed.hostname === "github.com" && parsed.pathname === `/example/project/compare/${corpusCase.accepted.baseSha}...${acceptedSha}.diff`) {
      return responseFor(url, remoteAcceptedDiff);
    }
    throw new Error(`Unexpected GitHub fixture request: ${url}`);
  };
  try {
    return await verifyManifestRemotely({ cases: [corpusCase] });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const remoteHappyPathFailures = await verifyWithGitHubFixture();
assert.deepEqual(remoteHappyPathFailures, [], "a merged PR with ordered final pr-head acceptance must verify remotely");

const mergeCase = structuredClone(remoteCase);
const mergeSha = "d".repeat(40);
mergeCase.accepted = { baseSha: SHA.base, headSha: mergeSha };
mergeCase.acceptedFinality = { kind: "merge-commit", sha: mergeSha };
mergeCase.acceptedEvidenceUrls = [`https://github.com/example/project/commit/${mergeSha}`];
mergeCase.maintainerEvidenceUrls = [`https://github.com/example/project/commit/${mergeSha}`];
const mergeHappyPathFailures = await verifyWithGitHubFixture({ corpusCase: mergeCase, finalPrHead: SHA.accepted, prCommits: [SHA.candidate, SHA.accepted], mergeCommitSha: mergeSha });
assert.deepEqual(mergeHappyPathFailures, [], "a merged PR merge-commit that records the final PR head must verify remotely");

const openPrFailures = await verifyWithGitHubFixture({ merged: false });
assert(openPrFailures.some((failure) => failure.includes("must be merged")), "remote verification must reject an open PR");

const intermediateAcceptedFailures = await verifyWithGitHubFixture({ finalPrHead: SHA.base, prCommits: [SHA.candidate, SHA.accepted, SHA.base] });
assert(intermediateAcceptedFailures.some((failure) => failure.includes("final declared PR head, not an intermediate commit")), "remote verification must reject an accepted intermediate PR commit");

const invertedSnapshotFailures = await verifyWithGitHubFixture({ comparisonStatus: "behind" });
assert(invertedSnapshotFailures.some((failure) => failure.includes("accepted head must be a descendant of candidate head")), "remote verification must reject inverted candidate and accepted history");

console.log(JSON.stringify({ status: "ok", checks: ["duplicate PR", "duplicate candidate", "missing ground truth", "18-case critical/high correctness coverage", "18-case critical/high verification coverage", "accepted snapshot authentication", "accepted finality binding", "immutable maintainer evidence", "shared negative-snapshot base", "remote merged PR", "remote final PR head", "remote ancestry", "identical accepted head", "zero fingerprint/stats", "placeholder check"] }));
