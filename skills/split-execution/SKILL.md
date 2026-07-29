---
name: split-execution
description: Execute approved Split Engineering DAG nodes through isolated persistent tasks or bounded subagents, with exclusive ownership, contract confirmation, event-driven steering, local commits, proportional checks, and dedicated integration nodes. Use only when explicitly invoked for an approved split graph or when the user directly requests split-execution.
---

# Split Execution

Materialize approved implementation and integration nodes. Do not invent or silently widen the graph.

## Select the adapter

Read [references/execution-adapters.md](references/execution-adapters.md). Prefer user-visible persistent project tasks when the harness exposes them. Otherwise use subagents with the same node contract and record degraded durability.

## Dispatch ready nodes

1. Re-read the approved graph version and current source state.
2. Select every node whose graph, ownership, environment, and capacity dependencies are satisfied.
3. Create an isolated branch or worktree per writer. Never dispatch overlapping write ownership concurrently.
4. Use Luna with `high` reasoning by default. Use `medium` or `low` only when the node is explicitly mechanical, deterministic, or the user requests a lower-cost execution tier.
5. Give each thread the contract in [references/executor-contract.md](references/executor-contract.md), the raw node inputs, exact checkout, prohibitions, and receipt format.
6. Tell every worker it is not alone, must preserve unrelated changes, and must not revert other workers.

## Confirm before writing

Require the executor to return its reconstruction of objective, boundaries, dependencies, strategy, failure modes, and proof. Use a short grilling when ambiguity remains. Transition to `RUNNING` only after the orchestrator accepts the contract.

## Steer by events

- Monitor contract confirmation, milestones, false assumptions, shared-contract edits, scope expansion, risk, blockers, and completion claims.
- Ask questions or redirect at event boundaries. Avoid fixed-interval micromanagement.
- When a worker discovers a material graph change, stop that node and request replan. Do not let the worker mutate the graph.
- Reconfirm live head and diff before admitting any receipt.

## Admit an implementation receipt

Require:

- changed files and behavior-oriented summary;
- why the implementation satisfies the node contract;
- source SHA or diff identity;
- focused tests plus applicable build, typecheck, lint, and `git diff --check`;
- exact commands, results, environment, and artifact paths;
- local commit identifiers;
- skipped checks, blockers, baseline failures, and residual risk;
- no push, PR, merge, deploy, migration, or external write unless the approved node explicitly authorizes it.

Transition the node to `EVIDENCE_PENDING`; let the orchestrator admit or reject the receipt. A receipt can pass the execution node but never substitutes for independent `$split-test` proof.

## Integrate

Use a dedicated integrator thread for each integration node. Provide only passed source nodes and the integration contract. The integrator may merge or cherry-pick into the approved integration branch, resolve conflicts inside its ownership, run integration-local checks, and return a new SHA-bound receipt. A cross-node behavioral failure belongs to `$split-test`; a material contract conflict belongs to replan.
