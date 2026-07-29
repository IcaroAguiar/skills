---
name: split-review
description: Create one dedicated Codex task per PR and drive each review/fix loop to a merge decision.
disable-model-invocation: true
---

# Split Review

Use the current task as coordinator. Create user-visible Codex project tasks for the PR work; reserve collaboration subagents for the Thermos passes inside each task.

## 1. Resolve the split

Resolve PRs from URLs, numbers, or the linked PR set already established in the conversation. Map every PR to its repository, saved Codex project, base, current head, and existing checkout or worktree.

When invocation context identifies one PR, create one task. When it identifies a linked set, create one task per PR. Ask for scope only when neither is unambiguous.

**Complete when:** every PR has an exact project, checkout, base, and head; no two PRs share a blended review scope.

## 2. Fan out native tasks

Use `list_projects`, then call `create_thread` once per PR, in parallel when possible. Reuse a suitable worktree. When isolation is needed and no checkout fits, create a Codex worktree from the existing PR branch.

Give each task its PR URL, repository, checkout, scope, risk areas, and this contract:

1. Read applicable `AGENTS.md` files and confirm the live diff and head.
2. Run `$thermos`: two independent reviewers in parallel over the same complete PR diff.
3. Synthesize every actionable finding with severity, file reference, failure mode, and evidence.
4. Correct every actionable finding on the PR branch and add regression coverage.
5. Run proportional gates: focused tests plus applicable build/typecheck/lint and `git diff --check`.
6. Commit and push to the existing PR branch without force push. A user-specified read-only constraint overrides this step.
7. Run a fresh `$thermos` on the new head. A finding reopens steps 3–7 until both reviewers return zero actionable findings on the same head.
8. Return initial findings, corrections, tests, commits, rejected findings with rationale, and residual risks.

The task's authority ends at the reviewed PR branch. Merge, ready state, deploy, and tracker reconciliation remain with the user or a later explicit instruction.

**Complete when:** one task ID is recorded for every PR and every task has started with the full contract.

## 3. Drive convergence

Monitor each task with `read_thread`. Use `send_message_to_thread` to resume a task that pauses after review, omits a correction or gate, reviews a stale head, skips the fresh Thermos, or claims completion without evidence.

Require two explicit zero-finding verdicts on the same head. Replace a stalled reviewer instead of lowering the bar. Classify pre-existing failures separately from PR regressions and require evidence for the classification.

**Complete when:** every task has either converged on two clean reviewers with verification or reported a concrete blocker that the coordinator cannot resolve within scope.

## 4. Judge the gate

Keep these states separate:

- `THERMOS CLEAN`: both reviewers are clean on the current head.
- `CHECKS GREEN`: promised local gates and required remote checks are green.
- `FORMAL REVIEW`: GitHub approvals, change requests, and actionable review threads.
- `MERGE READY`: all required states are satisfied on the unchanged head.

Thermos establishes code-review evidence; GitHub holds formal review state.

**Complete when:** each PR has an evidence-backed state and a clear merge recommendation.

## 5. Consolidate here

Report per PR:

- repository, PR, branch, and reviewed head;
- final gate states;
- every initial finding and its correction;
- tests and checks actually run;
- commits pushed and final Thermos verdicts;
- rejected findings with technical rationale;
- baseline noise, skipped checks, residual debt, and risk;
- whether the user can authorize merge.

For linked PRs, finish with cross-PR dependencies and merge order.

**Complete when:** every finding is paired with a correction or evidence-backed rejection, every PR has a recommendation, and no worker result is hidden from the coordinator report.
