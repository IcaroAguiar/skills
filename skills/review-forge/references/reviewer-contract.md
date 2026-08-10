# Reviewer and fixer contract

## Required reviewer input

Give the independent reviewer:

- repository, candidate mode, base/head where applicable, complete diff, and
  the before/after candidate identity receipts (including index exclusions,
  excluded unstaged-diff coverage, and separate untracked fingerprints);
- request/spec, acceptance criteria, risk and five-gate obligation cards;
- relevant instructions, contracts, documentation, and conditional references;
- deterministic packet as evidence, not a verdict;
- protected round and cumulative-cost controls, plus prior attempt/cost history
  when a correction loop already ran;
- tests and real runtime paths exercised by behavior;
- skipped checks, baseline failures, residual risk, and engine receipt.

Do not include the expected findings, accepted patch, previous reviewer output,
or desired verdict before the independent pass finishes.

Require the packet's sanitized SHA-256 identity; missing mode, required commit
base/head, or a mismatch is `BLOCKED`; never infer a merge base or add
unstaged/untracked files to an index candidate. Tool receipts exclude commands,
arguments, roots, configuration paths, and raw output.

## Reviewer output

Lead with actionable findings ordered by severity. For each finding provide:

- **Category:** correctness, simplification, semantics, documentation, or
  verification;
- **Severity:** critical, high, medium, or low;
- **Where:** stable file/line, symbol, contract, or documentation statement;
- **Impact/failure:** behavior, invariant, maintainability, semantic, or stale
  documentation consequence;
- **Evidence:** current-candidate code, trace, structural comparison, or contradiction;
- **Correction:** smallest justified outcome, not speculative redesign;
- **Validation:** focused check, runtime path, reference search, or structural
  proof that closes it.

Then return:

1. reviewed and excluded scope;
2. `CORRECTNESS`, `SIMPLIFICATION`, `SEMANTICS`, `DOCUMENTATION`, and
   `VERIFICATION` receipts;
3. rejected leads and why;
4. checks/probes evaluated and residual uncertainty;
5. engine receipt;
6. convergence receipt: round number, configured limits, expected/observed
   cumulative cost, and remaining budget; and
7. `APPROVE`, `APPROVE_WITH_RESIDUAL_RISK`, `REQUEST_CHANGES`, or `BLOCKED`.

Do not approve while a mandatory receipt is missing, the before/after candidate
identity differs, or any evidenced blocker is unresolved.
Do not start a further correction round if its protected round or cumulative-cost
limit is exhausted; return `BLOCKED` or request an explicit escalation with the
attempt/cost history instead.

## Finding synthesis

Merge findings only when they share root cause and correction. Preserve
independent evidence. Disagreement does not cancel a finding; decide from code,
contracts, and reproducible evidence. Unsupported concerns become observations,
not blockers.

Structural, semantic, and documentation blockers do not need a fabricated
runtime reproduction. They do need an objective contradiction, unnecessary
structure, stale statement, misleading name/value, or clearer bounded model.

## Fixer input and limits

Give the fixer only accepted findings, exact ownership, preserved contracts,
required checks, documentation impact, and engine receipt. The fixer must:

- make the smallest cohesive correction;
- preserve unrelated and concurrent work;
- add or update proportional regression coverage;
- update affected names and documentation completely;
- report changed files, checks, uncertainty, and escalation needs;
- stop rather than guess across a sensitive or unsettled boundary.

The fixer must not approve, publish formal review, merge, deploy, or expand the
request. A reviewer finding is not authority for unrelated cleanup.
When the user requested review only, do not dispatch the fixer at all; preserve
the findings as the deliverable.

## Fresh approval

After correction, resolve the new SHA and rebuild the complete reviewer packet.
Launch a fresh qualified reviewer. A previous reviewer may be reused as a role
profile, but not as a continuing contaminated context. Any new finding reopens
the loop.
