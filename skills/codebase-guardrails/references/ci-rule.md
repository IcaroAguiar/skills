# CI rule

Load this whenever a task touches `.github/workflows`, a deploy pipeline or a runner. `python3 <skill-dir>/scripts/ci_rule_check.py <repo>` checks a repository against it; run it and fix what it reports.

A workflow is simple by nature. It proves only what the author's machine cannot: that a clean checkout builds, and that the build deploys. Everything the author already ran before the push stays out of it. The Actions quota is the free tier, the PR flow is large, and every extra step is paid on every push of every PR.

## What runs where

- **Locally, before the push:** format, lint, typecheck and the tests the change reaches (`code-review` T0 runs them). They are the author's verification and are not repeated in a workflow.
- **On a PR:** one short job that installs from the lockfile and builds. Where the build does not compile types, that job typechecks instead. Nothing else.
- **On the push that publishes:** build the images that changed, then deploy. Two jobs by default: build and push, then the server pulls by digest and checks health.
- **On request** (the `run-full-ci` label or a release tag): the whole suite, browser E2E, tests that need a real database or queue, release packaging and runtime proofs.

## Limits

- The PR job finishes in about 2 minutes of work on a warm cache; merge-to-deploy in about 5. A step past that is a finding to remove or move, never a budget to raise.
- The push to main does not re-validate: branch protection requires the PR check with the branch up to date (`strict`), so main receives the tested tree. Where the plan offers no branch protection, the deploy job starts with a provenance guard instead: a successful run of the PR workflow on the PR head whose tree equals the deployed tree.
- Jobs run on GitHub-hosted runners. The self-hosted runner (`pcwin`) is the fallback for an exhausted quota: the selector keeps hosted as the default (`vars.ACTIONS_RUNNER_LABELS_CI || '["ubuntu-latest"]'`), and the variable is set only while the quota is out.
- More jobs are fine when they cut time or isolate secrets (parallel builds, several deploy targets), stated in a `# ci-jobs: <reason>` comment in the workflow.
- Adding a job, trigger or step needs a stated reason. When you touch a workflow that breaks this rule, trim it in the same change.

## Gotchas

- **Skipped ancestors.** When a job can be skipped, every job downstream of it needs `if: always() && needs.<job>.result == 'success'` (or an explicit skipped-or-success check). A plain `needs.<job>.result == 'success'` still carries the implicit `success()`, which a skipped ancestor turns false, so publish, deploy or tag promotion silently stop running.
- **Provenance guard** (only where branch protection is unavailable). The proof of an earlier verdict is a workflow run, never a check or status name: read it from the Actions runs API and require `run.path` equal to the expected workflow file, same repository and head repository, `event: pull_request`, the exact head SHA, `conclusion: success`, and the tested tree equal to the deployed tree. Any API error or ambiguity runs the full gate. Commit statuses, check-run names and artifacts can be written by any workflow with the right permission, so they never authorize a skip.
