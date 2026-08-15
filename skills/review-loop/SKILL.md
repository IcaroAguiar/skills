---
name: review-loop
description: Review, correct, and re-review material code changes or pull requests until they reach an evidence-backed merge decision; use for code review, PR review, completion gates, review-feedback fixes, merge-readiness checks, or any material agent-made code that must satisfy correctness, simplification, semantic integrity, documentation, and verification standards.
---

# Review Loop

Drive one immutable code state through independent review, bounded correction,
verification, and a fresh approval decision. Keep code-review evidence separate
from CI state, formal hosting approval, merge, deploy, and tracker state.

The deterministic collector is tool support for the reviewer. It is not the
gate by itself. The implementing or fixing agent must never approve its own
work. Reviewing is read-only; dispatch a fixer only when the current task
already authorizes code changes.

On the first run in each harness, ask the user which exact model/profile and reasoning
mode will review and fix. Offer live choices without recommending or preselecting;
persist both with `configure-review-engines.mjs`. Reuse them until the user explicitly
replaces them. Never rank or substitute a model automatically.

## Non-negotiable contract

Require all five gates for every material review:

1. `CORRECTNESS`: behavior, contracts, regressions, security, data, lifecycle,
   compatibility, and failure paths.
2. `SIMPLIFICATION`: dead or unnecessary code, avoidable concepts, branching,
   duplication, indirection, misplaced ownership, and structural debt.
3. `SEMANTICS`: truthful names, cohesive responsibilities, domain vocabulary,
   and logic-bearing strings or numbers.
4. `DOCUMENTATION`: changed documentation is current, or `NOT_APPLICABLE` is
   justified by the inspected sources.
5. `VERIFICATION`: focused checks and the real affected path are proven, or the
   blocker and residual uncertainty are explicit.

Risk changes depth, specialists, verification, and escalation. It never removes
one of these gates.

## Reference router

Read only the references required for the current stage, but always load the
first seven before reviewer dispatch:

- `references/review-protocol.md`: immutable scope, lifecycle, convergence, and
  verdict states.
- `references/correctness-and-risk.md`: behavioral, contract, security, scale,
  compatibility, and regression review.
- `references/quality-simplification.md`: deletion-first code quality and
  structural approval bar.
- `references/semantic-integrity.md`: naming, responsibility, temporal labels,
  magic values, and semantic blockers.
- `references/documentation-impact.md`: documentation discovery, impact
  classification, and same-change correction.
- `references/engine-selection.md`: portable capability-and-cost selection for
  reviewer and fixer engines.
- `references/reviewer-contract.md`: reviewer packet, findings, receipts, and
  approval output.

Load conditionally:

- `references/runtime-proof-and-qa.md` for executable behavior, browser, UI,
  authentication, visual, or runtime proof.
- `references/systemic-risks.md` for concurrency, async work, events, retries,
  transactions, caches, cancellation, authz/tenancy, migrations, rollout, or
  feature flags.
- `references/go-review.md` for Go code, modules, generated Go, or Go tooling.
- `references/quality-gate-ratchet.md` when creating or changing CI quality
  gates.
- `references/real-diff-benchmark.md` only when evaluating or changing this
  skill, its engine policy, or its reviewer/fixer prompts.

## Workflow

1. Resolve the protected harness choice; if absent, ask for and persist both roles.
   Validate only those tuples with `scripts/select-review-engines.mjs`.
2. Pin repository, base SHA, candidate mode (`commit`, `index`, or `worktree`),
   candidate fingerprint, changed files, request/spec source, and relevant
   documentation. Require a head SHA for commit mode. Do not mix PRs, stale
   commits, excluded edits, or post-review changes.
3. For a PR, run `assess-pr-scope.mjs --base <sha> --head <sha> --review-pass <n>`.
   On `STACK_REQUIRED`, use `$gh-stack` for a real GitHub PR stack reviewed bottom-to-top;
   never use a manual Git stack.
4. Build a risk card and five-gate obligation card. Use `gating-testability` for
   the detailed Test Obligation Matrix when material behavior changed.
5. Generate the deterministic packet from the exact identity when available with
   `collect-review-context.mjs`; interpret its signals, never as approval.
   For JS/TS, request anti-slop; install via `$install-anti-slop` only with tooling
   authority. Its result is never approval.
6. Dispatch a fresh, read-only reviewer with the complete diff, obligation card,
   relevant context, checks, and exact engine receipt. Do not expose previous
   review output before its independent pass finishes.
7. Require findings to identify category, severity, location, impact or failure
   mode, current-candidate evidence, smallest justified correction, and validation
   path. Structural, semantic, and documentation evidence need not pretend to be
   a runtime bug reproduction.
8. If findings exist and correction is authorized, dispatch the configured,
   qualified fixer
   with bounded ownership. The fixer may implement only accepted findings, add
   proportional regression coverage, update affected documentation, and run
   required checks. Escalate sensitive or structurally uncertain fixes instead
   of forcing the cheap lane. In a review-only task, return the findings without
   editing.
9. Fingerprint the new candidate, refresh evidence, and use a fresh reviewer for
   at most three passes total. A verdict never survives a changed candidate identity. Never
   dispatch a fourth pass; require `$gh-stack` when its gate fires, else `BLOCKED`.
10. Report `REVIEW LOOP COVERAGE`, `CHECKS GREEN`, `FORMAL REVIEW`, and
   `MERGE READY` separately. Do not merge, deploy, or change formal review state
   without separate authority.

## Definition of done

- One exact candidate identity, explicit harness choice, and truthful engine receipt exist.
- All five mandatory gates have explicit receipts on the current candidate.
- PR-size state is explicit; every GitHub stack layer has its own approval.
- Every actionable finding is corrected or rebutted with direct evidence.
- The fixer did not self-review, and the final reviewer used fresh context.
- Focused tests plus applicable lint, typecheck/build, and `git diff --check`
  passed or are explicitly blocked.
- Changed documentation and names reflect durable domain semantics rather than
  roadmap phases, temporary labels, or implementation accidents.
- Skipped checks, baseline failures, residual debt, and uncertainty are visible.
- A clean review is not presented as formal approval, merge, deploy, or tracker
  completion.

## After editing this skill

Run:

1. Package: `node skills/review-loop/scripts/validate-skill-package.mjs skills/review-loop`.
2. Engines/scope: run `test-engine-choice.mjs`, `test-engine-selection.mjs`, `test-harness-adapters.mjs`, and `test-pr-scope.mjs`.
3. Review integrity: run `test-review-state-fingerprint.mjs`, `test-real-diff-corpus.mjs`, `test-quality-gate-ratchet.mjs`, and `test-smoke-cleanup.mjs`.
4. Corpus/catalog: run `validate-real-diff-corpus.mjs` on the example and `node scripts/validate-skills.mjs`.

Then forward-test with raw real-PR artifacts and fresh agents as required by
`references/real-diff-benchmark.md`. Do not promote an engine or claim a quality
gain from prose inspection or synthetic findings alone.
