---
name: luna-executor
description: "Luna executor (cheap executor) for governed serial delivery with multi-agents v2: one bounded package per native Luna or exceptional Terra subagent, with isolated worktree, evidence handoff, controller audit, owner cleanup, and a human gate before the next package. Use when the user asks to work through pending fixes one at a time, requests a dedicated Luna executor or cheap executor, or wants implementation delegated to Luna/Terra subagents."
---

# Luna Executor

A **Luna executor** is a serial multi-agent delivery relay: the controller scopes and audits; one native Luna subagent executes by default; the same subagent cleans its worktree; the user releases the next package. Use Terra only for a qualifying escalation. Keep exactly one writer in flight.

## Executor contract

- Use the current task's native multi-agent collaboration. Do not create a user-owned Codex thread for the executor.
- Spawn one Luna subagent with maximum reasoning by default. Use a bounded context fork when the runtime requires it for an explicit model selection; put the complete contract in the dispatch packet.
- Use Terra with maximum reasoning only for credentials/auth/OIDC, production or infrastructure mutation, irreversible migration or restore, high blast radius, or concrete Luna capability/security evidence. Duration, file count, or generic complexity do not qualify.
- Give each executor one coherent, reversible package with explicit ownership and non-goals. Tell it that other agents share the filesystem and that it must preserve unrelated edits.
- Permit read-only scouts or reviewers only when they materially improve diagnosis or independent review. They may communicate directly with the executor, but exactly one agent may write implementation code or own the package worktree at a time.
- Keep the controller read-only with respect to implementation code. It may create or update the issue, PR metadata, ledgers, and task messages required by the workflow.
- Make the executor stop after its evidence handoff with the worktree intact.
- Resume the same executor subagent for rework or cleanup only after the controller's disposition. Do not replace natural continuation with a new agent.
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
- availability of native subagents, requested model/effort, communication tools, Git transport, and required trackers.

Treat the root snapshot as an invariant. A dirty root is user-owned state to preserve, not a reason to reuse it as the branch base.

If remote-base confirmation, Git transport, disk floor, CI completion, tracker sync, or cleanup deviates from the happy path, read [exceptions](references/EXCEPTIONS.md) before authorizing edits or the next package.

Completion criterion: the effective branch starts from the confirmed intended base, the root invariant is recorded, and every environmental blocker is distinguished from a product failure.

## 3. Dispatch and coordinate the executor

Spawn one dedicated subagent in the current task. Select Luna by default or Terra only when the preflight records a qualifying escalation reason. Pass the dispatch packet and the minimum evidence needed to reconstruct the failure; do not rely on inherited chat context. Require the executor to read applicable repository instructions and domain skills before editing, then create and own an isolated worktree under the repository-approved agent-worktree root.

Record the returned agent id and canonical agent name with the package id, selected model/effort, escalation reason if any, and worktree path once created. Use native agent messages for concise facts and corrections:

- send a message while the executor is running;
- use a follow-up task to resume the same idle executor for rework or cleanup;
- wait on agent mailbox updates with bounded, low-noise waits;
- interrupt only for a user override or an unsafe active side effect, then capture a recovery checkpoint.

Allow direct executor-to-scout or executor-to-reviewer exchange when it shortens factual handoffs. The controller remains accountable for scope, dispositions, and user-facing claims.

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
10. return the handoff to the controller and become idle with the worktree intact.

Monitor with compact agent waits. Report changed milestones to the user; suppress unchanged polls. Send factual corrections such as a stale base, scope drift, missing evidence, or an unsafe side effect directly to the running executor. Keep the same executor for rework within the package.

Completion criterion: the executor is idle with a final handoff, or it has named a concrete blocker that prevents a safe handoff.

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
- executor agent id/name, selected model/effort, and any supporting agent ids;
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

- **Accept:** the package is bounded, published, and honestly evidenced. Resume the same executor for cleanup.
- **Rework:** send exact findings as a follow-up task to the same executor; retain its worktree and repeat the handoff/audit gate.
- **Blocked:** retain the worktree only when cleanup would lose unpublished evidence; state the owner, blocker, and recovery action.

Completion criterion: the controller can reproduce the handoff's state and has chosen exactly one disposition.

## 6. Return cleanup to the owner

In a follow-up turn, instruct the same executor subagent to:

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

End at the decision. Spawn the next executor only after the user explicitly releases it.

Completion criterion: the user can choose merge/review, rework, next package, or stop without reconstructing hidden state.
