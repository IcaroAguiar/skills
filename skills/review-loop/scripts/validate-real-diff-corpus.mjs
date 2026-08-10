#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const promotion = args.includes("--promotion");
const verifyRemote = promotion || args.includes("--verify-remote");
const inputArgument = args.find((argument) => !argument.startsWith("--"));
const inputPath = resolve(inputArgument ?? "");
const failures = [];
const shaPattern = /^[0-9a-f]{40}$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const zeroSha256 = /^0{64}$/;
const repositoryPattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+)$/;
const pullRequestPattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/;
const placeholderPattern = /\b(?:tbd|todo|n\/?a|none|not run|pending|placeholder|unknown|later|fake)\b/i;
const PROMOTION_REQUIREMENTS = {
  totalCases: 18,
  casesPerCategory: 6,
  languages: 3,
  criticalHighFindingsPerCategory: 1,
};
const CASE_CATEGORIES = ["simplification", "semantics", "documentation"];
const FINDING_CATEGORIES = [...CASE_CATEGORIES, "correctness", "verification"];
const REQUEST_HEADERS = {
  Accept: "text/x-diff",
  "User-Agent": "review-loop-corpus-validator/1.0",
};

function fail(message, target = failures) {
  target.push(message);
}

function isMeaningfulText(value, minLength = 8) {
  return typeof value === "string" && value.trim().length >= minLength && !placeholderPattern.test(value);
}

function hasFingerprint(value) {
  return sha256Pattern.test(value ?? "") && !zeroSha256.test(value);
}

function parseRepository(value) {
  const match = repositoryPattern.exec(value ?? "");
  return match ? { owner: match[1], repo: match[2] } : undefined;
}

function parsePullRequest(value) {
  const match = pullRequestPattern.exec(value ?? "");
  return match ? { owner: match[1], repo: match[2], number: Number(match[3]) } : undefined;
}

function parseGitHubEvidence(value) {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(pull|commit|issues)\/(\d+|[0-9a-f]{40})$/.exec(value ?? "");
  return match ? { owner: match[1], repo: match[2], kind: match[3], reference: match[4] } : undefined;
}

function validateRange(label, range, target = failures) {
  for (const field of ["baseSha", "headSha"]) {
    if (!shaPattern.test(range?.[field] ?? "")) fail(`${label}.${field} must be a full SHA`, target);
  }
  if (range?.baseSha === range?.headSha) fail(`${label} must contain two distinct SHAs`, target);
}

function rangesMatch(left, right) {
  return left?.baseSha === right?.baseSha && left?.headSha === right?.headSha;
}

function validateSnapshot(label, range, fingerprint, stats, target = failures) {
  validateRange(label, range, target);
  if (!hasFingerprint(fingerprint)) fail(`${label}DiffSha256 must be a non-zero SHA-256 fingerprint`, target);
  for (const field of ["files", "additions", "deletions"]) {
    if (!Number.isInteger(stats?.[field]) || stats[field] < 0) fail(`${label}Stats.${field} must be a non-negative integer`, target);
  }
  if ((stats?.files ?? 0) === 0 || ((stats?.additions ?? 0) + (stats?.deletions ?? 0)) === 0) {
    fail(`${label}Stats must describe a non-empty diff`, target);
  }
}

function validateEvidenceUrls(label, urls, repository, target = failures, { requiredCommit } = {}) {
  if (!Array.isArray(urls) || urls.length === 0) {
    fail(`${label} must be non-empty`, target);
    return;
  }
  let hasRequiredCommit = false;
  for (const url of urls) {
    const evidence = parseGitHubEvidence(url);
    if (!evidence) {
      fail(`${label} contains an invalid direct GitHub evidence URL`, target);
      continue;
    }
    if (repository && (repository.owner !== evidence.owner || repository.repo !== evidence.repo)) {
      fail(`${label} must identify the declared GitHub repository`, target);
    }
    if (requiredCommit && evidence.kind === "commit" && evidence.reference === requiredCommit) hasRequiredCommit = true;
  }
  if (requiredCommit && !hasRequiredCommit) {
    fail(`${label} must include the direct commit evidence for ${requiredCommit}`, target);
  }
}

function validateAcceptedFinality(label, finality, accepted, target = failures) {
  if (!finality || !["pr-head", "merge-commit"].includes(finality.kind)) {
    fail(`${label}.kind must be pr-head or merge-commit`, target);
  }
  if (!shaPattern.test(finality?.sha ?? "")) fail(`${label}.sha must be a full SHA`, target);
  if (finality?.sha !== accepted?.headSha) {
    fail(`${label}.sha must equal accepted.headSha`, target);
  }
}

function validateImmutableMaintainerEvidence(label, urls, repository, acceptedFinality, target = failures) {
  if (!Array.isArray(urls) || urls.length === 0) {
    fail(`${label} must be non-empty`, target);
    return;
  }
  let hasFinalCommit = false;
  for (const url of urls) {
    const evidence = parseGitHubEvidence(url);
    if (!evidence || evidence.kind !== "commit") {
      fail(`${label} must contain only immutable direct GitHub commit URLs`, target);
      continue;
    }
    if (repository && (repository.owner !== evidence.owner || repository.repo !== evidence.repo)) {
      fail(`${label} must identify the declared GitHub repository`, target);
    }
    if (evidence.reference === acceptedFinality?.sha) hasFinalCommit = true;
  }
  if (acceptedFinality?.sha && !hasFinalCommit) {
    fail(`${label} must include immutable commit evidence for acceptedFinality.sha`, target);
  }
}

function resolveConfinedArtifact(corpusPath, groundTruthRef, target = failures) {
  if (!isMeaningfulText(groundTruthRef) || isAbsolute(groundTruthRef) || groundTruthRef.includes("\\")) {
    fail("groundTruthRef must be a non-empty relative JSON path", target);
    return undefined;
  }
  const corpusDirectory = realpathSync.native(dirname(corpusPath));
  const requestedPath = resolve(corpusDirectory, groundTruthRef);
  const relativePath = relative(corpusDirectory, requestedPath);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath) || extname(requestedPath) !== ".json") {
    fail("groundTruthRef must stay under the corpus directory and name a separate JSON artifact", target);
    return undefined;
  }
  if (!existsSync(requestedPath)) {
    fail("groundTruthRef must identify an existing hidden adjudication artifact", target);
    return undefined;
  }
  const artifactPath = realpathSync.native(requestedPath);
  const artifactRelativePath = relative(corpusDirectory, artifactPath);
  if (!artifactRelativePath || artifactRelativePath.startsWith("..") || isAbsolute(artifactRelativePath)) {
    fail("groundTruthRef cannot escape the corpus directory through a symlink", target);
    return undefined;
  }
  return artifactPath;
}

function readGroundTruth(corpusPath, corpusCase, target = failures) {
  const artifactPath = resolveConfinedArtifact(corpusPath, corpusCase.groundTruthRef, target);
  if (!artifactPath) return undefined;

  let bytes;
  let groundTruth;
  try {
    bytes = readFileSync(artifactPath);
    groundTruth = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail(`${corpusCase.id}.groundTruthRef must contain valid JSON: ${error.message}`, target);
    return undefined;
  }

  if (!hasFingerprint(corpusCase.groundTruthSha256)) {
    fail(`${corpusCase.id}.groundTruthSha256 must be a non-zero SHA-256 fingerprint`, target);
  } else {
    const actualFingerprint = createHash("sha256").update(bytes).digest("hex");
    if (actualFingerprint !== corpusCase.groundTruthSha256) {
      fail(`${corpusCase.id}.groundTruthSha256 does not match its adjudication artifact`, target);
    }
  }
  if (groundTruth.caseId !== corpusCase.id) fail(`${corpusCase.id} ground truth caseId must match the manifest case identity`, target);
  if (!rangesMatch(groundTruth.candidate, corpusCase.candidate)) fail(`${corpusCase.id} ground truth candidate range must match the manifest`, target);
  if (!rangesMatch(groundTruth.accepted, corpusCase.accepted)) fail(`${corpusCase.id} ground truth accepted range must match the manifest`, target);
  if (!Number.isFinite(Date.parse(groundTruth.adjudicatedAt ?? ""))) fail(`${corpusCase.id} ground truth must include adjudicatedAt`, target);
  if (!isMeaningfulText(groundTruth.adjudicator, 3)) fail(`${corpusCase.id} ground truth must identify an adjudicator`, target);
  if (!Array.isArray(groundTruth.findings) || groundTruth.findings.length === 0) {
    fail(`${corpusCase.id} ground truth must contain at least one adjudicated finding`, target);
  } else {
    let categoryMatch = false;
    for (const [findingIndex, finding] of groundTruth.findings.entries()) {
      const findingLabel = `${corpusCase.id} groundTruth.findings[${findingIndex}]`;
      if (!isMeaningfulText(finding.id, 3)) fail(`${findingLabel}.id must be meaningful`, target);
      if (!FINDING_CATEGORIES.includes(finding.category)) {
        fail(`${findingLabel}.category is invalid`, target);
      }
      if (finding.category === corpusCase.category) categoryMatch = true;
      if (!["critical", "high", "medium", "low"].includes(finding.severity)) fail(`${findingLabel}.severity is invalid`, target);
      if (!isMeaningfulText(finding.summary, 20)) fail(`${findingLabel}.summary must contain a specific explanation`, target);
      if (!isMeaningfulText(finding.resolution, 10)) fail(`${findingLabel}.resolution must describe an acceptable correction`, target);
      if (!Array.isArray(finding.evidenceRefs) || finding.evidenceRefs.length === 0 || finding.evidenceRefs.some((entry) => !isMeaningfulText(entry))) {
        fail(`${findingLabel}.evidenceRefs must contain meaningful evidence metadata`, target);
      }
    }
    if (!categoryMatch) fail(`${corpusCase.id} ground truth must cover the case category`, target);
  }
  return { artifactPath, groundTruth };
}

function validateCase(corpusPath, corpusCase, index, { promotion: isPromotion = false } = {}) {
  const target = [];
  const label = `cases[${index}]`;
  if (!isMeaningfulText(corpusCase.id, 3)) fail(`${label}.id must be present and meaningful`, target);
  if (!['discovery', 'adjudicated'].includes(corpusCase.mode)) fail(`${label}.mode is invalid`, target);
  if (!CASE_CATEGORIES.includes(corpusCase.category)) fail(`${label}.category is invalid`, target);
  if (!isMeaningfulText(corpusCase.language, 2)) fail(`${label}.language is required`, target);
  if (!["small", "medium", "large"].includes(corpusCase.size)) fail(`${label}.size is invalid`, target);
  const repository = parseRepository(corpusCase.repository);
  const pullRequest = parsePullRequest(corpusCase.prUrl);
  if (!repository) fail(`${label}.repository must be a canonical public GitHub repository URL`, target);
  if (!pullRequest) fail(`${label}.prUrl must be a direct public GitHub PR URL`, target);
  if (repository && pullRequest && (repository.owner !== pullRequest.owner || repository.repo !== pullRequest.repo)) {
    fail(`${label}.repository and prUrl must identify the same GitHub repository`, target);
  }
  if (!isMeaningfulText(corpusCase.license, 3)) fail(`${label}.license is required`, target);
  if (corpusCase.retrievalStatus !== "verified") fail(`${label}.retrievalStatus must be verified`, target);
  validateSnapshot(`${label}.candidate`, corpusCase.candidate, corpusCase.diffSha256, corpusCase.stats, target);
  if (!Number.isFinite(Date.parse(corpusCase.retrievedAt ?? ""))) fail(`${label}.retrievedAt must be an ISO date`, target);
  validateEvidenceUrls(`${label}.evidenceUrls`, corpusCase.evidenceUrls, repository, target, { requiredCommit: corpusCase.candidate?.headSha });
  if (!Array.isArray(corpusCase.projectChecks) || corpusCase.projectChecks.length === 0 || corpusCase.projectChecks.some((check) => !isMeaningfulText(check))) {
    fail(`${label}.projectChecks must contain meaningful, non-placeholder checks`, target);
  }
  if (!Array.isArray(corpusCase.documentationSources)) fail(`${label}.documentationSources must be an array`, target);

  let groundTruth;
  if (corpusCase.mode === "adjudicated" || isPromotion) {
    validateSnapshot(`${label}.accepted`, corpusCase.accepted, corpusCase.acceptedDiffSha256, corpusCase.acceptedStats, target);
    if (corpusCase.accepted?.headSha === corpusCase.candidate?.headSha) fail(`${label}.accepted head must differ from the candidate head`, target);
    if (corpusCase.accepted?.baseSha !== corpusCase.candidate?.baseSha) {
      fail(`${label}.accepted.baseSha must equal candidate.baseSha so accepted remains a full negative snapshot`, target);
    }
    validateAcceptedFinality(`${label}.acceptedFinality`, corpusCase.acceptedFinality, corpusCase.accepted, target);
    validateEvidenceUrls(`${label}.acceptedEvidenceUrls`, corpusCase.acceptedEvidenceUrls, repository, target, { requiredCommit: corpusCase.accepted?.headSha });
    validateImmutableMaintainerEvidence(`${label}.maintainerEvidenceUrls`, corpusCase.maintainerEvidenceUrls, repository, corpusCase.acceptedFinality, target);
    groundTruth = readGroundTruth(corpusPath, corpusCase, target)?.groundTruth;
  }
  return { failures: target, repository, pullRequest, groundTruth };
}

export function validateManifest(corpusPath, corpus, { promotion: isPromotion = false } = {}) {
  const manifestFailures = [];
  if (corpus.version !== 1) fail("version must be 1", manifestFailures);
  if (!["discovery", "adjudicated"].includes(corpus.status)) fail("status must be discovery or adjudicated", manifestFailures);
  if (!Array.isArray(corpus.cases) || corpus.cases.length === 0) fail("cases must be a non-empty array", manifestFailures);

  const ids = new Set();
  const prIdentities = new Set();
  const candidateIdentities = new Set();
  const categories = { simplification: 0, semantics: 0, documentation: 0 };
  const criticalHighFindings = { correctness: 0, verification: 0 };
  const languages = new Set();
  const sizes = new Set();
  for (const [index, corpusCase] of (corpus.cases ?? []).entries()) {
    const label = `cases[${index}]`;
    if (!corpusCase.id || ids.has(corpusCase.id)) fail(`${label}.id must be present and unique`, manifestFailures);
    ids.add(corpusCase.id);
    if (Object.hasOwn(categories, corpusCase.category)) categories[corpusCase.category] += 1;
    if (corpusCase.language) languages.add(corpusCase.language);
    if (corpusCase.size) sizes.add(corpusCase.size);

    const caseResult = validateCase(corpusPath, corpusCase, index, { promotion: isPromotion });
    manifestFailures.push(...caseResult.failures);
    const findings = caseResult.groundTruth?.findings ?? [];
    for (const finding of findings) {
      if ((finding.severity === "critical" || finding.severity === "high") && Object.hasOwn(criticalHighFindings, finding.category)) {
        criticalHighFindings[finding.category] += 1;
      }
    }
    if (isPromotion && caseResult.repository && caseResult.pullRequest) {
      const prIdentity = `${caseResult.repository.owner}/${caseResult.repository.repo}#${caseResult.pullRequest.number}`;
      if (prIdentities.has(prIdentity)) fail(`${label}.prUrl duplicates promotion case ${prIdentity}`, manifestFailures);
      prIdentities.add(prIdentity);
      const candidateIdentity = `${caseResult.repository.owner}/${caseResult.repository.repo}@${corpusCase.candidate?.headSha ?? "missing"}`;
      if (candidateIdentities.has(candidateIdentity)) fail(`${label}.candidate head duplicates promotion case ${candidateIdentity}`, manifestFailures);
      candidateIdentities.add(candidateIdentity);
    }
  }

  if (isPromotion) {
    if (corpus.status !== "adjudicated") fail("promotion requires status=adjudicated", manifestFailures);
    if ((corpus.cases ?? []).length < PROMOTION_REQUIREMENTS.totalCases) fail("promotion requires at least 18 cases", manifestFailures);
    for (const [category, count] of Object.entries(categories)) {
      if (count < PROMOTION_REQUIREMENTS.casesPerCategory) fail(`promotion requires at least six ${category} cases`, manifestFailures);
    }
    for (const [category, count] of Object.entries(criticalHighFindings)) {
      if (count < PROMOTION_REQUIREMENTS.criticalHighFindingsPerCategory) {
        fail(`promotion requires at least one critical/high ${category} finding in hidden ground truth`, manifestFailures);
      }
    }
    if (languages.size < PROMOTION_REQUIREMENTS.languages) fail("promotion requires at least three languages", manifestFailures);
    for (const size of ["small", "medium", "large"]) {
      if (!sizes.has(size)) fail(`promotion requires ${size} diffs`, manifestFailures);
    }
    if ((corpus.cases ?? []).some((corpusCase) => corpusCase.mode !== "adjudicated")) {
      fail("promotion corpus cannot include discovery-only cases", manifestFailures);
    }
  }

  return {
    failures: manifestFailures,
    categories,
    criticalHighFindings,
    languages: [...languages].sort(),
    sizes: [...sizes].sort(),
  };
}

function diffStats(bytes) {
  const lines = bytes.toString("utf8").split(/\r?\n/);
  let files = 0;
  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    if (line.startsWith("diff --git ")) files += 1;
    else if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions += 1;
  }
  return { files, additions, deletions };
}

async function fetchResponse(url, accept) {
  let response;
  try {
    response = await fetch(url, { headers: { ...REQUEST_HEADERS, Accept: accept } });
  } catch (error) {
    throw new Error(`network request failed for ${url}: ${error.message}`);
  }
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status} for ${url}`);
  return response;
}

function parseNextPage(linkHeader) {
  const match = /<([^>]+)>;\s*rel="next"/.exec(linkHeader ?? "");
  return match?.[1];
}

async function fetchPullRequestCommits(repository, pullRequest) {
  const commits = [];
  let url = `https://api.github.com/repos/${repository.owner}/${repository.repo}/pulls/${pullRequest.number}/commits?per_page=100`;
  while (url) {
    const response = await fetchResponse(url, "application/vnd.github+json");
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error("GitHub PR commits endpoint did not return an array");
    commits.push(...page);
    url = parseNextPage(response.headers.get("link"));
  }
  return commits;
}

async function verifyAcceptedFinality(corpusCase, repository, pullRequest, declaredPullRequest) {
  const caseFailures = [];
  const finality = corpusCase.acceptedFinality;
  const accepted = corpusCase.accepted;
  const prLabel = `${repository.owner}/${repository.repo}#${pullRequest.number}`;
  if (declaredPullRequest?.state !== "closed" || declaredPullRequest?.merged !== true || !declaredPullRequest?.merged_at || !declaredPullRequest?.merged_by?.login) {
    caseFailures.push(`${corpusCase.id}: declared PR ${prLabel} must be merged with immutable maintainer acceptance metadata`);
    return caseFailures;
  }

  let commits;
  try {
    commits = await fetchPullRequestCommits(repository, pullRequest);
  } catch (error) {
    caseFailures.push(`${corpusCase.id}: cannot verify ordered PR commits: ${error.message}`);
    return caseFailures;
  }
  const shas = commits.map((commit) => commit?.sha);
  const candidateIndex = shas.indexOf(corpusCase.candidate?.headSha);
  const finalPrHead = declaredPullRequest?.head?.sha;
  if (!shaPattern.test(finalPrHead ?? "") || shas.at(-1) !== finalPrHead) {
    caseFailures.push(`${corpusCase.id}: GitHub PR commits do not end at the declared PR head`);
  }
  if (candidateIndex < 0) {
    caseFailures.push(`${corpusCase.id}: candidate head is not present in the declared PR commit sequence`);
  }

  if (finality?.kind === "pr-head") {
    if (finality.sha !== finalPrHead || accepted?.headSha !== finalPrHead) {
      caseFailures.push(`${corpusCase.id}: accepted pr-head must be the final declared PR head, not an intermediate commit`);
    }
  } else if (finality?.kind === "merge-commit") {
    if (finality.sha !== declaredPullRequest?.merge_commit_sha || accepted?.headSha !== declaredPullRequest?.merge_commit_sha) {
      caseFailures.push(`${corpusCase.id}: accepted merge-commit must equal GitHub's merged PR merge_commit_sha`);
    } else {
      try {
        const response = await fetchResponse(`https://api.github.com/repos/${repository.owner}/${repository.repo}/commits/${finality.sha}`, "application/vnd.github+json");
        const mergeCommit = await response.json();
        const parentShas = (mergeCommit?.parents ?? []).map((parent) => parent?.sha);
        if (finality.sha !== finalPrHead && !parentShas.includes(finalPrHead)) {
          caseFailures.push(`${corpusCase.id}: accepted merge-commit does not directly record the final PR head`);
        }
      } catch (error) {
        caseFailures.push(`${corpusCase.id}: cannot verify accepted merge-commit: ${error.message}`);
      }
    }
  }

  if (candidateIndex >= 0 && finalPrHead && candidateIndex >= shas.length - 1) {
    caseFailures.push(`${corpusCase.id}: candidate head must precede the final accepted PR head`);
  }
  if (accepted?.baseSha !== corpusCase.candidate?.baseSha) {
    caseFailures.push(`${corpusCase.id}: accepted base must equal candidate base before remote ordering verification`);
  }
  try {
    const response = await fetchResponse(`https://api.github.com/repos/${repository.owner}/${repository.repo}/compare/${corpusCase.candidate?.headSha}...${accepted?.headSha}`, "application/vnd.github+json");
    const comparison = await response.json();
    if (comparison?.status !== "ahead" || !(comparison?.ahead_by > 0)) {
      caseFailures.push(`${corpusCase.id}: accepted head must be a descendant of candidate head; GitHub compare returned ${comparison?.status ?? "no status"}`);
    }
  } catch (error) {
    caseFailures.push(`${corpusCase.id}: cannot verify candidate-to-accepted ancestry: ${error.message}`);
  }
  return caseFailures;
}

async function verifyRemoteSnapshot(corpusCase, repository, pullRequest, label, range, fingerprint, stats, evidenceUrls) {
  const caseFailures = [];
  const associationUrl = `https://api.github.com/repos/${repository.owner}/${repository.repo}/commits/${range.headSha}/pulls`;
  try {
    const response = await fetchResponse(associationUrl, "application/vnd.github+json");
    const associatedPullRequests = await response.json();
    const found = Array.isArray(associatedPullRequests) && associatedPullRequests.some((item) => {
      const itemRepository = item?.base?.repo?.full_name?.toLowerCase();
      return item?.number === pullRequest.number && itemRepository === `${repository.owner}/${repository.repo}`.toLowerCase();
    });
    if (!found) caseFailures.push(`${corpusCase.id}: ${label} head is not associated with its declared GitHub PR`);
  } catch (error) {
    caseFailures.push(`${corpusCase.id}: cannot verify ${label} PR association: ${error.message}`);
  }

  const diffUrl = `https://github.com/${repository.owner}/${repository.repo}/compare/${range.baseSha}...${range.headSha}.diff`;
  try {
    const response = await fetchResponse(diffUrl, "text/x-diff");
    const finalUrl = new URL(response.url);
    const expectedPath = `/${repository.owner}/${repository.repo}/compare/${range.baseSha}...${range.headSha}.diff`;
    if (finalUrl.protocol !== "https:" || finalUrl.hostname !== "github.com" || finalUrl.pathname !== expectedPath) {
      caseFailures.push(`${corpusCase.id}: ${label} compare diff redirected outside its declared GitHub repository/range`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.toString("utf8", 0, Math.min(bytes.length, 64)).includes("diff --git ")) {
      caseFailures.push(`${corpusCase.id}: ${label} compare endpoint did not return a unified diff`);
    }
    const observedFingerprint = createHash("sha256").update(bytes).digest("hex");
    if (observedFingerprint !== fingerprint) caseFailures.push(`${corpusCase.id}: remote ${label} diff SHA-256 ${observedFingerprint} does not match the manifest`);
    const observedStats = diffStats(bytes);
    for (const field of ["files", "additions", "deletions"]) {
      if (observedStats[field] !== stats[field]) {
        caseFailures.push(`${corpusCase.id}: remote ${label} diff ${field}=${observedStats[field]} does not match manifest ${stats[field]}`);
      }
    }
  } catch (error) {
    caseFailures.push(`${corpusCase.id}: cannot verify frozen ${label} compare diff: ${error.message}`);
  }

  for (const evidenceUrl of evidenceUrls ?? []) {
    const evidence = parseGitHubEvidence(evidenceUrl);
    if (!evidence || evidence.owner !== repository.owner || evidence.repo !== repository.repo) {
      caseFailures.push(`${corpusCase.id}: ${label} evidence is not bound to the declared GitHub repository`);
      continue;
    }
    if (evidence.kind === "commit" && evidence.reference !== range.headSha) {
      caseFailures.push(`${corpusCase.id}: ${label} commit evidence is not bound to the snapshot head`);
    }
  }
  return caseFailures;
}

async function verifyRemoteCase(corpusCase) {
  const repository = parseRepository(corpusCase.repository);
  const pullRequest = parsePullRequest(corpusCase.prUrl);
  if (!repository || !pullRequest) return [`${corpusCase.id}: cannot verify an invalid repository or PR URL`];
  const caseFailures = [];
  let declaredPullRequest;
  try {
    const response = await fetchResponse(`https://api.github.com/repos/${repository.owner}/${repository.repo}/pulls/${pullRequest.number}`, "application/vnd.github+json");
    declaredPullRequest = await response.json();
    if (declaredPullRequest?.number !== pullRequest.number || declaredPullRequest?.base?.repo?.full_name?.toLowerCase() !== `${repository.owner}/${repository.repo}`.toLowerCase()) {
      caseFailures.push(`${corpusCase.id}: declared PR is not bound to the declared GitHub repository`);
    }
  } catch (error) {
    caseFailures.push(`${corpusCase.id}: cannot verify declared PR binding: ${error.message}`);
  }
  caseFailures.push(...await verifyRemoteSnapshot(corpusCase, repository, pullRequest, "candidate", corpusCase.candidate, corpusCase.diffSha256, corpusCase.stats, corpusCase.evidenceUrls));
  if (corpusCase.mode === "adjudicated" || corpusCase.accepted) {
    caseFailures.push(...await verifyRemoteSnapshot(corpusCase, repository, pullRequest, "accepted", corpusCase.accepted, corpusCase.acceptedDiffSha256, corpusCase.acceptedStats, corpusCase.acceptedEvidenceUrls));
    if (declaredPullRequest) {
      caseFailures.push(...await verifyAcceptedFinality(corpusCase, repository, pullRequest, declaredPullRequest));
    }
  }
  return caseFailures;
}

export async function verifyManifestRemotely(corpus) {
  const results = await Promise.all((corpus.cases ?? []).map((corpusCase) => verifyRemoteCase(corpusCase)));
  return results.flat();
}

async function main() {
  if (args.includes("--help") || !inputArgument) {
    console.error("Usage: validate-real-diff-corpus.mjs <corpus.json> [--verify-remote] [--promotion]");
    process.exit(args.includes("--help") ? 0 : 1);
  }
  if (!existsSync(inputPath)) {
    console.error(`Corpus does not exist: ${inputPath}`);
    process.exit(1);
  }
  let corpus;
  try {
    corpus = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (error) {
    console.error(`Cannot parse corpus: ${error.message}`);
    process.exit(1);
  }
  const manifest = validateManifest(inputPath, corpus, { promotion });
  const remoteFailures = verifyRemote && manifest.failures.length === 0 ? await verifyManifestRemotely(corpus) : [];
  const result = {
    status: manifest.failures.length || remoteFailures.length ? "failed" : "ok",
    mode: promotion ? "promotion" : verifyRemote ? "remote-verification" : "discovery",
    remoteVerification: verifyRemote ? (manifest.failures.length ? "not-run: manifest lint failed" : "ran") : "not-requested",
    cases: corpus.cases?.length ?? 0,
    categories: manifest.categories,
    criticalHighFindings: manifest.criticalHighFindings,
    languages: manifest.languages,
    sizes: manifest.sizes,
    failures: [...manifest.failures, ...remoteFailures],
  };
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exit(1);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) await main();
