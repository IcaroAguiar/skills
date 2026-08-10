#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ignoredDirs = new Set([".cache", ".git", ".next", ".turbo", ".venv", "build", "coverage", "dist", "node_modules", "target", "vendor"]);
const sourceExtensions = new Set([".astro", ".c", ".cc", ".cpp", ".cs", ".css", ".go", ".java", ".js", ".jsx", ".kt", ".mjs", ".php", ".py", ".rb", ".rs", ".scss", ".sql", ".swift", ".ts", ".tsx", ".vue"]);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));

const defaultThresholds = {
  newCoverageMin: 80,
  prCoverageMin: 70,
  prCoverageTarget: 90,
  coverageDropMax: 1,
  newDuplicationMax: 3,
  duplicationIncreaseMax: 0.2,
  maxNewFileLines: 500,
  maxLargeFileCountIncrease: 0,
  maxBlockingReviewFindings: 0,
  maxHighReviewFindings: 0,
  minChangedLinesForCoverageGate: 20,
  minChangedLinesForDuplicationGate: 20,
  minCommentDensityForLargeFiles: 0.03,
  touchedLargeFileMaxLineIncrease: 0,
};

function parseArgs(argv) {
  const args = { root: process.cwd(), out: "docs/ai/quality-gate", base: "origin/main", write: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index] || args.root;
    else if (arg.startsWith("--root=")) args.root = arg.split("=").slice(1).join("=");
    else if (arg === "--out") args.out = argv[++index] || args.out;
    else if (arg.startsWith("--out=")) args.out = arg.split("=").slice(1).join("=");
    else if (arg === "--base") args.base = argv[++index] || args.base;
    else if (arg.startsWith("--base=")) args.base = arg.split("=").slice(1).join("=");
    else if (arg === "--write") args.write = true;
    else if (arg === "--json") args.json = true;
  }
  args.root = resolve(args.root);
  args.out = resolve(args.root, args.out);
  return args;
}

function run(command, args, cwd) {
  try {
    return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function walk(root, current = root, files = []) {
  const output = run("find", [relative(root, current) || ".", "-maxdepth", "1", "-mindepth", "1", "-print"], root);
  for (const entry of output.split(/\r?\n/).filter(Boolean)) {
    const abs = resolve(root, entry);
    const name = basename(abs);
    if (ignoredDirs.has(name)) continue;
    const stat = run("stat", ["-f", "%HT:%z", abs], root) || run("stat", ["-c", "%F:%s", abs], root);
    const isDirectory = stat.startsWith("Directory:") || stat.startsWith("directory:");
    if (isDirectory) walk(root, abs, files);
    else files.push(abs);
  }
  return files;
}

function listSourceFiles(root) {
  const output = run("git", ["ls-files"], root);
  const paths = output ? output.split(/\r?\n/).map((path) => join(root, path)) : walk(root);
  return paths.filter((path) => sourceExtensions.has(extname(path)) && !relative(root, path).split(/[\\/]/).some((segment) => ignoredDirs.has(segment)));
}

function countCommentLines(text, extension) {
  let count = 0;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("--") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("<!--")) count += 1;
    else if ([".py", ".rb"].includes(extension) && trimmed.startsWith('"""')) count += 1;
  }
  return count;
}

function collectCodeMetrics(root) {
  const files = listSourceFiles(root);
  const byFile = [];
  let totalLines = 0;
  let commentLines = 0;
  for (const file of files) {
    let text = "";
    try { text = readFileSync(file, "utf8"); } catch { continue; }
    const lines = text.split(/\r?\n/).length;
    const comments = countCommentLines(text, extname(file));
    totalLines += lines;
    commentLines += comments;
    byFile.push({ path: relative(root, file), lines, commentLines: comments, commentDensity: lines ? Number((comments / lines).toFixed(4)) : 0 });
  }
  byFile.sort((a, b) => b.lines - a.lines);
  return {
    sourceFiles: byFile.length,
    totalLines,
    commentLines,
    commentDensity: totalLines ? Number((commentLines / totalLines).toFixed(4)) : null,
    largeFiles: byFile.filter((file) => file.lines > defaultThresholds.maxNewFileLines).length,
    largeFilesWithoutContextComments: byFile.filter((file) => file.lines > defaultThresholds.maxNewFileLines && file.commentDensity < defaultThresholds.minCommentDensityForLargeFiles).slice(0, 20),
    largestFiles: byFile.slice(0, 50),
  };
}

function detectPackageManager(root) {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "yarn.lock"))) return "yarn";
  if (existsSync(join(root, "package-lock.json"))) return "npm";
  if (existsSync(join(root, "bun.lockb")) || existsSync(join(root, "bun.lock"))) return "bun";
  return "";
}

function scriptCommand(manager, name) {
  if (!manager || !name) return "";
  if (manager === "pnpm") return `pnpm ${name}`;
  if (manager === "yarn") return `yarn ${name}`;
  if (manager === "bun") return `bun run ${name}`;
  return `npm run ${name}`;
}

function detectCommands(root) {
  const packageJson = readJson(join(root, "package.json"));
  const manager = detectPackageManager(root);
  const scripts = packageJson?.scripts || {};
  const has = (name) => Object.prototype.hasOwnProperty.call(scripts, name);
  return {
    packageManager: manager,
    install: manager === "pnpm" ? "pnpm install --frozen-lockfile" : manager === "yarn" ? "yarn install --immutable" : manager === "bun" ? "bun install --frozen-lockfile" : existsSync(join(root, "package.json")) ? "npm ci" : "",
    lint: has("lint") ? scriptCommand(manager, "lint") : existsSync(join(root, "eslint.config.js")) ? "npx eslint ." : existsSync(join(root, "biome.json")) || existsSync(join(root, "biome.jsonc")) ? "npx biome ci ." : "",
    typecheck: has("typecheck") ? scriptCommand(manager, "typecheck") : "",
    test: has("test") ? scriptCommand(manager, "test") : "",
    coverage: has("test:coverage") ? scriptCommand(manager, "test:coverage") : has("coverage") ? scriptCommand(manager, "coverage") : "",
    build: has("build") ? scriptCommand(manager, "build") : "",
  };
}

function parseCoverageSummary(root) {
  for (const candidate of ["coverage/coverage-summary.json", "reports/coverage/coverage-summary.json"]) {
    const json = readJson(join(root, candidate));
    const total = json?.total;
    if (total?.lines?.pct !== undefined) return { path: candidate, linesPct: Number(total.lines.pct), statementsPct: Number(total.statements?.pct ?? total.lines.pct), branchesPct: Number(total.branches?.pct ?? 0), functionsPct: Number(total.functions?.pct ?? 0) };
  }
  return null;
}

function parseJscpd(root) {
  for (const candidate of ["report/jscpd-report.json", "reports/jscpd.json", "jscpd-report.json"]) {
    const json = readJson(join(root, candidate));
    const statistics = json?.statistics || json?.statistic || json;
    const total = statistics?.total || statistics;
    const percentage = total?.percentage ?? total?.duplicatedLinesPercentage ?? total?.duplicatedPercentage;
    if (percentage !== undefined) return { path: candidate, duplicatedLinesPct: Number(percentage), clones: Number(total?.clones ?? total?.duplicates ?? 0) };
  }
  return null;
}

function detectTooling(root) {
  return {
    eslint: existsSync(join(root, "eslint.config.js")) || existsSync(join(root, ".eslintrc")) || existsSync(join(root, ".eslintrc.json")),
    biome: existsSync(join(root, "biome.json")) || existsSync(join(root, "biome.jsonc")),
    jscpd: existsSync(join(root, ".jscpd.json")) || existsSync(join(root, "jscpd.config.js")),
    sonar: existsSync(join(root, "sonar-project.properties")),
    codecov: existsSync(join(root, "codecov.yml")) || existsSync(join(root, ".codecov.yml")),
    githubActions: existsSync(join(root, ".github/workflows")),
  };
}

function buildBaseline(root) {
  const commands = detectCommands(root);
  const code = collectCodeMetrics(root);
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    rootName: basename(root),
    strategy: "ratchet-clean-as-you-code",
    commands,
    tooling: detectTooling(root),
    metrics: {
      coverage: parseCoverageSummary(root),
      prCoveragePolicy: { minimum: defaultThresholds.prCoverageMin, target: defaultThresholds.prCoverageTarget },
      duplication: parseJscpd(root),
      code,
      review: { blockingFindings: 0, highFindings: 0, mediumFindings: 0 },
    },
  };
}

function buildConfig(baseline, base, outRelative) {
  return {
    schemaVersion: 2,
    base,
    mode: "ratchet-clean-as-you-code",
    thresholds: defaultThresholds,
    policies: {
      touchedBadAreaMustImprove: true,
      publishPrSummary: true,
      allowBaselineRefreshOnlyOnDefaultBranch: true,
      autoImproveFromFeedback: true,
      reviewLoop: {
        blockOnlyAdjudicatedOrCalibratedDetectors: true,
        calibratedDetectors: [],
      },
    },
    requiredChecks: {
      install: Boolean(baseline.commands.install),
      lint: Boolean(baseline.commands.lint),
      typecheck: Boolean(baseline.commands.typecheck),
      test: Boolean(baseline.commands.test),
      build: Boolean(baseline.commands.build),
      coverage: Boolean(baseline.commands.coverage || baseline.metrics.coverage),
      duplication: Boolean(baseline.tooling.jscpd || baseline.metrics.duplication),
      secretScan: true,
      reviewLoopPacket: true,
    },
    reportPaths: {
      coverageSummary: baseline.metrics.coverage?.path || "coverage/coverage-summary.json",
      lcov: "coverage/lcov.info",
      jscpd: baseline.metrics.duplication?.path || "report/jscpd-report.json",
      reviewLoopPacket: `${outRelative}/review-loop-packet.json`,
      feedback: `${outRelative}/review-feedback.json`,
      trend: `${outRelative}/quality-trend.jsonl`,
    },
    commands: baseline.commands,
  };
}

function copyVendorArtifacts(outDirectory) {
  const vendorDirectory = join(outDirectory, "vendor");
  mkdirSync(vendorDirectory, { recursive: true });
  const artifacts = [
    "collect-review-context.mjs",
    "fingerprint-review-state.mjs",
    "lib/external-toolbelt.mjs",
    "lib/gate-categories.mjs",
  ];
  for (const artifact of artifacts) {
    const source = join(scriptDirectory, artifact);
    const target = join(vendorDirectory, artifact);
    if (!existsSync(source)) {
      throw new Error(`Review Loop vendor artifact missing from source tree: ${artifact}`);
    }
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target);
  }
}

function checkerSource() {
  return `#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const gateDir = dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(readFileSync(join(gateDir, "baseline.json"), "utf8"));
const config = JSON.parse(readFileSync(join(gateDir, "quality-gate.config.json"), "utf8"));
const failures = [];
const warnings = [];
const improvements = [];
const sourceExtensions = new Set(${JSON.stringify([...sourceExtensions])});
const ignoredDirs = new Set(${JSON.stringify([...ignoredDirs])});

function readJson(path) { try { return JSON.parse(readFileSync(join(root, path), "utf8")); } catch { return null; } }
function run(args) { try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); } catch { return ""; } }
function fail(id, message) { failures.push({ id, message }); }
function warn(id, message) { warnings.push({ id, message }); }
function pct(value) { return value === null || value === undefined ? "n/a" : String(value) + "%"; }
function delta(current, previous) { return current === null || current === undefined || previous === null || previous === undefined ? null : Number((current - previous).toFixed(2)); }
function statusIcon(ok) { return ok ? "PASS" : "FAIL"; }
function isGateArtifact(path) {
  const gateRelative = relative(root, gateDir);
  return path === gateRelative || path.startsWith(gateRelative + "/") || path.startsWith(gateRelative + "\\\\");
}

function changedFiles() {
  const base = process.env.REVIEW_LOOP_BASE || config.base || "origin/main";
  const output = run(["diff", "--name-only", base + "...HEAD"]);
  return output ? output.split(/\\r?\\n/).filter((path) => path && !isGateArtifact(path)) : [];
}

function lineCount(path) { try { return readFileSync(join(root, path), "utf8").split(/\\r?\\n/).length; } catch { return 0; } }
function commentDensity(path) {
  let text = "";
  try { text = readFileSync(join(root, path), "utf8"); } catch { return 0; }
  const lines = text.split(/\\r?\\n/);
  const commentLines = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("--") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("<!--");
  }).length;
  return lines.length ? Number((commentLines / lines.length).toFixed(4)) : 0;
}

function walk(current = root, files = []) {
  for (const entry of execFileSync("find", [relative(root, current) || ".", "-maxdepth", "1", "-mindepth", "1", "-print"], { cwd: root, encoding: "utf8" }).trim().split(/\\r?\\n/).filter(Boolean)) {
    const abs = join(root, entry);
    if (ignoredDirs.has(basename(abs))) continue;
    const type = execFileSync("stat", ["-f", "%HT", abs], { encoding: "utf8" }).trim();
    if (type === "Directory") walk(abs, files);
    else files.push(abs);
  }
  return files;
}

function sourceFiles() {
  const tracked = run(["ls-files"]);
  const files = tracked ? tracked.split(/\\r?\\n/).map((path) => join(root, path)) : walk();
  return files.filter((path) => {
    const relativePath = relative(root, path);
    return sourceExtensions.has(extname(path)) && !isGateArtifact(relativePath) && !relativePath.split(/[\\\\/]/).some((segment) => ignoredDirs.has(segment));
  });
}

function collectCodeMetrics() {
  const byFile = [];
  let totalLines = 0;
  let commentLines = 0;
  for (const abs of sourceFiles()) {
    let text = "";
    try { text = readFileSync(abs, "utf8"); } catch { continue; }
    const rel = relative(root, abs);
    const lines = text.split(/\\r?\\n/).length;
    const density = commentDensity(rel);
    const comments = Math.round(lines * density);
    totalLines += lines;
    commentLines += comments;
    byFile.push({ path: rel, lines, commentLines: comments, commentDensity: density });
  }
  byFile.sort((a, b) => b.lines - a.lines);
  return { sourceFiles: byFile.length, totalLines, commentLines, commentDensity: totalLines ? Number((commentLines / totalLines).toFixed(4)) : null, largeFiles: byFile.filter((file) => file.lines > config.thresholds.maxNewFileLines).length, largestFiles: byFile.slice(0, 50) };
}

function coverageMetric() {
  const json = readJson(config.reportPaths.coverageSummary);
  return json?.total?.lines?.pct === undefined ? null : Number(json.total.lines.pct);
}
function changedLineMap() {
  const base = process.env.REVIEW_LOOP_BASE || config.base || "origin/main";
  const output = run(["diff", "--unified=0", base + "...HEAD"]);
  const map = new Map();
  let currentFile = "";
  for (const line of output.split(/\\r?\\n/)) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice("+++ b/".length);
      if (!map.has(currentFile)) map.set(currentFile, new Set());
      continue;
    }
    const match = line.match(/^@@ -\\d+(?:,\\d+)? \\+(\\d+)(?:,(\\d+))? @@/);
    if (!match || !currentFile) continue;
    const start = Number(match[1]);
    const count = Number(match[2] || 1);
    for (let offset = 0; offset < count; offset += 1) map.get(currentFile).add(start + offset);
  }
  return map;
}
function lcovFileCoverage() {
  let text = "";
  try { text = readFileSync(join(root, config.reportPaths.lcov), "utf8"); } catch { return null; }
  const files = new Map();
  let current = "";
  for (const line of text.split(/\\r?\\n/)) {
    if (line.startsWith("SF:")) {
      current = relative(root, line.slice(3));
      if (current.startsWith("..")) current = line.slice(3);
      if (!files.has(current)) files.set(current, new Map());
    } else if (line.startsWith("DA:") && current) {
      const [lineNumber, hits] = line.slice(3).split(",");
      files.get(current).set(Number(lineNumber), Number(hits));
    } else if (line === "end_of_record") {
      current = "";
    }
  }
  return files;
}
function prCoverageMetric() {
  const changed = changedLineMap();
  const lcov = lcovFileCoverage();
  if (!lcov) return null;
  let covered = 0;
  let total = 0;
  const uncovered = [];
  for (const [file, lines] of changed.entries()) {
    const fileCoverage = lcov.get(file);
    if (!fileCoverage) continue;
    for (const line of lines) {
      if (!fileCoverage.has(line)) continue;
      total += 1;
      if (fileCoverage.get(line) > 0) covered += 1;
      else uncovered.push(file + ":" + line);
    }
  }
  return { pct: total ? Number(((covered / total) * 100).toFixed(2)) : null, covered, total, uncovered: uncovered.slice(0, 25), path: config.reportPaths.lcov };
}
function duplicationMetric() {
  const json = readJson(config.reportPaths.jscpd);
  const stats = json?.statistics || json?.statistic || json;
  const total = stats?.total || stats;
  const value = total?.percentage ?? total?.duplicatedLinesPercentage ?? total?.duplicatedPercentage;
  return value === undefined ? null : Number(value);
}
function findingKey(finding) {
  if (!finding || typeof finding !== "object") return "";
  if (typeof finding.findingId === "string" && finding.findingId) return "id:" + finding.findingId;
  if (typeof finding.id === "string" && finding.id) return "id:" + finding.id;
  return [finding.rule, finding.repo, finding.file, finding.line, finding.text].map((value) => String(value ?? "").trim()).join("|");
}
function uniqueFindings(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = findingKey(finding);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function adjudicatedReceiptFindings(packet) {
  const repos = Array.isArray(packet.repositories) ? packet.repositories : [];
  return [
    ...(Array.isArray(packet.adjudicatedFindings) ? packet.adjudicatedFindings : []),
    ...(Array.isArray(packet.adjudication?.findings) ? packet.adjudication.findings : []),
    ...repos.flatMap((repo) => [
      ...(Array.isArray(repo.adjudicatedFindings) ? repo.adjudicatedFindings : []),
      ...(Array.isArray(repo.adjudication?.findings) ? repo.adjudication.findings : []),
    ]),
  ].filter((finding) => {
    const adjudication = String(finding?.adjudication ?? finding?.status ?? "").toLowerCase();
    const decision = String(finding?.decision ?? finding?.disposition ?? "").toLowerCase();
    return adjudication === "adjudicated" && ["block", "blocking", "reject"].includes(decision) && typeof finding?.evidence === "string" && finding.evidence.trim();
  });
}
function reviewLoopPacketMetric(feedback) {
  const packet = readJson(config.reportPaths.reviewLoopPacket);
  if (!packet) return null;
  const repos = Array.isArray(packet.repositories) ? packet.repositories : [];
  const signals = uniqueFindings([
    ...(Array.isArray(packet.findings) ? packet.findings : []),
    ...repos.flatMap((repo) => Array.isArray(repo.findings) ? repo.findings : []),
  ]);
  const scopedFalsePositiveKeys = new Set(feedback.scopedFalsePositiveKeys);
  const exempt = (finding) => scopedFalsePositiveKeys.has(findingKey(finding));
  const configuredDetectors = Array.isArray(config.policies?.reviewLoop?.calibratedDetectors) ? config.policies.reviewLoop.calibratedDetectors : [];
  const calibratedDetectors = new Set(configuredDetectors
    .filter((detector) => detector && typeof detector.rule === "string" && detector.rule && typeof detector.calibrationEvidence === "string" && detector.calibrationEvidence.trim())
    .map((detector) => detector.rule));
  const adjudicated = uniqueFindings(adjudicatedReceiptFindings(packet)).filter((finding) => !exempt(finding));
  const calibrated = signals.filter((finding) => calibratedDetectors.has(finding.rule) && !exempt(finding));
  const blockers = uniqueFindings([...adjudicated, ...calibrated]);
  const highSignals = signals.filter((finding) => finding.severity === "high").length;
  const mediumSignals = signals.filter((finding) => finding.severity === "medium").length;
  return {
    blocking: blockers.length,
    high: highSignals,
    medium: mediumSignals,
    signals: signals.length,
    adjudicated: adjudicated.length,
    calibrated: calibrated.length,
    suppressedFalsePositives: [...adjudicatedReceiptFindings(packet), ...signals].filter(exempt).length,
  };
}
function feedbackMetric() {
  const feedback = readJson(config.reportPaths.feedback);
  const entries = Array.isArray(feedback?.feedback) ? feedback.feedback : [];
  const falsePositive = entries.filter((entry) => entry.outcome === "false-positive").length;
  const falseNegative = entries.filter((entry) => entry.outcome === "false-negative").length;
  const scopedFalsePositiveKeys = entries
    .filter((entry) => entry.outcome === "false-positive")
    .map((entry) => entry.findingId ? "id:" + entry.findingId : entry.fingerprint ? String(entry.fingerprint) : findingKey(entry.finding))
    .filter(Boolean);
  const unscopedFalsePositives = entries.filter((entry) => entry.outcome === "false-positive" && !entry.findingId && !entry.fingerprint && !findingKey(entry.finding)).length;
  if (unscopedFalsePositives) warn("review-loop.feedback-unscoped-false-positive", "False-positive feedback without findingId, fingerprint, or finding location is tracked but cannot suppress a future blocker.");
  for (const entry of entries.filter((entry) => entry.outcome === "false-negative")) {
    improvements.push({ type: "false-negative", rule: entry.rule || "unknown", recommendation: entry.recommendation || "Add or tune a detector/test so this escaped issue is caught before merge.", source: entry.case || entry.source || "review-feedback" });
  }
  return { total: entries.length, falsePositive, falseNegative, scopedFalsePositiveKeys, unscopedFalsePositives };
}

const files = changedFiles();
const code = collectCodeMetrics();
const coverage = coverageMetric();
const prCoverage = prCoverageMetric();
const duplication = duplicationMetric();
const feedback = feedbackMetric();
const review = reviewLoopPacketMetric(feedback);
const baselineCoverage = baseline.metrics.coverage?.linesPct;
const baselineDuplication = baseline.metrics.duplication?.duplicatedLinesPct;

if (config.requiredChecks.coverage && coverage === null) fail("coverage.missing", "Coverage is required but " + config.reportPaths.coverageSummary + " was not found.");
else if (coverage !== null && baselineCoverage !== undefined) {
  if (coverage < config.thresholds.newCoverageMin) fail("coverage.minimum", "Coverage " + coverage + "% is below minimum " + config.thresholds.newCoverageMin + "%.");
  if (coverage + config.thresholds.coverageDropMax < baselineCoverage) fail("coverage.ratchet", "Coverage dropped from " + baselineCoverage + "% to " + coverage + "%.");
}
if (prCoverage === null) warn("coverage.pr-missing", "PR coverage requires " + config.reportPaths.lcov + " to calculate changed-line coverage.");
else if (prCoverage.total >= config.thresholds.minChangedLinesForCoverageGate && prCoverage.pct < config.thresholds.prCoverageMin) {
  fail("coverage.pr-minimum", "PR changed-line coverage " + prCoverage.pct + "% is below minimum " + config.thresholds.prCoverageMin + "%.");
} else if (prCoverage.total > 0 && prCoverage.total < config.thresholds.minChangedLinesForCoverageGate) {
  warn("coverage.pr-small-change", "PR changed-line coverage has only " + prCoverage.total + " executable changed lines; report it but do not hard-block by percentage noise.");
}
if (config.requiredChecks.duplication && duplication === null) warn("duplication.missing", "Duplication report " + config.reportPaths.jscpd + " was not found; install/run jscpd to enforce this gate.");
else if (duplication !== null) {
  if (duplication > config.thresholds.newDuplicationMax) fail("duplication.maximum", "Duplication " + duplication + "% exceeds " + config.thresholds.newDuplicationMax + "%.");
  if (baselineDuplication !== undefined && duplication > baselineDuplication + config.thresholds.duplicationIncreaseMax) fail("duplication.ratchet", "Duplication increased from " + baselineDuplication + "% to " + duplication + "%.");
}
if (code.largeFiles > baseline.metrics.code.largeFiles + config.thresholds.maxLargeFileCountIncrease) fail("code.large-file-ratchet", "Large file count increased from " + baseline.metrics.code.largeFiles + " to " + code.largeFiles + ".");

const baselineFileByPath = new Map((baseline.metrics.code.largestFiles || []).map((file) => [file.path, file]));
for (const file of files) {
  if (!sourceExtensions.has(extname(file))) continue;
  const lines = lineCount(file);
  const density = commentDensity(file);
  const baselineFile = baselineFileByPath.get(file);
  if (lines > config.thresholds.maxNewFileLines) fail("file.size", "Changed file " + file + " has " + lines + " lines; limit is " + config.thresholds.maxNewFileLines + ". Split it or justify in review.");
  if (lines > config.thresholds.maxNewFileLines && density < config.thresholds.minCommentDensityForLargeFiles) warn("file.context-comments", "Large changed file " + file + " has low context-comment density. Add useful why/invariant comments or split responsibility.");
  if (config.policies.touchedBadAreaMustImprove && baselineFile && baselineFile.lines > config.thresholds.maxNewFileLines && lines > baselineFile.lines + config.thresholds.touchedLargeFileMaxLineIncrease) {
    fail("touched-bad-area.must-improve", "Touched large file " + file + " grew from " + baselineFile.lines + " to " + lines + " lines. Improve/split it or add an explicit quality-gate exception.");
  }
}
if (config.requiredChecks.reviewLoopPacket && review === null) fail("review-loop.missing", "Review Loop packet " + config.reportPaths.reviewLoopPacket + " was not found.");
else if (review) {
  if (review.blocking > config.thresholds.maxBlockingReviewFindings) fail("review-loop.blocking", "Review Loop has " + review.blocking + " adjudicated/calibrated blocking finding(s); " + review.signals + " collector signal(s) remain review context only.");
}

const rows = [
  { metric: "PR test coverage", baseline: prCoverage ? String(prCoverage.covered) + "/" + String(prCoverage.total) + " changed lines" : "n/a", current: prCoverage ? pct(prCoverage.pct) : "n/a", target: ">=" + pct(config.thresholds.prCoverageMin) + " (goal " + pct(config.thresholds.prCoverageTarget) + ")", delta: "n/a", status: !failures.some((f) => f.id === "coverage.pr-minimum") },
  { metric: "Global test coverage", baseline: pct(baselineCoverage), current: pct(coverage), target: pct(config.thresholds.newCoverageMin), delta: delta(coverage, baselineCoverage), status: !failures.some((f) => f.id === "coverage.minimum" || f.id === "coverage.ratchet" || f.id === "coverage.missing") },
  { metric: "Duplication", baseline: pct(baselineDuplication), current: pct(duplication), target: "<= " + pct(config.thresholds.newDuplicationMax), delta: delta(duplication, baselineDuplication), status: !failures.some((f) => f.id.startsWith("duplication.")) },
  { metric: "Large files", baseline: baseline.metrics.code.largeFiles, current: code.largeFiles, target: "no increase", delta: code.largeFiles - baseline.metrics.code.largeFiles, status: !failures.some((f) => f.id.startsWith("code.") || f.id.startsWith("file.") || f.id.startsWith("touched-bad-area")) },
  { metric: "Review Loop adjudicated/calibrated blockers", baseline: 0, current: review ? String(review.blocking) + " blockers; " + String(review.signals) + " signals" : "n/a", target: 0, delta: review?.blocking ?? null, status: !failures.some((f) => f.id === "review-loop.blocking" || f.id === "review-loop.missing") },
  { metric: "Feedback false negatives", baseline: "tracked", current: feedback.falseNegative, target: 0, delta: feedback.falseNegative, status: feedback.falseNegative === 0 },
];
const markdown = [
  "# Review Loop Quality Gate",
  "",
  "Status: **" + (failures.length ? "FAIL" : "PASS") + "**",
  "",
  "Como ler: 'Medido nesta PR' mostra o valor/check executado agora; 'Regra do gate' mostra o criterio esperado; 'Decisao' indica se aquela linha bloqueia o merge/check.",
  "",
  "| Verificacao | Referencia/base | Medido nesta PR | Regra do gate | Diferenca/tempo | Decisao |",
  "| --- | ---: | ---: | ---: | ---: | --- |",
  ...rows.map((row) => "| " + row.metric + " | " + row.baseline + " | " + row.current + " | " + row.target + " | " + (row.delta ?? "n/a") + " | " + statusIcon(row.status) + " |"),
  "",
  "## Failures",
  failures.length ? failures.map((item) => "- **" + item.id + "**: " + item.message).join("\\n") : "- None",
  "",
  "## Warnings",
  warnings.length ? warnings.map((item) => "- **" + item.id + "**: " + item.message).join("\\n") : "- None",
  "",
  "## Auto-Improve Queue",
  improvements.length ? improvements.map((item) => "- **" + item.type + " / " + item.rule + "**: " + item.recommendation + " (source: " + item.source + ")").join("\\n") : "- None",
  "",
].join("\\n");
const report = { status: failures.length ? "fail" : "pass", generatedAt: new Date().toISOString(), failures, warnings, improvements, metrics: { coverage, prCoverage, duplication, code, review, feedback, rows }, changedFiles: files };
mkdirSync(gateDir, { recursive: true });
writeFileSync(join(gateDir, "quality-gate-report.json"), JSON.stringify(report, null, 2) + "\\n");
writeFileSync(join(gateDir, "quality-gate-report.md"), markdown + "\\n");
writeFileSync(join(gateDir, "quality-trend-entry.json"), JSON.stringify({ generatedAt: report.generatedAt, status: report.status, coverage, prCoverage, duplication, largeFiles: code.largeFiles, review, feedback }, null, 2) + "\\n");
writeFileSync(join(gateDir, "auto-improvement-queue.json"), JSON.stringify({ generatedAt: report.generatedAt, improvements, feedback }, null, 2) + "\\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\\n");
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
`;
}

function refreshSource() {
  return `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const gateDir = dirname(fileURLToPath(import.meta.url));
const baselinePath = join(gateDir, "baseline.json");
const reportPath = join(gateDir, "quality-gate-report.json");
const trendPath = join(gateDir, "quality-trend.jsonl");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const report = JSON.parse(readFileSync(reportPath, "utf8"));
if (report.status !== "pass") {
  console.error("Refusing to refresh baseline from a failing quality gate report.");
  process.exit(1);
}
baseline.generatedAt = new Date().toISOString();
baseline.metrics.coverage = report.metrics.coverage === null || report.metrics.coverage === undefined ? baseline.metrics.coverage : { ...(baseline.metrics.coverage || { path: "coverage/coverage-summary.json" }), linesPct: report.metrics.coverage };
baseline.metrics.duplication = report.metrics.duplication === null || report.metrics.duplication === undefined ? baseline.metrics.duplication : { ...(baseline.metrics.duplication || { path: "report/jscpd-report.json" }), duplicatedLinesPct: report.metrics.duplication };
baseline.metrics.code = report.metrics.code || baseline.metrics.code;
baseline.metrics.review = { blockingFindings: report.metrics.review?.blocking || 0, highFindings: report.metrics.review?.high || 0, mediumFindings: report.metrics.review?.medium || 0 };
writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\\n");
appendFileSync(trendPath, JSON.stringify({ refreshedAt: baseline.generatedAt, status: report.status, metrics: report.metrics }) + "\\n");
console.log("Baseline refreshed from passing quality gate report.");
`;
}

function workflowContextResolverSource() {
  return `const { appendFileSync, existsSync, readFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");

const outputPath = process.env.GITHUB_OUTPUT || "";
const eventName = process.env.GITHUB_EVENT_NAME || "";
const eventPath = process.env.GITHUB_EVENT_PATH || "";
const workspaceSha = process.env.GITHUB_SHA || "";
const zeroSha = "0".repeat(40);
const isFullSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);

function runGit(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function resolveCommit(value) {
  if (!isFullSha(value)) return "";
  const resolved = runGit(["rev-parse", "--verify", value + "^{commit}"]);
  return isFullSha(resolved) ? resolved.toLowerCase() : "";
}

function resolveParent(value) {
  const parent = runGit(["rev-parse", "--verify", value + "^"]);
  const resolved = resolveCommit(parent);
  if (!resolved) throw new Error("Cannot resolve a parent commit for the checked-out candidate.");
  return resolved;
}

if (!outputPath) throw new Error("GITHUB_OUTPUT was not available in the workflow environment.");
if (!eventName) throw new Error("GITHUB_EVENT_NAME was not available in the workflow environment.");
if (!eventPath || !existsSync(eventPath)) throw new Error("GITHUB_EVENT_PATH was not available in the workflow environment.");

let eventPayload;
try {
  eventPayload = JSON.parse(readFileSync(eventPath, "utf8"));
} catch {
  throw new Error("The GitHub event payload was not valid JSON.");
}

const candidateHead = resolveCommit(workspaceSha) || resolveCommit(runGit(["rev-parse", "--verify", "HEAD"]));
if (!candidateHead) throw new Error("Cannot resolve a full commit SHA for the checked-out candidate.");

let baseSha;
if (eventName === "pull_request") {
  const eventBase = eventPayload?.pull_request?.base?.sha;
  if (!isFullSha(eventBase)) throw new Error("The pull_request event did not provide a full base commit SHA.");
  baseSha = resolveCommit(eventBase);
  if (!baseSha) throw new Error("The pull_request base commit is not available in the checkout.");
} else if (eventName === "push") {
  const eventBefore = eventPayload?.before;
  if (!eventBefore || eventBefore === zeroSha) {
    baseSha = resolveParent(candidateHead);
  } else {
    if (!isFullSha(eventBefore)) throw new Error("The push event did not provide a full before commit SHA.");
    baseSha = resolveCommit(eventBefore);
    if (!baseSha) throw new Error("The push before commit is not available in the checkout.");
  }
} else if (eventName === "workflow_dispatch") {
  baseSha = resolveParent(candidateHead);
} else {
  throw new Error("Unsupported event for Review Loop quality-gate base resolution.");
}

appendFileSync(outputPath, ["base=" + baseSha, "head=" + candidateHead, ""].join("\\n"));
`;
}

function workflowSource(config, outRelative) {
  const commands = config.commands;
  const outPrefix = outRelative && outRelative !== "." ? `${outRelative}/` : "";
  const resolverLines = workflowContextResolverSource().split("\n").map((line) => `          ${line}`);
  const lines = [
    "name: Review Loop Quality Gate",
    "run-name: Review Loop Quality Gate - ${{ github.ref_name }}",
    "",
    "on:",
    "  pull_request:",
    "    branches: [main]",
    "  push:",
    "    branches: [main]",
    "  workflow_dispatch:",
    "    inputs:",
    "      refresh_baseline:",
    "        description: Refresh baseline after a passing main/default-branch run",
    "        required: false",
    "        default: false",
    "        type: boolean",
    "",
    "permissions:",
    "  contents: read",
    "",
    "concurrency:",
    "  group: review-loop-quality-gate-${{ github.workflow }}-${{ github.ref }}",
    "  cancel-in-progress: true",
    "",
    "jobs:",
    "  quality-gate:",
    "    runs-on: ubuntu-latest",
    "    timeout-minutes: 30",
    "    steps:",
    "      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0",
    "        with:",
    "          fetch-depth: 0",
    "      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0",
    "        if: hashFiles('package.json') != ''",
    "        with:",
    "          node-version: 24",
  ];
  if (commands.install) lines.push("      - name: Install dependencies", `        run: ${commands.install}`);
  if (commands.lint) lines.push("      - name: Lint", `        run: ${commands.lint}`);
  if (commands.typecheck) lines.push("      - name: Typecheck", `        run: ${commands.typecheck}`);
  if (commands.coverage) lines.push("      - name: Tests with coverage", `        run: ${commands.coverage}`);
  else if (commands.test) lines.push("      - name: Tests", `        run: ${commands.test}`);
  if (commands.build) lines.push("      - name: Build", `        run: ${commands.build}`);
  lines.push(
    "      - name: Secret scan",
    "        uses: gitleaks/gitleaks-action@ff98106e4c7b2bc287b24eaf42907196329070c7 # v2.3.9",
    "        env:",
    "          GITLEAKS_ENABLE_COMMENTS: false",
    "      - name: Resolve review-loop context",
    "        id: review_loop_context",
    "        env:",
    "          GITHUB_EVENT_NAME: ${{ github.event_name }}",
    "          GITHUB_EVENT_PATH: ${{ github.event_path }}",
    "          GITHUB_SHA: ${{ github.sha }}",
    "        run: |",
    "          node --input-type=commonjs <<'NODE'",
    ...resolverLines,
    "          NODE",
    "      - name: Review Loop packet",
    "        env:",
    "          REVIEW_LOOP_BASE: ${{ steps.review_loop_context.outputs.base }}",
    "          REVIEW_LOOP_HEAD: ${{ steps.review_loop_context.outputs.head }}",
    `        run: node ${outPrefix}vendor/collect-review-context.mjs --candidate-mode commit --base "${"$"}REVIEW_LOOP_BASE" --head "${"$"}REVIEW_LOOP_HEAD" --json > ${outPrefix}review-loop-packet.json`,
    "      - name: Ratchet quality gate",
    "        env:",
    "          REVIEW_LOOP_BASE: ${{ steps.review_loop_context.outputs.base }}",
    `        run: node ${outPrefix}check-ratchet.mjs`,
    "      - name: Refresh baseline artifact",
    "        if: github.event_name == 'workflow_dispatch' && inputs.refresh_baseline == true && github.ref == 'refs/heads/main'",
    `        run: node ${outRelative}/refresh-baseline.mjs`,
    "      - name: Upload quality artifacts",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2",
    "        if: always()",
    "        with:",
    "          name: review-loop-quality-gate",
    "          retention-days: 14",
    "          path: |",
    `            ${outRelative}/*report*.json`,
    `            ${outRelative}/*report*.md`,
    `            ${outRelative}/quality-trend-entry.json`,
    `            ${outRelative}/auto-improvement-queue.json`,
    `            ${outRelative}/review-loop-packet.json`
  );
  return `${lines.join("\n")}\n`;
}

function readmeSource() {
  return `# Review Loop Quality Gate Ratchet

This package was generated by \`review-loop/scripts/generate-quality-gate-ratchet.mjs\`.

## Policy

- Keep new code clean first; do not require a big-bang cleanup of legacy code.
- Every PR publishes floating metrics in a Markdown table: PR changed-line coverage, global coverage, duplication, large files, review blockers, baseline, current value, target, delta, and status.
- Block regressions: adjudicated review receipts or explicitly calibrated deterministic detectors, secret leaks, failing native checks, coverage drops, duplication increases, and large-file growth. Collector severities remain reviewer signals.
- Touched bad areas must improve or stay flat. If a PR touches an already-large file, the file must not grow without explicit review policy change.
- Baseline refresh is explicit and only allowed from a passing default-branch quality gate report.
- False positives and false negatives are tracked in \`review-feedback.json\`; a false positive suppresses only its exact \`findingId\`, \`fingerprint\`, or location-bearing \`finding\`. False negatives produce an auto-improvement queue.
- Useful comments explain invariants, business rules, edge cases, and agent navigation context. Narrating syntax does not count as maintainability.

## Files

- \`baseline.json\`: current accepted state.
- \`quality-gate.config.json\`: thresholds and required checks.
- \`check-ratchet.mjs\`: CI checker and PR report generator.
- \`refresh-baseline.mjs\`: controlled baseline refresh after a passing gate.
- \`review-feedback.json\`: optional human/reviewer feedback for false positives and false negatives.
- \`github-action-quality-gate-ratchet.yml\`: workflow template; copy or merge into \`.github/workflows/quality-gate.yml\`.

## Feedback schema

\`review-feedback.json\` accepts:

\`\`\`json
{
  "feedback": [
    {
      "case": "pr-123",
      "rule": "webhook-without-signature-verification",
      "outcome": "false-negative",
      "recommendation": "Add a detector for provider secret-token validation gaps."
    },
    {
      "case": "pr-124",
      "outcome": "false-positive",
      "findingId": "collector:app/src/example.ts:42"
    }
  ]
}
\`\`\`

Use \`false-positive\`, \`false-negative\`, or \`severity-mismatch\` as outcomes. To exempt a known false positive, provide its exact \`findingId\`, \`fingerprint\`, or a \`finding\` object with rule, repo, file, line, and text; a rule-only exemption is intentionally ignored.
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseline = buildBaseline(args.root);
  const outRelative = relative(args.root, args.out) || ".";
  const config = buildConfig(baseline, args.base, outRelative);
  const files = {
    "baseline.json": JSON.stringify(baseline, null, 2) + "\n",
    "quality-gate.config.json": JSON.stringify(config, null, 2) + "\n",
    "check-ratchet.mjs": checkerSource(),
    "refresh-baseline.mjs": refreshSource(),
    "review-feedback.json": JSON.stringify({ feedback: [] }, null, 2) + "\n",
    "github-action-quality-gate-ratchet.yml": workflowSource(config, outRelative),
    "README.md": readmeSource(),
  };
  const packet = { status: "ok", root: args.root, out: args.out, write: args.write, baseline, config, files: Object.keys(files).map((name) => relative(args.root, join(args.out, name))) };
  if (args.write) {
    mkdirSync(args.out, { recursive: true });
    copyVendorArtifacts(args.out);
    for (const [name, content] of Object.entries(files)) writeFileSync(join(args.out, name), content);
  }
  if (args.json) console.log(JSON.stringify(packet, null, 2));
  else {
    console.log(`Review Loop quality gate ratchet ${args.write ? "written" : "planned"} for ${args.root}`);
    console.log(`Output: ${args.out}`);
    console.log(`Commands: ${Object.entries(config.commands).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join(", ") || "none detected"}`);
    console.log(`Coverage: ${baseline.metrics.coverage?.linesPct ?? "not detected"}`);
    console.log(`Duplication: ${baseline.metrics.duplication?.duplicatedLinesPct ?? "not detected"}`);
    console.log(`Largest file: ${baseline.metrics.code.largestFiles[0]?.path ?? "none"} (${baseline.metrics.code.largestFiles[0]?.lines ?? 0} lines)`);
    if (!args.write) console.log("Run again with --write to create the ratchet files.");
  }
}

main();
