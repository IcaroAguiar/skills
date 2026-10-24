# Dimensions: what each report measures

Every report is a Markdown file in the task folder with: the counts table, the findings worst first (each with path, evidence and cost), what was not verified, and the temporary files created. Scripts below live in this skill's `scripts/` folder.

## Delivery

- `ci_stats.py --workflow <each workflow> --out <task folder>`: wall time vs queue vs compute per event, slowest steps, failing steps, failure causes by log signature (per workflow), scheduled workflows failing in a row, SHAs that failed then passed.
- Read the workflow files and the change-detection logic: what runs on PR, on main, at night, before deploy; what is skipped; what never runs anywhere.
- Then apply [delivery.md](delivery.md): test tiers, hooks vs CI, deploy gate.
- Red flags: a scheduled workflow failing three nights in a row (nobody watches it); infrastructure causes above ~10% of failures; main re-running what the PR already proved; superseded runs not cancelled; a single runner serializing every PR.

## Tests

- **Speed:** profile the suites with the same flags CI uses. For Vitest, `vitest-import-profile.mjs` splits import, setup and test time per file; when import dominates, the lever is module loading (barrel files, heavy UI libraries, per-file isolation), not deleting tests. For other runners use their per-file timing (`pytest --durations`, `go test -json`, JUnit XML).
- **Value:** read the slowest and largest files plus a random sample (about 40), and classify each file keep / trim / merge / delete. A test is low value when it would still pass with the implementation stubbed out; asserts internals (mock call counts, query shapes, CSS classes, markup snapshots) instead of observable behavior with literal expected values; repeats coverage another layer already has; or tests trivial or dead code. Extrapolate with a range, not a point.
- **Patterns worth a mechanical fix:** repeated heavy setup, serial runs that could join the parallel run, waits on synchronous effects, DOM-wide accessible-name queries in loops, jsdom where node suffices.
- Before recommending a large cut, name how to prove the behavior stays covered (mutation or coverage on that block).

## Code

- **Dead code** with the ecosystem's tool, configured with the real entry points (framework routes, DI modules, scripts in manifests, test and config files): knip (JS/TS), vulture plus deptry (Python), `deadcode` and `staticcheck` (Go), the IDE's inspection or `unused` plugins elsewhere. Iterate until a spot-check of 10 items by grep finds no false positive. Report unused files first, then exports, then dependencies.
- **Live copies** with `dup_files.py --roots '<workspace globs>'`: same-path near-copies across apps and byte-identical files elsewhere. These are invisible to dead-code tools and usually the bigger pile.
- **Size census:** the largest source and test files, and files over the repository's budget.
- **Legacy paths:** names with legacy, compat, deprecated, v1, old; feature flags whose value never varies; one-shot scripts kept after their run.

## Abstractions

Read the hot spots (largest, most changed, most duplicated, most bug-fixed files: `git log --format= --name-only | sort | uniq -c | sort -rn | head`) and look for:

- **Shallow modules:** wrappers with one caller, pass-through layers, interfaces as big as their implementation (vocabulary in `codebase-design`).
- **Leaky or lying types:** casts that hide a mismatch, `any`/`unknown` at internal seams, illegal states representable, the same shape declared in several places instead of derived from one schema.
- **Domain spread across conditionals:** the same rule re-checked in UI, API and jobs; status logic as scattered string comparisons instead of a modeled state machine.
- **Wrong owner:** behavior living in the app that should be shared, or shared code that depends on one app.

Each finding names the simpler shape and what it would delete.

## Architecture

- Build the dependency graph (dependency-cruiser or madge for JS/TS, import-linter or pydeps for Python, `go list -deps`, ArchUnit for the JVM) and report cycles, layer violations, and features importing each other.
- Compare the code with the documented decisions (ADRs, `AGENTS.md`, architecture docs): every place where the code contradicts what the docs promise is a finding, and so is a decision that exists only in code.
- Boundaries between deployables (apps, services, packages): what crosses them, through which contract, and whether the contract has one source of truth.

Report contradictions as questions for the user when the intended design is not written down.
