---
name: codebase-guardrails
description: >-
  Keep a codebase written largely by agents healthy: writing, reviewing or pruning tests, a large suite that still lets bugs through, setting up or redesigning CI and quality gates, adding lint, boundary, size or contract checks, onboarding a repository to agent-heavy work.
---

# Codebase guardrails

Agents optimize for what is checked, so the rules that matter live in tools every agent hits, and instruction files stay short and point at the check that enforces each rule.

## Rules

1. **CI follows [references/ci-rule.md](references/ci-rule.md)**, the single source for what runs where, budgets, runners and workflow gotchas. `python3 <skill-dir>/scripts/ci_rule_check.py <repo>` checks it and exits 1 on a violation.
2. **Boundaries are enforced by a dependency checker**: no cycles, shared code never imports features, layers import only in the allowed direction.
3. **File size has a budget**: new files stay under it, existing large files cannot grow.
4. **Cross-boundary contracts use stable codes or schemas**, never human-language messages. The provider pins them with a contract test; the consumer maps codes with a safe fallback.
5. **Invariants that hold everywhere get a structural test**: every route requires authentication and a permission, every tenant query is scoped, every user-facing error has a code.
6. **Legacy debt goes behind a ratchet**: a per-file count that only goes down; new files start at zero. A blanket baseline is never refreshed to make a gate pass.
7. **Lint rules over the syntax tree** (oxlint built-ins plus a small local JS plugin) instead of regex counters, which match comments and miss syntax variants. Rules already at zero are errors; rules with debt are per-file ratchet warnings ([references/oxlint-test-rules.md](references/oxlint-test-rules.md)).

## Applying the guardrails to a repository

Follow [references/adoption-playbook.md](references/adoption-playbook.md):
1. Measure first: an evidence-based diagnosis of the suite and the structure.
2. Fix the safety net: CI runs, and deploy needs it.
3. Add ratcheted checks.
4. Write short rules in the repository's instruction file.
5. Give the repository its own way to prove a change: when it has no `verify`, create one with `create-verification-skill` (launch, doctor, drive, evidence, cleanup, and a feature map of the top flows), including its "Keep it honest" pass.
6. Prune the tests that observe no behaviour, one module at a time, never the whole suite in one change:
   - **The test.** A case goes only when it still passes with its subject stubbed to do nothing, AND the tests that stay still catch every defect it catches. Decide by that run, never by the matcher's name: `toBeDefined`, `toBeTruthy` on a query result and a positive `toHaveBeenCalled` all fail against a do-nothing subject. Keep a case where absence is the requirement: a tampered cookie returns null, a read-only user sees no action, a secret is not in the output. Shapes no pattern finds, and that only reading shows: an expected value taken from the code under test, a restated constant or UI string, a fixture asserting itself.
   - **What it does not do.** This removes hollow cases, which measured about 2% of the cases in the repositories where it was measured. It does not shrink a large suite of sound unit tests; that is a different decision, taken per module: which behaviours a flow already proves, and which pure rules still deserve their unit tests.
   - **The measure.** Where the repository has mutation testing, run it on the module first: a test file that kills no mutant is a candidate, and the module's mutation score must not drop after the prune. Without it, break the code under test once and confirm the remaining tests go red.
   - **The replacement.** Before deleting, confirm the module's user path has one end-to-end flow; add it when it does not. Edge cases a deleted group covered become one property test when they follow a rule.
   - **The report.** Files and cases removed, the mutation score or the red run before and after, and the flow that now covers the path.

Prove each gate by showing it fail on the problem it catches before it passes.
