# CI Quality Gate Ratchet Workflow

When the user asks to create, improve, or standardize a CI quality gate, generate a repository-specific ratchet instead of copying a generic workflow.

Research-backed baseline:

- Follow the Clean as You Code model: block regressions in new or changed code first, and use overall metrics as ratchets rather than requiring legacy code to be fixed in one PR.
- Use new-code conditions as hard gates: no new blocking/high review findings, no secret leaks, lint/typecheck/test/build pass, coverage on new code is sufficient, and duplication in new code is limited.
- Use overall metrics as ratchets: coverage must not drop beyond a small tolerance, duplication must not increase, and counts of large files/large functions should not grow.
- Use a small-change fudge factor for coverage and duplication gates so very small PRs are not overblocked by percentage noise.
- Treat comments as maintainability context for future agents: prefer comments that explain business invariants, edge cases, constraints, and non-obvious reasons. Do not reward comments that only narrate syntax.

## Required Setup Flow

1. Inspect the repository structure, package manager, CI files, test commands, coverage reports, lint tooling, build/deploy surfaces, and existing review conventions.
2. Generate a quality-gate ratchet package:
   ```bash
   node ~/.agents/skills/review-loop/scripts/generate-quality-gate-ratchet.mjs --root . --base origin/main --write
   ```
3. Review and adapt the generated files before committing:
   - `docs/ai/quality-gate/baseline.json`
   - `docs/ai/quality-gate/quality-gate.config.json`
   - `docs/ai/quality-gate/check-ratchet.mjs`
   - `docs/ai/quality-gate/refresh-baseline.mjs`
   - `docs/ai/quality-gate/review-feedback.json`
   - `docs/ai/quality-gate/github-action-quality-gate-ratchet.yml`
   - `docs/ai/quality-gate/README.md`
4. Copy or merge the generated workflow into `.github/workflows/quality-gate.yml` only after checking that it uses repo-native commands and does not duplicate an existing required CI job.
5. If the workflow needs the collector in GitHub Actions, vendor the collector intentionally or replace the command with the project-approved package/CLI path. Do not assume `~/.agents` exists in CI. The emitted package must include `collect-review-context.mjs` plus its executable local relative modules (`fingerprint-review-state.mjs`, `lib/external-toolbelt.mjs`, and `lib/gate-categories.mjs`) in the same vendor folder; run that vendored collector in a clean fixture before publishing the workflow.
6. Run the generated checker locally after producing the expected reports:
   ```bash
   node docs/ai/quality-gate/check-ratchet.mjs
   ```
7. Confirm the generated checker publishes `quality-gate-report.md`, `quality-gate-report.json`, `quality-trend-entry.json`, and `auto-improvement-queue.json` in CI artifacts or job summary.
8. Commit the ratchet baseline only when it reflects the current accepted state of the default branch or the explicitly chosen baseline.
9. Refresh baseline only after a passing default-branch run using `node docs/ai/quality-gate/refresh-baseline.mjs`; never refresh baseline inside an unmerged PR.
10. Publish the Markdown table as a job summary and artifact. Do not run candidate PR code with `pull-requests: write` or a comment-capable token. A repository that needs PR comments must implement a separate trusted publisher that consumes a validated artifact from the read-only analysis run.

## GitHub Actions Workflow Requirements

Ground generated workflows in official GitHub Actions behavior:

- Workflow files must live under `.github/workflows` and declare explicit `on` events such as `pull_request`, default-branch `push`, and `workflow_dispatch`.
- Use minimal `permissions`; generated analysis jobs use only `contents: read`. They must not receive `pull-requests: write` or an exported `GITHUB_TOKEN` while checking candidate code. If comments are required, use a distinct trusted publisher that reads a validated artifact and has the smallest comment-only permission.
- Treat `github` event data, titles, branch names, bodies, labels, and other context values as untrusted. Pass them through `env`, quote shell variables, never interpolate attacker-controlled expressions directly into scripts, and pin Actions (`checkout`, `setup-node`, `gitleaks-action`, `upload-artifact`) by immutable commit SHA — mutable tags such as `@v4`/`@v2` are rejected by generator tests.
- Resolve analysis base securely by event: pass `github.event_name`, `github.event_path`, and `github.sha` through `env`; for PRs use the full `pull_request.base.sha` from the event payload; for push use the full `before` SHA with fallback to the checked-out head's parent when empty/zero; for `workflow_dispatch` use explicit HEAD parent resolution. Validate full commit SHAs and invoke Git with argument arrays, never interpolate event content into shell, and never hardcode `origin/main..HEAD`.
- Use `concurrency` to cancel stale PR quality-gate runs and avoid wasting minutes on outdated commits.
- Use package-manager caching only to speed dependency install. Do not treat cache contents as review evidence.
- Upload review packets, gate reports, coverage, screenshots, traces, and trend entries as artifacts, with a retention period appropriate for review/debugging.
- Prefer job summaries plus artifacts for reviewer-readable metrics: baseline, current, target, delta, and pass/fail.
- Job summaries and artifacts must include a Markdown table with metric, PR/current value, baseline/global value, target, delta, and pass/fail status. PR comments are optional and belong only to the separate trusted publisher.
- Coverage comments must separate PR changed-line coverage from global project coverage. The PR coverage threshold is blocking for sufficiently large diffs; the global metric is a ratchet that blocks meaningful drops.

## Default Ratchet Metrics

- PR coverage: prefer changed executable lines from `coverage/lcov.info` and the PR diff; block below the current PR minimum when the diff is large enough to avoid percentage noise.
- Global coverage: prefer line coverage from `coverage/coverage-summary.json`; require new code target around 80% when available; fail if project coverage drops more than the configured tolerance.
- Duplication: prefer `jscpd` JSON reports; target duplicated new code at or below 3%; fail if overall duplication increases beyond tolerance.
- Lint/rules: use repo-native ESLint/Biome/Ruff/Checkstyle/etc.; fail on rule violations unless the repo has explicitly chosen warning-only migration mode.
- Size/complexity: track file lines, large-file count, long functions, import/coupling signals, and optional `lizard`/language-native complexity reports.
- Security: require secret scanning and fail on detected leaks; add dependency/container/IaC scanners when manifests or deploy surfaces are in scope.
- Review Loop: require the deterministic review packet, but treat its heuristic findings (including high/medium severities) as review signals. Fail only on a blocking finding in an adjudicated receipt with direct evidence, or on a rule explicitly listed in `policies.reviewLoop.calibratedDetectors`; leave the generated list empty until the repository has calibrated a deterministic detector.
- Runtime proof: require production-path tests/smokes/browser evidence based on touched surfaces.
- Floating PR metrics: every PR should expose baseline, current value, target, delta, and pass/fail for coverage, duplication, large files, adjudicated/calibrated review blockers, collector signals, and feedback-derived false negatives.
- Touched bad area policy: if a PR touches an already-large or low-quality file, it must reduce, split, test, document useful invariants, or at minimum avoid making the metric worse.
- Baseline refresh: baseline changes are explicit post-merge/default-branch maintenance, never an automatic PR-side mutation.
- False-positive/negative calibration: consume `docs/ai/quality-gate/review-feedback.json` and reviewer calibration records. A known false positive must be keyed to the exact finding (`findingId`, fingerprint, or rule plus location/text) so it cannot block; rule-only feedback remains context. False negatives must create an auto-improvement queue item with rule, source, and recommended detector/test improvement.

### Review blocker inputs

The generated checker reads heuristic findings only as signals. Its `adjudicatedFindings` packet field accepts a blocker only when it has `adjudication: "adjudicated"`, `decision: "block"`, and non-empty direct `evidence`. To calibrate a deterministic collector rule, add `{ "rule": "...", "calibrationEvidence": "reviewed fixture or history reference" }` to `policies.reviewLoop.calibratedDetectors`; a bare rule name does not enable blocking.
Tune `docs/ai/quality-gate/quality-gate.config.json` for the repository's language, risk, app type, and current maturity. Prefer ratchets that prevent getting worse over thresholds that make every legacy issue block unrelated PRs.
