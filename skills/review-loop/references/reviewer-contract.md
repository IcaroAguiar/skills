# Reviewer and fixer contract

## Reviewer packet

Give the independent reviewer the repository, candidate mode, base/head,
complete current diff, initial and pre-verdict identity receipts, request,
acceptance criteria, risk card, five-gate card, deterministic packet, focused
checks, real affected path, skipped proof, baseline failures, residual risk,
and the protected role receipt. On a recheck, include only compact attempt
history and the current delta; do not disclose prior findings or the expected
verdict.

The reviewer starts from the complete diff, batches concrete path/symbol
searches, and reads the smallest ranges needed for evidence. The packet is
evidence, never approval. A reviewer must use a fresh context for approval.

## Findings

Lead with actionable findings ordered by severity. Each finding states:

- category: correctness, simplification, semantics, documentation, or verification;
- severity: critical, high, medium, or low;
- stable location, symbol, contract, or documentation statement;
- impact or failure mode;
- current-candidate evidence;
- smallest justified correction; and
- validation path.

Critical/high actionable findings are blockers. Medium/low simplification,
semantics, and documentation findings are visible residuals after final review
unless they demonstrate a correctness or verification failure.

Return the five gate receipts, reviewed/excluded scope, rejected leads, checks,
residual uncertainty, protected role receipt, convergence evidence, and one of
`APPROVE`, `APPROVE_WITH_RESIDUAL_RISK`, `REQUEST_CHANGES`, or `BLOCKED`.
Never approve while a gate receipt, identity, fresh context, or blocker
correction is missing.

## Correction and recheck

Give accepted critical/high findings to one `fixer` with exact ownership and
preserved contracts. The fixer makes the smallest cohesive correction, adds
proportional coverage, updates affected docs, runs focused checks, and reports
changed files and uncertainty. It must not approve, merge, deploy, or expand
scope.

Reuse that same fixer for subsequent local blocker corrections. After each
changed candidate, rebuild the fingerprint and run a delta-first independent
recheck. Continue autonomously while blocker count or severity decreases; no
fixed pass cap applies. Escalate once to `deep-reviewer` only for high-risk
ambiguity or disagreement. Stop for user authority or genuine non-convergence.

The final approval must be a fresh independent reviewer on the unchanged
current candidate. The fixer and author never approve their own work.

## Role boundary

Use protected receipts for `fast-reviewer`, `deep-reviewer`, `fixer`, and
`watcher`. A watcher can monitor external state read-only but has no verdict or
approval authority. External PR review/provider state is reported separately
and is never awaited by this skill.
