---
name: luna-executor
description: "Luna executor (cheap executor) for governed delivery with Codex multi-agents v2: one bounded package per native Luna or exceptional Terra subagent, coordinated parallel writers in the user's primary checkout when ownership is disjoint, worktrees only when real isolation is required, evidence handoff, controller audit, and a human gate before the next execution wave. Use when the user asks to work through pending fixes, requests a dedicated Luna executor or cheap executor, or wants implementation delegated to Luna/Terra subagents."
---

# Luna Executor

A **Luna executor** is a governed multi-agent delivery relay: the controller scopes and audits one execution wave; one native Luna subagent owns each bounded package; independent packages may run concurrently in the user's persistent primary checkout when their ownership is disjoint and Git mutations are serialized; then the user inspects the integrated result and releases the next wave. Use Terra only for a qualifying escalation. A worktree is an isolation tool, not the default unit of parallelism.

## Executor contract

- Use the current task's native multi-agent collaboration. Do not create a user-owned Codex thread for the executor.
- Spawn one Luna subagent with maximum reasoning per package by default. Dispatch multiple Luna subagents concurrently when their packages are independent and the controller has proved non-overlapping ownership. Use a bounded context fork when the runtime requires it for an explicit model selection; put the complete contract in every dispatch packet.
- Use Terra with maximum reasoning only for credentials/auth/OIDC, production or infrastructure mutation, irreversible migration or restore, high blast radius, or concrete Luna capability/security evidence. Duration, file count, or generic complexity do not qualify.
- Give each executor one coherent, reversible package with explicit ownership and non-goals. Tell it that other agents share the filesystem and that it must preserve unrelated edits.
- Prefer the user's persistent primary checkout for serial and coordinated parallel work so the user can inspect, run, and test the integrated implementation directly. Multiple writers may share it only with disjoint allowed paths or subsystems, explicit dependency ordering, and a controller-managed Git turn.
- Create an agent worktree only when a package needs real isolation: overlapping writable paths, an independent branch/index/HEAD, incompatible repository-wide mutations, or a concrete interference risk. Keep runtime, browser/UI, manual acceptance, and user-visible testing in the primary checkout.
- Permit read-only scouts or reviewers whenever they materially improve diagnosis or independent review. They may communicate directly with executors. For writers, enforce one owner per writable path or subsystem, never one writer per checkout as a blanket limit.
- Keep the controller read-only with respect to implementation code. It may create or update the issue, PR metadata, ledgers, task messages, ownership map, and serialized Git-turn schedule required by the workflow.
- Make each executor stop after its evidence handoff. Leave the primary checkout on the integrated reviewable branch/HEAD after all shared-checkout Git turns complete. Retain any isolated worktree until the controller accepts its handoff.
- Resume the same executor subagent for rework or isolated-worktree cleanup only after the controller's disposition. Do not replace natural continuation with a new agent.
- Stop after the primary-checkout wave handoff, or after accepted isolated-worktree cleanup, and ask the user whether to release the next wave.

The executor cycle is complete only when every package in the wave has an audited disposition, the primary checkout is left ready for user inspection and testing, every isolated worktree has been removed or explicitly retained as a blocker, durable state is synchronized, and the user has received the next decision.

## 1. Scope one execution wave

Inspect current repository, remote, issue/PR, CI, and ledger state. Select the smallest packages that can each change one causal boundary and produce reviewer-facing evidence. Keep dependent packages sequential; place only independent packages in the same wave.

Write one dispatch packet per package containing:

- objective and source issue;
- observed failure or evidence URL;
- allowed files or subsystem;
- non-goals and forbidden side effects;
- exact base, wave branch, and PR topology;
- required diagnosis and proving checks;
- commit, push, PR, tracker, and handoff requirements;
- workspace mode: shared primary checkout by default, or the concrete isolation requirement that justifies a worktree;
- allowed writable paths, shared dependencies, sequencing constraints, and Git-turn policy;
- explicit instruction to preserve the selected workspace after handoff.

Choose one topology for the wave before dispatch:

- **Shared primary checkout:** prepare one integration branch before spawning writers and use one PR for the whole wave. Each package owns a bounded commit slice on that branch. Executors never switch branches; the controller owns PR creation and metadata after the integrated handoff.
- **Isolated independent:** when a package needs its own branch or PR, give it an isolated worktree based on the freshly confirmed remote default branch and open its PR to that branch.
- **Isolated stacked:** branch the worktree from the confirmed head of the unmerged parent PR, open the child PR to the parent branch, and record the dependency plus later retarget/rebase obligation.

Multiple independent PR heads cannot share one checkout. Requiring separate branches, indexes, HEADs, or PRs is itself a real isolation requirement.

Match or create the repository issue and required durable task before broad execution. Follow the closest `AGENTS.md` for tracker, project, labels, branch, and proof rules.

Completion criterion: every package has a source issue, live ledger state, bounded dispatch packet, and explicit base SHA plus PR topology; the wave has one prepared integration branch/PR or one isolated branch/PR per package, plus a complete ownership map with either disjoint writers or an isolation boundary.

## 2. Establish the preflight receipt

Before allowing edits, record separately:

- repository identity and remote;
- primary-checkout path, branch, HEAD, and status inventory;
- wave roster, package dependencies, allowed writable paths, and owner per path or subsystem;
- workspace mode and the isolation justification when mode is `worktree`;
- the serialized Git-turn policy for shared-checkout writers;
- every active worktree and owner;
- requested remote base SHA from a fresh remote read;
- prepared integration branch and PR owner for shared-primary mode, or the isolated branch per worktree;
- initial executor-workspace HEAD;
- effective branch base, proven by ancestry or merge-base rather than inferred from the PR target;
- disk space and repository-specific floor;
- availability of native subagents, requested model/effort, communication tools, Git transport, and required trackers.

Treat the primary-checkout snapshot as an invariant. Preserve unrelated user changes. A dirty checkout alone is not a reason to create a worktree; overlapping intended paths, incompatible Git state, or inability to accept the package safely is real isolation pressure. Stop and ask the user when ownership cannot be resolved without risking their changes.

If remote-base confirmation, Git transport, disk floor, CI completion, tracker sync, or cleanup deviates from the happy path, read [exceptions](references/EXCEPTIONS.md) before authorizing edits or the next wave.

Completion criterion: the effective branch starts from the confirmed intended base, the primary-checkout invariant, ownership map, Git-turn policy, and every workspace mode are recorded, and every environmental blocker is distinguished from a product failure.

## 3. Dispatch and coordinate the executors

Spawn one dedicated subagent per package in the current task. Select Luna by default or Terra only when the preflight records a qualifying escalation reason. Pass each subagent its complete dispatch packet and the minimum evidence needed to reconstruct the failure; do not rely on inherited chat context. Require every executor to read applicable repository instructions and domain skills before editing, then work in the primary checkout by default.

Parallel shared-checkout writers must obey all of these rules:

1. each writable path or subsystem has exactly one owner for the wave, including tests, generated files, migrations, and documentation;
2. no executor runs formatting, code generation, dependency installation, or repository-wide rewrites that can touch another owner's paths without first sequencing that operation;
3. no executor stages, commits, rebases, switches branches, or pushes until the controller grants its Git turn; shared-checkout executors never switch away from the prepared wave branch;
4. Git turns are serialized; the executor refreshes status and HEAD, stages only explicit owned paths, inspects the staged diff, commits, then reports the new HEAD before the next turn;
5. if a shared contract must change, sequence that contract package first and resume dependent executors only after its handoff.

Create and own an isolated worktree under the repository-approved agent-worktree root only when those rules cannot provide safe coordination. Do not start a development server, browser/UI QA, manual acceptance flow, or isolated QA database there. Before user-visible or runtime validation, publish or preserve the intended work, audit it, hand the exact branch/HEAD to the primary checkout, remove the clean worktree, and verify the primary checkout state.

Record each returned agent id and canonical agent name with its package id, selected model/effort, escalation reason if any, workspace mode, allowed writable paths, primary-checkout path, and worktree path only when isolation creates one. Use native agent messages for concise facts and corrections:

- send a message while the executor is running;
- use a follow-up task to resume the same idle executor for rework or cleanup;
- wait on agent mailbox updates with bounded, low-noise waits;
- interrupt only for a user override or an unsafe active side effect, then capture a recovery checkpoint.

Allow direct executor-to-scout or executor-to-reviewer exchange when it shortens factual handoffs. The controller remains accountable for scope, dispositions, and user-facing claims.

Each executor must:

1. reproduce the smallest relevant failure;
2. state one causal hypothesis;
3. falsify or confirm it;
4. implement the smallest root-cause correction inside ownership;
5. run proportional checks;
6. inspect the final diff;
7. wait for its Git turn, then commit and push only its owned paths without rewriting shared history;
8. in isolated mode, open or update its assigned PR and trigger required checks; in shared-primary mode, report its commit so the controller can update the single wave PR after integration;
9. synchronize required ledgers;
10. return the handoff to the controller and become idle with the selected workspace preserved.

Monitor with compact agent waits. Report changed milestones to the user; suppress unchanged polls. Send factual corrections such as a stale base, scope drift, missing evidence, or an unsafe side effect directly to the running executor. Keep the same executor for rework within each package. If ownership begins to overlap, pause the affected writers and either sequence the dependency or move one package to an isolated worktree before further edits.

Completion criterion: every executor is idle with a final handoff, or has named a concrete blocker that prevents a safe handoff; all shared-checkout Git turns are accounted for.

## 4. Require the handoff receipt

Accept a handoff only when it contains:

- initial workspace HEAD, confirmed remote base, and effective base;
- workspace mode and path, allowed writable paths, wave or isolated branch, final commit, Git-turn order, and clean/dirty state;
- cause, reproduction, correction, and smallest implementation anchor;
- exact diff surface and line/file counts;
- local commands and results;
- wave or package PR, issue, CI, workflow, and artifact URLs with current states;
- skipped checks, independent residual failures, and remaining risk;
- durable ledger state;
- executor agent id/name, package id, selected model/effort, and any supporting agent ids;
- a fresh comparison showing the primary-checkout invariant and unrelated user changes were preserved;
- readiness for user inspection/testing in the primary checkout, or the exact handoff still required from an isolated worktree;
- confirmation that merge, deploy, and cleanup were performed only if authorized.

Separate **package proof** from **system proof**. A package may remove its targeted blocker while a later workflow step still fails. Keep the PR draft and ledger non-Done when the requested end-to-end gate remains red.

Completion criterion: every material claim in every package handoff has direct evidence and a bounded status, and the integrated wave state is reconstructable.

## 5. Audit before cleanup

The controller independently verifies, from live state:

- primary-checkout branch, HEAD, status, and invariant;
- workspace mode and, when applicable, executor-worktree cleanliness;
- ownership map, Git-turn order, package commits, and absence of cross-owner staged files;
- base-to-head ancestry, diff, and ownership;
- local and remote branch SHAs;
- PR base, head, draft/state, metadata, and checks;
- decisive failed-step logs rather than only the workflow conclusion;
- issue and durable ledger status.

Disposition:

- **Accept package into wave:** the package is bounded and honestly evidenced; preserve its commit and continue auditing the remaining wave.
- **Accept wave in primary checkout:** every package is bounded and honestly evidenced; leave the integrated checkout ready for the user's inspection and testing.
- **Accept in isolated worktree:** the package is bounded, published, and honestly evidenced; hand it to the primary checkout, then resume the same executor for cleanup.
- **Rework:** send exact findings as a follow-up task to the same executor; preserve its selected workspace and repeat the handoff/audit gate.
- **Blocked:** retain an isolated worktree only when cleanup would lose unpublished evidence; state the owner, blocker, and recovery action.

Completion criterion: the controller can reproduce every handoff and the integrated state, and has chosen exactly one disposition per package plus one disposition for the wave.

## 6. Finalize the workspace

For shared primary-checkout mode:

1. verify the integrated package commits, intended diff, branch, HEAD, status, and publication state;
2. preserve unrelated user changes and avoid reset, clean, branch switching, or deletion not required by the package;
3. leave the checkout on the exact reviewable state and report the commands or journeys the user can run there;
4. record the handoff in required ledgers without upgrading an incomplete delivery to Done.

For isolated-worktree mode, after controller acceptance and safe handoff to the primary checkout, resume the same executor subagent to:

1. verify the tree is clean and every intended commit is published or preserved;
2. leave the worktree before removing it from the parent repository;
3. remove only its owned worktree with `git worktree remove`;
4. run `git worktree prune`;
5. preserve local and remote branches, commits, PRs, caches outside the worktree, and the primary checkout;
6. prove the path is absent, only expected worktrees remain, published SHAs still resolve, and the primary-checkout invariant still matches;
7. record cleanup in required ledgers without upgrading an incomplete delivery to Done.

The controller rechecks the primary-checkout handoff and any isolated-worktree cleanup receipt.

Completion criterion: the primary checkout is ready for user inspection/testing; if isolated mode was used, every owned path is absent, Git metadata is pruned, and published work remains intact.

## 7. Hold the human gate

Report:

- what each package and the integrated wave delivered;
- the strongest fresh proof;
- PR and workflow state;
- residual blockers and their independence from the diff;
- primary-checkout readiness and any isolated-worktree cleanup state;
- the recommended next wave, package topology, and why it is next.

End at the decision. Spawn the next execution wave only after the user explicitly releases it.

Completion criterion: the user can choose merge/review, rework, next wave, or stop without reconstructing hidden state.
