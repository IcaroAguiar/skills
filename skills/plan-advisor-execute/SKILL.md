---
name: plan-advisor-execute
description: Run a standalone, cross-harness engineering control workflow that plans read-only, consults an independent advisor, reconciles the plan, obtains a final advisory risk check, consolidates one execution authorization, and then autonomously coordinates all bounded specialist waves inside it. Use when explicitly invoked outside orchestrate-split for consequential work that needs plan, advisory challenge, reconciliation, advisory release, and multi-agent execution without repeated per-wave approvals. Prefer strict OpenAI Sol/Luna bindings in Codex; declare portable bindings elsewhere and never claim model parity silently.
---

# Plan Advisor Execute

Act as the control plane in the current task. Keep discovery, decisions, reconciliation, integration, verification, and user communication here. Do not invoke `$orchestrate-split`, `$plan-split`, `$split-execution`, `$split-test`, or `$split-report`.

Read [references/workflow-contract.md](references/workflow-contract.md) and [references/harness-bindings.md](references/harness-bindings.md) before planning. Read [references/persistent-executors.md](references/persistent-executors.md) before consolidating the execution plan.

## Run the protocol

1. Select and record `binding_mode` from `harness-bindings.md`. Inspect current evidence read-only and produce `draft_plan_v1`. Use the selected explorer role for bounded high-volume discovery when useful. Do not edit product files, create branches, or dispatch writers.
2. Invoke `$engineering-advisor` once on `draft_plan_v1`. Select `decision` for an unresolved consequential choice; otherwise select `challenge`. Let that skill choose Sol/xhigh by default or its gated Sol/Max profile.
3. Reconcile every material advisory finding as accepted, partially accepted, rejected with evidence, or user-owned. Produce `draft_plan_v2`; stop for any unresolved user-owned decision.
4. Invoke `$engineering-advisor` again in `risk-check` mode on the materially revised `draft_plan_v2`. Treat `PROCEED` as an advisory release signal, never as authority approval. On `REVISE`, `EXPERIMENT`, or `STOP`, do not create executors; follow the workflow contract.
5. Produce one consolidated plan only after the final advisory receipt. Show missions, exclusive ownership, true dependencies, integration order, acceptance, proving checks, exact authority, advisor conditions, and residual risk.
6. Name the selected binding mode, harness adapter, and logical role for every mission in the consolidated plan. Obtain one explicit user approval of the outcome, authority envelope, execution waves, conditional missions, task creation when selected, and any portable model substitution. Record it as the standing `execution_authorization`. It covers the entire consolidated plan, not only the first ready mission. Planning approval does not imply push, PR, merge, migration, deploy, or other external authority unless the envelope names it explicitly.
7. After approval, autonomously coordinate every mission and wave covered by `execution_authorization` according to `persistent-executors.md`: create agents or tasks, advance dependencies, steer, retry, correct, test, review, and integrate without asking again at each transition. In `strict-openai`, resolve Explorer to Luna/medium, Reviewer to Luna/high, and Executor, Debugger, and Test Engineer to Luna/xhigh. In `portable`, use the `split-*` profile and never claim Luna or Sol identity.
8. Admit receipts only after checking current source identity, diff, commands, and evidence. Run or coordinate independent verification before claiming completion.

## Preserve role boundaries

- The current Terra or Luna task is the controller. Do not claim a controller model or effort that the runtime does not expose.
- The advisor is independent, read-only, and consultative. It cannot approve scope, authority, or execution on the user's behalf.
- Executors implement bounded approved missions. They do not reinterpret the plan, widen scope, or own final integration truth.
- Do not request approval merely because a later wave became ready, M0 produced the matrix consumed by M1, an executor needs routine steering, tests failed, reviewer findings require in-scope corrections, or an approved adapter must create the already-declared tasks.
- Request new user approval only when execution would materially change the outcome or non-goals, cross the approved repository or environment boundary, widen the authority envelope, introduce an unapproved external effect, exceed the accepted risk ceiling, or require a model/binding substitution the plan did not authorize.
- Treat binding mode, orchestration adapter, and logical role as separate choices. Never change any of them silently. If the approved plan requires `strict-openai` and exact Sol/Luna profiles are unavailable, stop before execution and report the missing capability.
- Do not call both advisor profiles to manufacture consensus. Repeat advisory only after new evidence or a material plan change.

## Recover safely

Resume from the latest named artifact and re-prove repository, host, checkout, branch, head, runtime, and task state. A task completion, advisory receipt, test result, or prior plan remains a claim until the controller verifies its current evidence.
