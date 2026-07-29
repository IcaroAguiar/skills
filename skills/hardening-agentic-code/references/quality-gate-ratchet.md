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
   node ~/.agents/skills/hardening-agentic-code/scripts/generate-quality-gate-ratchet.mjs --root . --base origin/main --write
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
5. If the workflow needs the collector in GitHub Actions, vendor the collector intentionally or replace the command with the project-approved package/CLI path. Do not assume `~/.agents` exists in CI.
6. Run the generated checker locally after producing the expected reports:
   ```bash
   node docs/ai/quality-gate/check-ratchet.mjs
   ```
7. Confirm the generated checker publishes `quality-gate-report.md`, `quality-gate-report.json`, `quality-trend-entry.json`, and `auto-improvement-queue.json` in CI artifacts or job summary.
8. Commit the ratchet baseline only when it reflects the current accepted state of the default branch or the explicitly chosen baseline.
9. Refresh baseline only after a passing default-branch run using `node docs/ai/quality-gate/refresh-baseline.mjs`; never refresh baseline inside an unmerged PR.
10. PR feedback must be a persistent table comment, updated on every PR run from `quality-gate-report.md`; do not create a new comment per push.

## GitHub Actions Workflow Requirements

Ground generated workflows in official GitHub Actions behavior:

- Workflow files must live under `.github/workflows` and declare explicit `on` events such as `pull_request`, default-branch `push`, and `workflow_dispatch`.
- Use minimal `permissions`; `contents: read` is enough for checkout/read-only gates, and extra scopes require a named reason.
- Treat `github` event data, titles, branch names, bodies, labels, and other context values as untrusted. Pass them through `env`, quote shell variables, and never interpolate attacker-controlled expressions directly into scripts.
- Use `concurrency` to cancel stale PR quality-gate runs and avoid wasting minutes on outdated commits.
- Use package-manager caching only to speed dependency install. Do not treat cache contents as review evidence.
- Upload review packets, gate reports, coverage, screenshots, traces, and trend entries as artifacts, with a retention period appropriate for review/debugging.
- Prefer job summaries plus artifacts for reviewer-readable metrics: baseline, current, target, delta, and pass/fail.
- PR comments must include a Markdown table with metric, PR/current value, baseline/global value, target, delta, and pass/fail status.
- Coverage comments must separate PR changed-line coverage from global project coverage. The PR coverage threshold is blocking for sufficiently large diffs; the global metric is a ratchet that blocks meaningful drops.

## Default Ratchet Metrics

- PR coverage: prefer changed executable lines from `coverage/lcov.info` and the PR diff; block below the current PR minimum when the diff is large enough to avoid percentage noise.
- Global coverage: prefer line coverage from `coverage/coverage-summary.json`; require new code target around 80% when available; fail if project coverage drops more than the configured tolerance.
- Duplication: prefer `jscpd` JSON reports; target duplicated new code at or below 3%; fail if overall duplication increases beyond tolerance.
- Lint/rules: use repo-native ESLint/Biome/Ruff/Checkstyle/etc.; fail on rule violations unless the repo has explicitly chosen warning-only migration mode.
- Size/complexity: track file lines, large-file count, long functions, import/coupling signals, and optional `lizard`/language-native complexity reports.
- Security: require secret scanning and fail on detected leaks; add dependency/container/IaC scanners when manifests or deploy surfaces are in scope.
- Agentic review: require the deterministic review packet and fail on high/blocking findings unless explicitly triaged.
- Runtime proof: require production-path tests/smokes/browser evidence based on touched surfaces.
- Floating PR metrics: every PR should expose baseline, current value, target, delta, and pass/fail for coverage, duplication, large files, agentic review findings, and feedback-derived false negatives.
- Touched bad area policy: if a PR touches an already-large or low-quality file, it must reduce, split, test, document useful invariants, or at minimum avoid making the metric worse.
- Baseline refresh: baseline changes are explicit post-merge/default-branch maintenance, never an automatic PR-side mutation.
- False-negative detection: consume `docs/ai/quality-gate/review-feedback.json` and reviewer calibration records; false negatives must create an auto-improvement queue item with rule, source, and recommended detector/test improvement.

Tune `docs/ai/quality-gate/quality-gate.config.json` for the repository's language, risk, app type, and current maturity. Prefer ratchets that prevent getting worse over thresholds that make every legacy issue block unrelated PRs.
