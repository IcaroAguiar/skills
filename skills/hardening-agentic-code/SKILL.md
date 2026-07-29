---
name: hardening-agentic-code
description: Hardening gate for material agent-made code during creation, before completion, PR-ready, or merge-ready claims; use when correctness, testability, maintainability, runtime proof, scale, regression, or production risk matters.
---

# Hardening Agentic Code

Run this lifecycle gate during material code creation and before claiming a code-affecting task is complete, fixed, PR-ready, or merge-ready.

The deterministic collector is tool support for the reviewer. It is not the gate by itself. A clean packet means the deterministic packet is clean, not that hardening is complete.

Material code-affecting work needs creation-time testability planning, maintainability pressure checks, runtime proof, and one independent reviewer subagent plus the collector packet unless the change is truly trivial, subagent/task tooling is unavailable after a concrete attempt, or the user explicitly disables independent review. The implementing agent must not approve its own work.

Standing authorization: the harness authorizes exactly one risk-matched independent reviewer for this gate. It does not authorize extra reviewers, builder agents, QA agents, or specialist escalations without a concrete trigger.

## Reference Router

Do not bulk-load references by default. Load the smallest file that answers the current question:

- `references/review-focus.md`: finding priorities, collector scope, optional external tools, config, calibration, noisy packets.
- `references/maintainability-pressure.md`: structural simplification, decomposition, abstraction quality, boundary clarity, canonical ownership.
- `references/reviewer-contract.md`: reviewer packet, output format, user checkpoints, escalation routing.
- `references/runtime-proof-and-qa.md`: production path proof, browser/auth smoke, QA evidence, credentials.
- `references/quality-gate-ratchet.md`: CI ratchets, Clean as You Code, generated quality-gate workflows.

Use `gating-testability` as the canonical detailed subgate for the Test Obligation Matrix, Evidence Ledger, browser evidence, CI/monorepo scope, and final testability result.

## Trigger

Run for material changes to executable code, tests, contracts, database access, migrations, CI/CD, package manifests, lockfiles, runtime behavior, user-facing behavior, generated code, refactors, bug fixes, or review-feedback fixes.

Skip only for trivial non-code edits, formatting-only changes, factual answers, explicit user disablement, or concrete subagent/task unavailability after an attempt. When skipped, state the reason and residual risk.

## Lifecycle Gate Workflow

1. Before coding, re-read the request and classify risk: routine, sensitive, or structural, plus LOW, MEDIUM, or HIGH testability risk. Identify changed surfaces, required evidence, browser/visual needs, service/package scope, and likely maintainability pressure points.
2. For material work, create or update a lightweight Test Obligation Matrix using `gating-testability` before coding. For bugfixes, define regression proof before or alongside the fix. If the matrix is created only at the end for production-relevant work, mark the lifecycle gate incomplete.
3. During coding, keep obligations live as scope changes. Add or update behavior, negative, boundary, permission, regression, browser, contract, or integration tests as the behavior is introduced.
4. Apply maintainability pressure while creating code, not only at PR review. Load `references/maintainability-pressure.md` when the diff adds branching, wrappers, casts, layer movement, duplicated helper logic, orchestration, or large-file growth.
5. Generate a review packet from the repository root:
   `node ~/.agents/skills/hardening-agentic-code/scripts/collect-review-context.mjs`
   Use `--root`, `--base`, `--head`, `--full-repo`, `--json`, or `--config .agentic-reviewrc.json` only when the scenario needs it. `--full-repo` also supports a plain directory that is not a Git repository; when scanning this skill itself, rely on the built-in self-scan defaults.
6. Interpret the packet as evidence, not approval. Follow up on material signals with focused checks or probes. Resolve, delegate, or explicitly mark every material signal as scoped residual risk.
7. Prove runtime behavior when executable behavior changed. Exercise the touched production code path when feasible; otherwise state blocker, substitute evidence, and residual uncertainty. Load `references/runtime-proof-and-qa.md` for browser, auth, visual, or runtime proof.
8. Build the reviewer handoff. Include objective, acceptance criteria, risk class, diff summary, touched files, collector output, Test Obligation Matrix result, maintainability pressure notes, tests/probes by behavior, production paths exercised, skipped checks, residual risk, and checkpoints.
9. Send exactly one independent reviewer subagent/task. Done when the reviewer returns findings first, evidence reviewed, scope not reviewed, and verdict.
10. Fix every blocking finding or give a specific technical rebuttal. Re-run targeted verification for fixes. Close only after collector packet, testability result, maintainability pressure, runtime evidence, reviewer verdict, skipped checks, and residual risk are explicit.

Correct incomplete-gate wording:

`The deterministic hardening-agentic-code packet is clean, but the full hardening-agentic-code gate is incomplete because an independent reviewer subagent has not run.`

Invalid closeouts: collector-only approval, tests-only approval, final-only matrix for production-relevant work, maintainability regression waived without justification, or self-approval without the independent reviewer.

## Definition Of Done Checklist

Before the reviewer pass or final handoff is ready:

- Diff is minimal, scoped, and reviewable.
- Test Obligation Matrix exists when material behavior changed, and final testability result is PASS, PASS_WITH_RISK, BLOCKED, or FAIL.
- Contracts, schemas, docs, migrations, changelog, or PR metadata are updated when behavior requires it.
- The exact touched production code path was exercised, or blocker and residual uncertainty are explicit.
- Focused tests cover changed behavior plus meaningful negative, empty, invalid, permission, or edge paths when applicable.
- UI/browser changes include flow, initial state, actions, observed result, screenshot/video when useful, and bugs found or `No bug observed.`
- Validation summary is behavior-oriented; raw command dumps are not used as reviewer-facing proof.
- Maintainability pressure was checked for structural regression, unjustified complexity growth, large-file/decomposition risk, layer leaks, thin wrappers, duplicated helper logic, unsafe casts, and hidden invariants.
- Lint/format, typecheck/build, lockfile/package-manager checks, screenshots, and PR metadata were run or classified not relevant.
- Hardening-agentic-code deterministic packet was generated and interpreted as evidence, not approval.
- One independent reviewer subagent completed the agentic review, or a valid skip reason is explicit.
- Specialist escalation was considered only when a concrete trigger applies.
- Skipped checks include exact reason and residual risk.

## After Editing This Skill

Fast package check:
`node ~/.agents/skills/hardening-agentic-code/scripts/validate-skill-package.mjs`

Full fixture smoke:
`node ~/.agents/skills/hardening-agentic-code/scripts/smoke-review-toolbelt.mjs`

When scanner behavior changes, load `references/review-focus.md`, use `templates/calibration-2026-04-28.md`, and keep the fixture smoke passing.

When creating CI quality gates, load `references/quality-gate-ratchet.md` and generate project-specific ratchets with:
`node ~/.agents/skills/hardening-agentic-code/scripts/generate-quality-gate-ratchet.mjs --root . --base origin/main --write`
