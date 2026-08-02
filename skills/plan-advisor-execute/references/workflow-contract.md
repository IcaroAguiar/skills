# Standalone Workflow Contract

Use these named artifacts and transitions. Do not silently skip a gate.

## 1. `draft_plan_v1`

Record:

- objective, non-goals, constraints, acceptance, environment, and authority;
- observed facts with repository, host, branch, head, runtime, or primary source;
- inferences, assumptions, unknowns, and user-owned choices;
- bounded missions with observable delivery and exclusive ownership;
- only dependencies that truly block another mission;
- integration point, proving checks, artifacts, risks, and prohibited actions.

Keep this phase read-only. Missing discoverable evidence belongs to further inspection; a missing product or authority choice belongs to the user.

## 2. `advisory_receipt_v1`

Invoke `$engineering-advisor` with a self-contained packet and fresh context. Use:

- `decision` when realistic options require a recommendation;
- `challenge` when the plan or preferred proposal needs stress testing.

Place `proposal_under_review` last. Do not include an expected verdict, planted flaw, or another reviewer's conclusion.

## 3. `draft_plan_v2`

Create a reconciliation record for every material finding:

| Finding | Disposition | Evidence or change | Plan impact |
|---|---|---|---|
| exact finding | accepted, partial, rejected, or user-owned | current evidence | exact modification |

Resolve local corrections directly. Stop for an unresolved user-owned choice, new authority, or materially expanded outcome.

Add a requirement-to-proof map that was not present in `draft_plan_v1`: for every material requirement, record its observable result, current or required evidence, implementation anchor, and proving check. This revised evidence posture is part of the proposal evaluated by the final risk check.

## 4. `advisory_receipt_v2`

Invoke `$engineering-advisor` in `risk-check` mode with `draft_plan_v2` as the proposal under review. Map requirements to observable evidence and proving checks.

Interpret the verdict:

- `PROCEED`: advisory release; continue to consolidation.
- `REVISE`: return to reconciliation. Do not execute. Re-consult only if the correction produces a materially new proposal or evidence.
- `EXPERIMENT`: run only the smallest authorized read-only or reversible experiment, then rebuild the affected artifact.
- `STOP`: identify the exact missing authority, choice, or evidence and stop.

Do not convert `PROCEED` into user approval and do not create a consensus loop.

## 5. `consolidated_plan`

Present a compact approval surface containing:

- final outcome and exclusions;
- selected `binding_mode`, harness adapter, and any model guarantee or substitution;
- decisions and advisory conditions;
- mission title, result, repository/environment, exclusive ownership, and true dependencies;
- logical specialist role and exact profile for every mission; in `strict-openai`, Explorer is fixed to Luna/medium, Reviewer to Luna/high, and writers plus test writers to Luna/xhigh; in `portable`, the native model binding is disclosed without claiming parity;
- integration order, local checks, independent proof, required artifacts, and residual risk;
- authority envelope and prohibited actions;
- every planned wave, including conditional follow-on missions, with its entry condition, bounded objective, ownership family, authority, and stop condition.

Ask once for explicit approval of the outcome, risks, authority, declared task creation, and all unconditional or conditional execution waves. Store this as `execution_authorization`. Do not split approval by mission or ask separately for persistent-task creation when it is already visible in this approval surface. Do not ask the user to approve internal orchestration mechanics.

The plan may authorize a later mission whose exact inputs are produced by an earlier mission. Define its envelope and deterministic entry rule before approval. For example, M0 may produce a matrix that selects the bounded targets for M1; once M0 passes its checks, the controller instantiates and dispatches M1 without new approval as long as the selected targets remain inside that envelope.

## 6. Execution and completion

Dispatch executors only after `execution_authorization`. That authorization remains valid through all declared waves, dependency transitions, in-scope corrections, retries, tests, reviews, and integration. Do not pause for approval between M0 and M1 or equivalent milestones. The controller admits or rejects each receipt, integrates current source state, performs independent verification, and presents proof, skipped obligations, and residual risk. Thread persistence and worker confidence are coordination evidence, not correctness.

Invalidate the authorization only for a material change to outcome or non-goals, repository or environment boundary, authority, external effects, accepted risk ceiling, or an unapproved model/binding substitution. When invalidated, stop only the affected path, present the exact delta, and request one replacement approval for the revised remainder.
