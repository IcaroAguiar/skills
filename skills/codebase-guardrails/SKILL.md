---
name: codebase-guardrails
description: Engineering guardrails that keep a codebase healthy when much of its code and tests are written by AI agents. Use when writing, reviewing or pruning tests; when a test suite is large but bugs still reach users; when setting up, reviving or redesigning CI or quality gates; when adding lint, boundary, size or contract checks; or when onboarding a repository to agent-heavy development.
---

# Codebase guardrails

Agents write code and tests fast, and they optimize for what is checked. A suite of thousands of green tests can still miss a broken screen or an unauthenticated route, because the tests check the implementation instead of the behavior a person or a caller depends on. These guardrails move the important rules out of prose and into tools, so every agent and person hits them.

Pair with `codebase-design` (module shape and seams), `exploratory-qa` (behavior through the UI), and `code-review` (fresh-context review).

## Rules

### Tests
1. **Test observable behavior through the public interface.** Assert the outcome a user or caller sees, not which internal functions ran. Assert calls only for effects at a boundary (an email sent, a write that must not happen).
2. **Fake only boundaries.** Network (MSW or a fake server), clock, randomness, storage, third parties. Never mock the unit under test, its internal hooks, components, services or repositories. Repository and SQL behavior runs against a real database in a disposable container.
3. **Expected values come from the requirement, never from the current output.** A test that deliberately pins current behavior says so in its name.
4. **Every bug fix ships a regression test that fails without the fix.** Show the failing run in the PR.
5. **Query UI the way a person does.** By role and accessible name, with user-event interactions. No CSS classes, `data-*` hooks, `querySelector` or DOM traversal, except documented exceptions.
6. **Fixtures are typed builders, and tests are type-checked.** No `as never` or `as unknown as` to force a shape; a cast in a fixture usually hides contract drift.
7. **No focused or skipped tests on the main branch.** Quarantine is an explicit list with reason and owner. A flaky test is a defect.
8. **Coverage is a diagnostic, not a target.** Measure test strength with incremental mutation testing on the critical domain (rules, permissions, tenancy, money, scoring).

### Structure
9. **Rules live in pure functions; UI, controllers and jobs are thin shells.** That is where cheap, mock-free tests come from.
10. **Boundaries are enforced by a dependency checker.** No cycles, shared code never imports features, and layers only import in the allowed direction.
11. **File size has a budget.** New files stay under it, and existing large files cannot grow.

### Contracts and safety
12. **Cross-boundary contracts use stable codes or schemas, never human-language messages.** The provider pins them with a contract test, and the consumer maps codes with a safe fallback.
13. **Invariants that must hold everywhere get a structural test.** For example, every route requires authentication and a permission, every tenant query is scoped, and every user-facing error has a code.

### Gates
14. **Gates are deterministic, fast and cheap.**
    - Run lint, type-check (including tests), unit tests, real-DB tests, build, and mocked e2e that fails on any unmocked network request.
    - Set a wall-time budget and cancel superseded runs.
15. **Gate production structurally.** The deploy or release workflow runs the quality workflow and `needs` it. This works even where branch protection is unavailable.
16. **Legacy debt goes behind a ratchet.** Track a per-file count that may only go down; new files start at zero. Never refresh a blanket baseline to make a gate pass.
17. **A rule that matters becomes a tool.** Instruction files (`AGENTS.md`, `CLAUDE.md`) stay short and point at the check that enforces each rule.
    - Prefer lint rules over the syntax tree (oxlint built-ins plus a small local JS plugin for project smells) to regex counters. Regex matches comments and misses syntax variants; a lint rule also reaches the agent in the editor, with the fix in its message.
    - Rules already at zero are errors. Rules with debt are warnings counted per file for the ratchet. See [references/oxlint-test-rules.md](references/oxlint-test-rules.md).

### Working with agents
18. **Verify with real output.**
    - Agents run the checks and report the actual output.
    - An independent reviewer reads the fixed diff in a fresh context.
    - Weakening, deleting or rewriting an assertion to make it pass requires a stated reason.
19. **Material features also get exploratory QA through the UI with personas,** including people without permission. Tests do not catch confusing screens.
20. **Run agents within the machine's capacity.** Cap concurrent heavy agents (builds, full suites, browsers), keep briefs and reports on persistent storage rather than `/tmp`, and commit at each verified step.

## Applying the guardrails to a repository

Follow [references/adoption-playbook.md](references/adoption-playbook.md):
1. Measure first: an evidence-based diagnosis of the suite and the structure.
2. Fix the safety net: CI runs, and deploy needs it.
3. Add ratcheted checks.
4. Write short rules in the repository's instruction file.
5. Prune the tests that only assert mocks.

Prove each gate by showing it fail on the problem it catches before it passes.

Sources and the strength of the evidence behind each rule are in [references/sources.md](references/sources.md). Several rules are practitioner consensus rather than controlled studies; treat a rule's evidence level as part of the rule.
