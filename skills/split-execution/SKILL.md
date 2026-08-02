---
name: split-execution
description: Execute approved Split Engineering missions through isolated strict OpenAI role-tiered Luna profiles or declared portable specialist agents, with exclusive ownership, contract confirmation, event-driven steering, local commits, and proportional checks. Use only when explicitly invoked for an approved split plan or when the user directly requests split-execution. Never silently substitute binding mode, model, role, reasoning tier, or isolation adapter.
---

# Split Execution

Materialize approved missions. Do not invent or silently widen the plan.

## Select the adapter

Read [references/execution-adapters.md](references/execution-adapters.md). Use the exact role profile and effort frozen in the approved plan. If `strict-openai` cannot prove the required role-tiered Luna profile, stop. If `portable` is approved, use the matching `split-*` profile and disclose its inherited or native model semantics.

## Dispatch ready nodes

1. Re-read the approved plan and current source state.
2. Select every mission whose explicit dependencies, ownership, environment, and capacity needs are satisfied.
3. Create an isolated branch or worktree per writer. Never dispatch overlapping write ownership concurrently.
4. Route by mission kind: explorer for read-only mapping, executor for implementation or integration, debugger for causal diagnosis, test engineer for test ownership, and reviewer for independent diff review. In `strict-openai`, use the corresponding role-tiered Luna profile. Do not change the frozen binding automatically.
5. Give each thread the contract in [references/executor-contract.md](references/executor-contract.md), the mission inputs, exact checkout, prohibitions, and receipt format.
6. Tell every worker it is not alone, must preserve unrelated changes, and must not revert other workers.

## Confirm before writing

Require the executor to return its reconstruction of objective, boundaries, dependencies, strategy, failure modes, and proof. Use a short grilling when ambiguity remains. Transition to `RUNNING` only after the orchestrator accepts the contract.

## Steer by events

- Monitor contract confirmation, milestones, false assumptions, shared-contract edits, scope expansion, risk, blockers, and completion claims.
- Ask questions or redirect at event boundaries. Avoid fixed-interval micromanagement.
- When a worker discovers a material plan change, stop that mission and request replan. Do not let the worker widen scope.
- Reconfirm live head and diff before admitting any receipt.

## Admit an implementation receipt

Require:

- changed files and behavior-oriented summary;
- why the implementation satisfies the mission contract;
- source SHA or diff identity;
- focused tests plus applicable build, typecheck, lint, and `git diff --check`;
- exact commands, results, environment, and artifact paths;
- local commit identifiers;
- skipped checks, blockers, baseline failures, and residual risk;
- no push, PR, merge, deploy, migration, or external write unless the approved mission explicitly authorizes it.

Let the orchestrator admit or reject the receipt. It never substitutes for independent `$split-test` proof.

## Pre-review quality gate

Before presenting a completed delivery for final review, re-read the current diff, run the applicable checks, resolve every defect the executor can reproduce, and refresh stale evidence. Do not pass known defects, ignored failures, or unexamined user-visible behavior to final review as if they were complete. Report only the residual risks that remain after this gate.

## Integrate

Use a dedicated integrator only when integration has a distinct ownership boundary. Provide the passed mission receipts and the integration contract. A cross-mission behavioral failure belongs to `$split-test`; a material contract conflict belongs to replan.
