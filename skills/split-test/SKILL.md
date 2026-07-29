---
name: split-test
description: Build and run independent, risk-based verification lanes for an integrated Split Engineering milestone, emphasizing real behavior, production-like isolated environments, non-trivial failure modes, UI journeys, and SHA-bound evidence. Use only when explicitly invoked for split testing or by orchestrate-split after an integration milestone.
---

# Split Test

Orchestrate verification. Reuse existing quality standards; do not create test volume for its own sake.

## Build the obligation matrix

1. Compose `$gating-testability` when available. Use its Test Obligation Matrix and evidence discipline as the canonical quality bar.
2. Compose the independent review obligation from `$hardening-agentic-code` as one lane when material code requires it. Do not run an equivalent reviewer twice.
3. Read [references/test-lane-contract.md](references/test-lane-contract.md).
4. Start from changed behavior and credible failure modes. Reject a proposed test unless it names the behavior or risk it protects, the failure it detects, and why existing evidence is insufficient.
5. Treat coverage, test count, snapshots of implementation detail, and assertions that only restate mocks as signals, never goals.

## Split by risk

Create only applicable lanes, for example:

- regression and boundary behavior;
- API, data, contract, migration, permission, or compatibility boundaries;
- cross-node integration and critical journeys;
- adversarial, concurrency, scale, load, or performance behavior;
- browser, responsive, accessibility, and visual behavior;
- independent maintainability, correctness, or security review.

Prefer fewer high-signal lanes over many trivial ones. Schedule lanes after each integrated, usable milestone and reserve final lanes for genuinely transversal journeys.

## Preserve independence

- Give testers the approved contract, acceptance criteria, raw diff or SHA, environment, and raw artifacts.
- Withhold executor conclusions, suspected bugs, intended fixes, and persuasive rationale until the tester forms its verdict.
- Use Luna with `high` reasoning by default. Use `medium` or `low` only for mechanical or deterministic work, or when the user explicitly requests a lower-cost tier.
- Forbid testers from correcting product code. A failure receipt must return to the smallest responsible execution node.

## Require real evidence

- Use a faithful isolated environment with representative synthetic data and applicable sandbox or staging integrations. Production is out of scope without separate authority.
- Exercise the real production code path when feasible. Avoid tests that prove only a fixture, mock, or helper unrelated to runtime behavior.
- For UI work, execute critical journeys in a real browser, inspect visible state plus relevant request/response and runtime errors, and capture fresh evidence at applicable viewports.
- Bind every verdict to source SHA or diff identity, environment and relevant configuration, exact command or journey, result, and materialized artifact.
- Require mandatory remote artifacts to be transferred into the run directory. A remote-only path is not materialized evidence.

## Return the verdict

Each lane returns `PASS`, `PASS_WITH_RISK`, `FAIL`, or `BLOCKED`, plus:

- behaviors and risks examined;
- environment and source identity;
- exact commands or browser journey;
- observed results and materialized artifacts;
- defects with reproduction and ownership attribution;
- skipped obligations, substituted evidence, and residual risk.

Deduplicate receipts across lanes. One receipt may satisfy multiple obligations only when its contract and evidence explicitly cover them.

On `FAIL`, reopen the responsible executor and invalidate affected downstream receipts. Permit at most three correction/retest cycles. On `BLOCKED`, never downgrade the gate; report the missing capability, evidence, or authority.
