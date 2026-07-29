# Test Obligation Matrix

The matrix is the central artifact of this skill. It prevents agents from
testing what is convenient instead of what the change actually risks.

## Required Columns

| Column | Meaning |
|---|---|
| Obligation | Behavior, contract, state, or invariant that must hold. |
| Level | unit, integration, component, contract, E2E, browser, visual, accessibility, migration, performance, security, observability, CI. |
| Required | yes/no, with reason when no. |
| Existing coverage | File, test, CI job, smoke, or `none`. |
| New/updated coverage | File/test planned or added; `not practical` requires justification. |
| Execution | Exact command, browser task, CI job, smoke path, or blocker. |
| Result | pass, fail, blocked, not run, not applicable. |
| Evidence | Log excerpt, screenshot, trace, coverage path, artifact path, PR check, or blocker note. |
| Residual risk | What remains unproven and why it is acceptable or blocking. |

## Minimum Matrix Entries By Surface

- Bugfix: reproducer or regression test, fixed path, negative/edge case, failed
  previous behavior when available.
- API/contract: request validation, response shape, backwards compatibility,
  provider behavior, consumer expectation, generated client/schema update.
- Auth/permission/tenant: positive access, denied access, wrong tenant, expired
  or missing credential, audit/logging when relevant.
- Data/migration: forward migration, rollback/backward compatibility when
  supported, idempotency, representative seed/fixture, destructive-change guard.
- UI/browser: main flow, loading, empty, error, permission, fallback, responsive,
  keyboard/focus, visual artifacts.
- Integration/webhook/job/queue: success, retry/idempotency, poison/error path,
  timeout or unavailable dependency, observable trace/log.
- CI/build/dependency: affected tests, build/typecheck/lint, lockfile impact,
  runtime smoke when dependency can change behavior.

## Final Result Semantics

- `PASS`: required obligations ran and passed; residual risk is none or
  negligible.
- `PASS_WITH_RISK`: core obligations passed, but named lower-risk gaps remain.
- `BLOCKED`: validation could not complete because of environment, credentials,
  dependency, fixture, tooling, or access.
- `FAIL`: validation found a defect or failing required check.

Never convert `BLOCKED` or `FAIL` to `PASS_WITH_RISK` merely because the task is
urgent.

## Evidence Ledger

Every final gate needs an evidence ledger:

```md
| Evidence | Scope | Result | Artifact |
|---|---|---|---|
| `pnpm --filter api test` | full API service suite | pass | n/a |
| Playwright smoke: checkout happy path | desktop Chromium | pass | test-results/checkout-trace.zip |
| Contract provider verification | API -> web consumer | blocked: broker unavailable | residual risk documented |
```

The ledger must be precise enough for a reviewer to rerun or challenge it.
