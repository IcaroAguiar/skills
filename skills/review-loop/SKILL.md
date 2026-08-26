---
name: review-loop
description: Review, correct, and re-review material changes until the current candidate has evidence-backed code readiness; keep checks, formal review, merge, deployment, and external monitoring separate.
---

# Review Loop

Drive one immutable candidate through a speed-first review loop. The authoring
agent self-audits and stabilizes the change, then focused checks run concurrently.
Once stable, dispatch exactly one fresh independent
`fast-reviewer`. Do not start a duplicate reviewer wave.

## Five mandatory gates

Every material candidate receives all five gates:

1. `CORRECTNESS`: behavior, contracts, security, data, lifecycle, and failure paths.
2. `SIMPLIFICATION`: deletion, ownership, duplication, branching, and structure.
3. `SEMANTICS`: names, states, roles, units, and logic-bearing values.
4. `DOCUMENTATION`: changed docs are current, or `NOT_APPLICABLE` is justified.
5. `VERIFICATION`: focused checks and the affected path are proven, or uncertainty is recorded.

Risk changes depth and checks, never the gate set. The author may self-audit
and stabilize locally, but only a fresh independent reviewer may approve.

## FAST workflow

1. Pin repository, base/head or worktree identity, request, scope, and risk.
2. Self-audit the full diff against the five gates; fix and stabilize locally.
3. Run focused checks concurrently. Record failures, baseline failures, and skipped proof.
4. Resolve a harness-native `fast-reviewer` receipt bound to the candidate
   fingerprint, then dispatch one fresh read-only reviewer with the complete
   diff and current evidence. Protected engine configuration is an optional
   override, never a prerequisite.
5. For critical/high actionable local findings, reuse the same `fixer`, correct
   automatically, run focused checks again, and ask a fresh reviewer for a
   delta-first independent recheck. Continue while blocker count or severity
   decreases. There is no fixed review-pass cap, and another local round does not need permission.
6. Escalate automatically once to `deep-reviewer` only for high-risk ambiguity
   or disagreement. Ask the user only for product, architecture, production,
   credential, permission, or destructive authority, or genuine non-convergence.
7. Keep medium/low simplification, semantics, and documentation observations
   as visible residuals after final review unless they prove correctness or
   verification failure.

Always rebuild evidence and require fresh independent approval after a changed
candidate. The fixer never reviews or approves its own work.

## Separate states

Report these independently on the unchanged candidate:

- `CODE READY`: local authoring, self-audit, and required focused proof are complete.
- `CHECKS GREEN`: promised local/remote checks passed; this does not imply review.
- `FORMAL REVIEW`: hosting approvals, change requests, and threads.
- `MERGE READY`: all required states hold on the same candidate identity.

External PR reviewers and providers are outside this skill and are never waited
on. The `watcher` role may monitor external state with read-only capability but
has no verdict or approval authority.

## Portable roles

Use truthful role receipts for `fast-reviewer`, `deep-reviewer`, `fixer`, and
`watcher`. The default path uses the current harness's native isolated role or
fresh task/session and records `harness-native` provenance. Missing role maps,
registries, benchmarks, or model identity are not blockers. Do not ask the user
to configure review infrastructure during ordinary delivery.

Use protected profile/model mappings only when the user or harness policy
explicitly requires that override. A malformed explicit override fails closed;
it does not disable the native path for later runs. The author or controller may
act as fixer and watcher, but only a fresh independent context may approve. A
reviewer receipt is valid only while the pre-verdict fingerprint is unchanged.

Before reviewer dispatch load only:

- `references/review-protocol.md` for identity, lifecycle, convergence, and states;
- `references/reviewer-contract.md` for packets, findings, receipts, and approval.

Triggered references:

- `references/correctness-and-risk.md`, `references/quality-simplification.md`, and `references/semantic-integrity.md` for concrete code questions;
- `references/documentation-impact.md` and `references/runtime-proof-and-qa.md` for docs or executable-path proof;
- `references/systemic-risks.md`, `references/go-review.md`, and `references/quality-gate-ratchet.md` for their named boundaries;
- `references/engine-selection.md` for native and protected role receipts and `references/real-diff-benchmark.md` only when evaluating this skill.

Load other references only when their concrete trigger applies. A clean review
is scoped evidence, not formal approval, merge, deploy, or tracker completion.

## Definition of done

- The current candidate has one identity and truthful native or protected role receipts.
- All five gates have receipts; every critical/high blocker is fixed or directly rebutted.
- Final approval is fresh, independent, and bound to the current fingerprint.
- Focused checks, applicable lint/typecheck/build, and `git diff --check` passed or are explicit blockers.
- Residual debt, skipped proof, baseline failures, and uncertainty are visible.
