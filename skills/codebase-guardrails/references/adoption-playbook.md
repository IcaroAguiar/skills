# Adoption playbook

Apply the guardrails to one repository in verifiable steps. Each step ends with a gate shown failing on the problem it catches, then passing.

## 1. Diagnose with numbers

Run one read-only diagnosis per repository and keep the report on persistent storage. The `codebase-health` skill runs the full check-up (CI history, dead code, near-copies, test value and speed, abstractions, architecture) with its own scripts; the list below is what this playbook needs from it. Measure:
- **Inventory:**
  - test files and tests per area, and test-to-source line ratio;
  - largest and slowest files;
  - skipped and focused tests.
- **Smells, with counts and examples:**
  - mocks of internal modules;
  - call-only assertions;
  - ORM or query-shape assertions;
  - casts in fixtures;
  - DOM and class queries;
  - duplicated helpers;
  - tests coupled to message text or SQL text;
  - hard-coded paths;
  - time dependence.
- **Gaps:**
  - critical rules with no real-DB or behavior test;
  - contracts between apps with no shared source of truth.
- **Structure:**
  - files over the size budget;
  - import cycles;
  - layer violations;
  - direct DB access outside repositories.
- **Enforcement:** what CI and hooks really run. Check that workflows are enabled and that recent PRs have checks, not only that the YAML exists.

## 2. Restore the safety net first

- Make the quality workflow run on pull requests and make the production workflow `needs` it (`workflow_call`).
- Keep it within budget:
  - cancel superseded runs;
  - parallelize only when it cuts wall time;
  - cache dependencies;
  - estimate monthly minutes.
- Run tests that need a database against a service container, and run all of them. A spec gated behind an env flag that no script sets is dead weight: enable it, or quarantine it explicitly.
- Replace bespoke "agentic" gates (fingerprints, auto-improvement queues, bot comments) with deterministic checks.

## 3. Add checks behind a ratchet

Use one small script (`scripts/ratchet.mjs`, tested with `node:test`) and one baseline JSON per metric, with counts per file:
- the check fails when any count rises or a new file is non-zero;
- it prints how to lower the baseline when counts drop;
- the baseline only changes in the same PR that reduces the counts.

Measure smells with a linter over the syntax tree, not regex: oxlint rules emit JSON per file and feed the same ratchet ([oxlint-test-rules.md](oxlint-test-rules.md)). Keep regex only for file-level heuristics no rule can express, and make the measurement throw when the linter crashes or lints zero files.

Typical metrics:
- type errors in tests;
- test smells (internal mocks, call-only assertions on repositories or ORM, casts, DOM and class queries, `querySelector`);
- dependency violations (dependency-cruiser `known-violations`);
- file sizes over budget.

Structural tests that are cheap and catch whole classes of bugs:
- **Route protection:** boot the app's module metadata, walk every handler, and require authentication plus a permission. Allow an explicit public list with a reason per entry, and fail on stale entries.
- **Mocked e2e network guard:** any request without a registered mock fails with its method and path.
- **Contract pin:** the provider test lists every error code and message the consumer maps.

## 4. Write the rules in the repository

Add short "Tests" and "Structure" sections to the repository's instruction file (`AGENTS.md`), at most 15 lines each. Each rule names the script that enforces it.

Add shared test support:
- `test/support` or `src/test`;
- typed builders;
- `renderWithProviders`;
- a real-DB harness;
- MSW handlers.

Migrate the worst duplicated files as proof; do not mass-migrate.

## 5. Prune and strengthen

- Delete or rewrite tests that only assert that mocks were called. Replace them with a behavior test at the nearest boundary.
- Before and after pruning a critical module, run incremental mutation testing (StrykerJS: Jest or Vitest runner, plus the TypeScript checker) to show that detection did not drop.
- Split giant components or services as they are touched: extract pure rules first, then subcomponents.

## 6. Keep it honest

- Add exploratory QA rounds after material features. Include restricted personas, and report what stayed unverified.
- Treat the instruction file and the checks as a pair. When a recurring correction appears, add a check, not another paragraph.
