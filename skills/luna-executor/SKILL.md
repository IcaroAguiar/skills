---
name: luna-executor
description: "Luna executor (cheap executor) for serial delivery: one bounded package per dedicated Codex thread, with isolated worktree, evidence handoff, controller audit, owner cleanup, and a human gate before the next package. Use when the user asks to work through pending fixes one at a time or explicitly requests dedicated Luna tasks/threads instead of subagents."
---

# Luna Executor

A **Luna executor** is a serial delivery relay: the controller scopes and audits; one dedicated Luna task executes; the same task cleans its worktree; the user releases the next package. Keep exactly one executor task in flight.

## Executor contract

- Use a dedicated Codex task/thread as the executor. Keep collaboration subagents idle.
- Default to Luna with maximum reasoning when that exact runtime is available. Report an unavailable model or task capability before substituting it.
- Give each task one coherent, reversible package with explicit ownership and non-goals.
- Keep the controller read-only with respect to implementation code. It may create or update the issue, PR metadata, ledgers, and task messages required by the workflow.
- Make the executor stop after its evidence handoff with the worktree intact.
- Send cleanup as a second turn to the same executor only after the controller accepts the handoff.
- Stop after cleanup and ask the user whether to release the next package.

The executor cycle is complete only when the package has an audited disposition, the owned worktree has been removed or explicitly retained as a blocker, durable state is synchronized, and the user has received the next decision.

## 1. Scope one package

Inspect current repository, remote, issue/PR, CI, and ledger state. Select the smallest package that can change one causal boundary and produce reviewer-facing evidence.

Write a dispatch packet containing:

- objective and source issue;
- observed failure or evidence URL;
- allowed files or subsystem;
- non-goals and forbidden side effects;
- exact base and PR topology;
- required diagnosis and proving checks;
- commit, push, PR, tracker, and handoff requirements;
- explicit instruction to retain the worktree after handoff.

Choose the topology before dispatch:

- **Independent:** branch from the freshly confirmed remote default branch; open the PR to that branch.
- **Stacked:** branch from the confirmed head of the unmerged parent PR; open the child PR to the parent branch and record the dependency and later retarget/rebase obligation.

Match or create the repository issue and required durable task before broad execution. Follow the closest `AGENTS.md` for tracker, project, labels, branch, and proof rules.

Completion criterion: one package has a source issue, a live ledger state, a bounded dispatch packet, and one explicit base SHA plus PR topology.

## 2. Establish the preflight receipt

Before allowing edits, record separately:

- repository identity and remote;
- root path, branch, HEAD, and status inventory;
- every active worktree and owner;
- requested remote base SHA from a fresh remote read;
- initial executor-worktree HEAD;
- effective branch base, proven by ancestry or merge-base rather than inferred from the PR target;
- disk space and repository-specific floor;
- availability of the requested model, task tools, Git transport, and required trackers.

Treat the root snapshot as an invariant. A dirty root is user-owned state to preserve, not a reason to reuse it as the branch base.

If remote-base confirmation, Git transport, disk floor, CI completion, tracker sync, or cleanup deviates from the happy path, read [exceptions](references/EXCEPTIONS.md) before authorizing edits or the next package.

Completion criterion: the effective branch starts from the confirmed intended base, the root invariant is recorded, and every environmental blocker is distinguished from a product failure.

## 3. Dispatch and monitor the executor

Create one dedicated Codex task in an isolated worktree. Pass only the dispatch packet and the minimum evidence needed to reconstruct the failure. Require the executor to read applicable repository instructions and domain skills before editing.

The executor must:

1. reproduce the smallest relevant failure;
2. state one causal hypothesis;
3. falsify or confirm it;
4. implement the smallest root-cause correction inside ownership;
5. run proportional checks;
6. inspect the final diff;
7. commit and push without rewriting shared history;
8. open or update the PR and trigger the required remote checks;
9. synchronize required ledgers;
10. return the handoff and wait with the worktree intact.

Monitor with compact task waits. Report changed milestones to the user; suppress unchanged polls. Use follow-up messages for factual corrections such as a stale base, scope drift, missing evidence, or an unsafe side effect. Keep the same executor for rework within the package.

Completion criterion: the task is idle with a final handoff, or it has named a concrete blocker that prevents a safe handoff.

## 4. Require the handoff receipt

Accept a handoff only when it contains:

- initial worktree HEAD, confirmed remote base, and effective base;
- worktree path, branch, final commit, and clean/dirty state;
- cause, reproduction, correction, and smallest implementation anchor;
- exact diff surface and line/file counts;
- local commands and results;
- PR, issue, CI, workflow, and artifact URLs with current states;
- skipped checks, independent residual failures, and remaining risk;
- durable ledger state;
- a fresh comparison showing the root invariant was preserved;
- confirmation that merge, deploy, and cleanup were performed only if authorized.

Separate **package proof** from **system proof**. A package may remove its targeted blocker while a later workflow step still fails. Keep the PR draft and ledger non-Done when the requested end-to-end gate remains red.

Completion criterion: every material claim in the handoff has direct evidence and a bounded status.

## 5. Audit before cleanup

The controller independently verifies, from live state:

- `git worktree list` and the root invariant;
- executor worktree cleanliness;
- base-to-head ancestry, diff, and ownership;
- local and remote branch SHAs;
- PR base, head, draft/state, metadata, and checks;
- decisive failed-step logs rather than only the workflow conclusion;
- issue and durable ledger status.

Disposition:

- **Accept:** the package is bounded, published, and honestly evidenced. Send cleanup to the same task.
- **Rework:** send exact findings to the same task; retain its worktree and repeat the handoff/audit gate.
- **Blocked:** retain the worktree only when cleanup would lose unpublished evidence; state the owner, blocker, and recovery action.

Completion criterion: the controller can reproduce the handoff's state and has chosen exactly one disposition.

## 6. Return cleanup to the owner

In a second turn, instruct the same task to:

1. verify the tree is clean and every intended commit is published;
2. leave the worktree before removing it from the parent repository;
3. remove only its owned worktree with `git worktree remove`;
4. run `git worktree prune`;
5. preserve local and remote branches, commits, PRs, caches outside the worktree, and the root checkout;
6. prove the path is absent, only expected worktrees remain, published SHAs still resolve, and the root invariant still matches;
7. record cleanup in required ledgers without upgrading an incomplete delivery to Done.

The controller rechecks the cleanup receipt from the root repository.

Completion criterion: the owned path is absent, Git metadata is pruned, published work is intact, and the root invariant is unchanged.

## 7. Hold the human gate

Report:

- what this package delivered;
- the strongest fresh proof;
- PR and workflow state;
- residual blockers and their independence from the diff;
- cleanup state;
- the recommended next package, base topology, and why it is next.

End at the decision. Create the next task only after the user explicitly releases it.

Completion criterion: the user can choose merge/review, rework, next package, or stop without reconstructing hidden state.
