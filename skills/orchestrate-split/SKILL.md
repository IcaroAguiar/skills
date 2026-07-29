---
name: orchestrate-split
description: Orchestrate a complex engineering task as a versioned, evidence-gated graph across planning, isolated execution, integration, independent testing, and reporting. Use only when the user explicitly invokes orchestrate-split or asks to run the Split Engineering suite; do not use for small tasks whose coordination overhead exceeds the work.
---

# Orchestrate Split

Act as the control plane. Keep requirements, decisions, lifecycle state, and user communication in the main thread. Delegate noisy or bounded work; never hide a worker result or treat a worker claim as gate evidence.

## Start the run

1. Check whether the task justifies a graph. For a small task, recommend a direct workflow and wait for confirmation.
2. Detect capabilities before selecting an adapter. Read [references/adapters.md](references/adapters.md).
3. Create a run ledger with `scripts/run-ledger.mjs init`. Keep run artifacts outside product repositories.
4. Invoke `$plan-split`. Permit read-only scouts before approval, but prohibit product writes, branches, commits, pushes, PRs, deploys, or other side effects.
5. Render the first canvas with `$split-report` when the draft graph exists.
6. Present the complete graph contract and obtain explicit user approval. Record the approval and graph version in the ledger. Do not start executor or integrator nodes before this gate.

## Drive the graph

1. Invoke `$split-execution` for ready implementation and integration nodes.
2. Schedule every node whose logical dependencies, ownership boundary, environment, and resource capacity are ready. Never parallelize overlapping writers.
3. Use Luna with `high` reasoning for implementation, integration, and test threads by default. Use `medium` or `low` only for mechanical or deterministic work, or when the user explicitly requests a lower-cost tier.
4. Monitor by critical events: contract confirmation, meaningful milestone, false assumption, shared-contract change, scope growth, risk, blocker, or completion claim.
5. Require a mini-grilling or equivalent contract check before an executor writes code. The main orchestrator resolves ambiguity and drift.
6. Invoke `$split-test` after each integrated, usable milestone. A failed lane reopens the smallest responsible execution node.
7. Regenerate `$split-report` after gate, risk, replan, reopen, block, and milestone events. Keep routine progress in the canvas instead of flooding the main thread.
8. Permit at most three failed correction/retest cycles per lane. Then block and present the attempt history plus a replan proposal.

## Control change

- After the initial graph approval, automatically dispatch ready nodes, admit conforming receipts, run applicable retests within the three-cycle limit, and regenerate the report. Do not request confirmation for those routine gate transitions.
- Treat objective, non-goals, acceptance criteria, scope, ownership, dependencies, authority, risk, and the test matrix as the material graph contract.
- Freeze an approved graph version. When a material contract field changes, invalidate affected receipts, create a new version, show the delta, and wait for user approval.
- Let the orchestrator judge internal gates against approved metrics. Return to the user for initial plan approval, material replan, new authority, high or unresolved risk, a blocker that prevents further safe progress, or the final review decision.
- Bind evidence to source SHA or diff identity, environment, relevant configuration, exact command or journey, result, and artifact.
- Treat a changed source state as invalidating every affected receipt.
- Follow [references/state-machine.md](references/state-machine.md). Use `scripts/run-ledger.mjs`; do not edit lifecycle history by hand.

## Respect authority

- Allow isolated branches, worktrees, and local commits inside approved execution nodes.
- Require explicit authority in the approved graph for dependency installation, push, PR creation, migration, external writes, production access, or deploy.
- Never merge automatically. Never weaken sandbox, secrets, destructive-action, or user-owned-change protections.
- Use a faithful isolated environment for production-like tests. Production remains out of scope unless separately authorized.
- Require all mandatory remote artifacts to be transferred into the run directory. Block the report gate when transfer is unavailable.

## Close the suite

1. Transition to `REPORTING` only after every required execution, integration, and test receipt is current.
2. Have `$split-report` produce one self-contained HTML report under `~/Documents/Codex/reports` by default.
3. Present the outcome, graph status, changes, behavioral proof, screenshots or demos, residual risk, and blocked or skipped obligations.
4. Transition to `AWAITING_REVIEW_DECISION` and ask whether the user wants `$split-review`. Do not launch it automatically.
5. Complete the suite only after the user makes that decision or explicitly ends the run.
6. After the user accepts the report, use the report cleanup helper only for the exact run directory and only with its explicit confirmation argument. Preserve the final HTML; remove intermediate artifacts.

## Recover

- Resume from the ledger and current task/thread states, not memory or narrative alone.
- Reconfirm repository, host, checkout, branch, head, runtime, and service state after reconnects.
- If a persistent-thread API is unavailable, use the generic subagent adapter and mark durability as degraded.
- A task, subagent, test, or review result is a claim until the orchestrator admits its current receipt through the relevant gate.
