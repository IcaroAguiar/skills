# CI, Monorepo, And Service Gates

Use this reference when choosing final validation scope for repositories with
multiple packages, microservices, generated clients, CI workflows, or expensive
test suites.

## Command Discovery

Before selecting commands, inspect the project-native source of truth:

- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`,
  `workspace.json`, `project.json`, `Makefile`, `Taskfile`, `justfile`,
  language-specific manifests, and `.github/workflows`.
- Existing test naming and CI jobs.
- Local `AGENTS.md`, README, contributing docs, and project scripts.

Do not invent commands when project-native scripts exist.

## Final Scope Rules

- Single package/app: run the package/app test suite plus build/typecheck/lint
  when project-native and relevant.
- Microservice: run the full relevant service suite for production-relevant
  service changes. Targeted tests are development-loop evidence only.
- Monorepo package: run changed package checks plus affected dependents.
- Shared library/root config/build tooling/generated client: run broad affected
  graph; escalate to full workspace validation when the affected set is unclear.
- Dependency update/lockfile: assume affected projects can expand. Run affected
  tests/builds and at least one runtime smoke when behavior can change.
- CI workflow change: run local syntax/static checks when available and inspect
  the exact affected workflow path; use `gh run` evidence when the workflow is
  actually executed.

## Affected Graph Guidance

Use project-native graph tools when available:

- Nx: affected commands with explicit base/head in CI.
- Turborepo: package filters, dependency/dependent filters, cache-aware task
  runs, and full runs for root/shared changes.
- pnpm/npm/yarn workspaces: filter changed package plus dependents when scripts
  support it; otherwise explain scope limits.

If the graph cannot be determined, use conservative broader validation or state
the residual risk.

## CI Evidence

For CI-backed gates, collect:

- Workflow/job name and run URL or run id when available.
- Commit SHA or branch.
- Status of required jobs.
- Artifact names for test results, coverage, screenshots, traces, logs, or
  performance output.
- Whether failures are new, pre-existing, flaky, infrastructure, or product.

Artifacts and caches are different: use artifacts for build/test outputs that a
reviewer must inspect after a run; use caches only to accelerate repeated work.

## Pipeline Hardening Signals

Suggest gate improvements when you observe:

- No CI job for a critical test level.
- Browser tests produce no screenshot/trace artifact on failure.
- Contract tests exist locally but are not in CI.
- Coverage reports exist but are not uploaded or reviewed.
- Flaky tests are hidden by blind retries.
- Shared packages can merge without affected dependents.
- Release/deploy workflow lacks smoke evidence.

Apply pipeline changes only when they are in scope or explicitly requested.
