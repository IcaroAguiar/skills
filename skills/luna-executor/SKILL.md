---
name: luna-executor
description: "Luna executor (cheap executor) for governed serial delivery with multi-agents v2: one bounded package per native Luna or exceptional Terra subagent, working in the user's primary checkout by default and using a worktree only for real parallel work, with evidence handoff, controller audit, and a human gate before the next package. Use when the user asks to work through pending fixes one at a time, requests a dedicated Luna executor or cheap executor, or wants implementation delegated to Luna/Terra subagents."
---

# Luna Executor

A **Luna executor** is a serial multi-agent delivery relay: the controller scopes and audits; one native Luna subagent executes by default in the user's persistent primary checkout; the user can inspect and test the live result there; then the user releases the next package. Use Terra only for a qualifying escalation. Keep exactly one writer in flight.

## Executor contract

- Use the current task's native multi-agent collaboration. Do not create a user-owned Codex thread for the executor.
- Spawn one Luna subagent with maximum reasoning by default. Use a bounded context fork when the runtime requires it for an explicit model selection; put the complete contract in the dispatch packet.
- Use Terra with maximum reasoning only for credentials/auth/OIDC, production or infrastructure mutation, irreversible migration or restore, high blast radius, or concrete Luna capability/security evidence. Duration, file count, or generic complexity do not qualify.
- Give each executor one coherent, reversible package with explicit ownership and non-goals. Tell it that other agents share the filesystem and that it must preserve unrelated edits.
- Prefer the user's persistent primary checkout for serial work so the user can inspect, run, and test the implementation directly. Do not create a worktree merely for isolation, convenience, a dirty checkout, or an unavailable checkout.
- Create an agent worktree only when real parallel work requires a separate writable checkout. Keep runtime, browser/UI, manual acceptance, and user-visible testing in the primary checkout.
- Permit read-only scouts or reviewers only when they materially improve diagnosis or independent review. They may communicate directly with the executor, but exactly one agent may write the package in a given checkout at a time.
- Keep the controller read-only with respect to implementation code. It may create or update the issue, PR metadata, ledgers, and task messages required by the workflow.
- Make the executor stop after its evidence handoff, leaving the primary checkout on the exact reviewable branch/HEAD. If parallel work required a worktree, retain it until the controller accepts the handoff.
- Resume the same executor subagent for rework or parallel-worktree cleanup only after the controller's disposition. Do not replace natural continuation with a new agent.
- Stop after the primary-checkout handoff, or after accepted parallel-worktree cleanup, and ask the user whether to release the next package.

The executor cycle is complete only when the package has an audited disposition, the primary checkout is left ready for user inspection and testing, every parallel worktree has been removed or explicitly retained as a blocker, durable state is synchronized, and the user has received the next decision.

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
- workspace mode: primary checkout by default, or the concrete parallelism that justifies a worktree;
- explicit instruction to preserve the selected workspace after handoff.

Choose the topology before dispatch:

- **Independent:** branch from the freshly confirmed remote default branch; open the PR to that branch.
- **Stacked:** branch from the confirmed head of the unmerged parent PR; open the child PR to the parent branch and record the dependency and later retarget/rebase obligation.

Match or create the repository issue and required durable task before broad execution. Follow the closest `AGENTS.md` for tracker, project, labels, branch, and proof rules.

Completion criterion: one package has a source issue, a live ledger state, a bounded dispatch packet, and one explicit base SHA plus PR topology.

## 2. Establish the preflight receipt

Before allowing edits, record separately:

- repository identity and remote;
- primary-checkout path, branch, HEAD, and status inventory;
- workspace mode and the parallelism justification when mode is `worktree`;
- every active worktree and owner;
- requested remote base SHA from a fresh remote read;
- initial executor-workspace HEAD;
- effective branch base, proven by ancestry or merge-base rather than inferred from the PR target;
- disk space and repository-specific floor;
- availability of native subagents, requested model/effort, communication tools, Git transport, and required trackers.

Treat the primary-checkout snapshot as an invariant. Preserve unrelated user changes. A dirty checkout is not a reason to create a worktree; if intended files overlap user changes or the checkout cannot safely accept the package branch, stop and ask the user.

If remote-base confirmation, Git transport, disk floor, CI completion, tracker sync, or cleanup deviates from the happy path, read [exceptions](references/EXCEPTIONS.md) before authorizing edits or the next package.

Completion criterion: the effective branch starts from the confirmed intended base, the primary-checkout invariant and workspace mode are recorded, and every environmental blocker is distinguished from a product failure.

## 3. Dispatch and coordinate the executor

Spawn one dedicated subagent in the current task. Select Luna by default or Terra only when the preflight records a qualifying escalation reason. Pass the dispatch packet and the minimum evidence needed to reconstruct the failure; do not rely on inherited chat context. Require the executor to read applicable repository instructions and domain skills before editing, then work in the primary checkout by default.

Only when another authorized writer must proceed in parallel, create and own an isolated worktree under the repository-approved agent-worktree root. Do not start a development server, browser/UI QA, manual acceptance flow, or isolated QA database there. Before user-visible or runtime validation, publish or preserve the intended work, audit it, hand the exact branch/HEAD to the primary checkout, remove the clean worktree, and verify the primary checkout state.

Record the returned agent id and canonical agent name with the package id, selected model/effort, escalation reason if any, workspace mode, primary-checkout path, and worktree path only when parallel mode creates one. Use native agent messages for concise facts and corrections:

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
10. return the handoff to the controller and become idle with the selected workspace preserved.

Monitor with compact agent waits. Report changed milestones to the user; suppress unchanged polls. Send factual corrections such as a stale base, scope drift, missing evidence, or an unsafe side effect directly to the running executor. Keep the same executor for rework within the package.

Completion criterion: the executor is idle with a final handoff, or it has named a concrete blocker that prevents a safe handoff.

## 4. Require the handoff receipt

Accept a handoff only when it contains:

- initial workspace HEAD, confirmed remote base, and effective base;
- workspace mode and path, branch, final commit, and clean/dirty state;
- cause, reproduction, correction, and smallest implementation anchor;
- exact diff surface and line/file counts;
- local commands and results;
- PR, issue, CI, workflow, and artifact URLs with current states;
- skipped checks, independent residual failures, and remaining risk;
- durable ledger state;
- executor agent id/name, selected model/effort, and any supporting agent ids;
- a fresh comparison showing the primary-checkout invariant and unrelated user changes were preserved;
- readiness for user inspection/testing in the primary checkout, or the exact handoff still required from a parallel worktree;
- confirmation that merge, deploy, and cleanup were performed only if authorized.

Separate **package proof** from **system proof**. A package may remove its targeted blocker while a later workflow step still fails. Keep the PR draft and ledger non-Done when the requested end-to-end gate remains red.

Completion criterion: every material claim in the handoff has direct evidence and a bounded status.

## 5. Audit before cleanup

The controller independently verifies, from live state:

- primary-checkout branch, HEAD, status, and invariant;
- workspace mode and, when applicable, executor-worktree cleanliness;
- base-to-head ancestry, diff, and ownership;
- local and remote branch SHAs;
- PR base, head, draft/state, metadata, and checks;
- decisive failed-step logs rather than only the workflow conclusion;
- issue and durable ledger status.

Disposition:

- **Accept in primary checkout:** the package is bounded and honestly evidenced; leave the checkout ready for the user's inspection and testing.
- **Accept in parallel worktree:** the package is bounded, published, and honestly evidenced; hand it to the primary checkout, then resume the same executor for cleanup.
- **Rework:** send exact findings as a follow-up task to the same executor; preserve its selected workspace and repeat the handoff/audit gate.
- **Blocked:** retain a parallel worktree only when cleanup would lose unpublished evidence; state the owner, blocker, and recovery action.

Completion criterion: the controller can reproduce the handoff's state and has chosen exactly one disposition.

## 6. Finalize the workspace

For primary-checkout mode:

1. verify the intended diff, branch, HEAD, status, and publication state;
2. preserve unrelated user changes and avoid reset, clean, branch switching, or deletion not required by the package;
3. leave the checkout on the exact reviewable state and report the commands or journeys the user can run there;
4. record the handoff in required ledgers without upgrading an incomplete delivery to Done.

For parallel-worktree mode, after controller acceptance and safe handoff to the primary checkout, resume the same executor subagent to:

1. verify the tree is clean and every intended commit is published or preserved;
2. leave the worktree before removing it from the parent repository;
3. remove only its owned worktree with `git worktree remove`;
4. run `git worktree prune`;
5. preserve local and remote branches, commits, PRs, caches outside the worktree, and the primary checkout;
6. prove the path is absent, only expected worktrees remain, published SHAs still resolve, and the primary-checkout invariant still matches;
7. record cleanup in required ledgers without upgrading an incomplete delivery to Done.

The controller rechecks the primary-checkout handoff and any parallel-worktree cleanup receipt.

Completion criterion: the primary checkout is ready for user inspection/testing; if parallel mode was used, the owned path is absent, Git metadata is pruned, and published work remains intact.

## 7. Hold the human gate

Report:

- what this package delivered;
- the strongest fresh proof;
- PR and workflow state;
- residual blockers and their independence from the diff;
- primary-checkout readiness and any parallel-worktree cleanup state;
- the recommended next package, base topology, and why it is next.

End at the decision. Spawn the next executor only after the user explicitly releases it.

Completion criterion: the user can choose merge/review, rework, next package, or stop without reconstructing hidden state.
