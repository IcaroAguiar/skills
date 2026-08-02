---
name: orchestrate-split
description: Coordinate complex engineering work through a linear plan, selective read-only advisor consultation, and bounded executor missions. Use only when explicitly invoked as orchestrate-split or when the user asks to run the Split Engineering suite; avoid it for small tasks whose coordination overhead exceeds the work.
---

# Orchestrate Split

Act as the control plane. Keep requirements, decisions, plan, integration, and user communication in the main thread. Delegate only bounded work; never treat a worker claim as gate evidence.

## Start the run

1. Check whether the task justifies split work. For a small task, recommend a direct workflow and wait for confirmation.
2. Detect capabilities before selecting an adapter. Read [references/adapters.md](references/adapters.md).
3. Invoke `$plan-split`. Permit read-only scouts before approval, but prohibit product writes, branches, commits, pushes, PRs, deploys, or other side effects.
4. Decide whether `$engineering-advisor` is needed. Use it only for architectural choices, ambiguous requirements, risky trade-offs, debugging dead ends, or a final risk check. Build the canonical self-contained packet, put the proposal under review last, and invoke the skill once.
5. Let `$engineering-advisor` dispatch `engineering-advisor` by default with a fresh-context spawn (`fork_turns: none` when supported), or `engineering-advisor-max` when its escalation gate is met. Do not perform a second advisor dispatch after invoking the skill and never call both profiles to manufacture consensus.
6. Fix one executable plan after the advisory receipt. The orchestrator may accept or reject advice with a reason; ask the user only when the disagreement needs product or authority input. Do not run a consensus loop.
7. Obtain explicit approval for material scope, authority, and risk before product writes.

## Drive the plan

1. Invoke `$split-execution` for each approved mission. Parallelize only disjoint writers with named ownership and a known integration point.
2. Route by the approved binding mode and mission role. `strict-openai` uses `engineering-advisor` or gated `engineering-advisor-max` plus the matching role-tiered Luna specialist. `portable` uses `split-engineering-advisor` and matching `split-*` specialists. Do not change binding, model, effort, or role automatically.
3. Monitor only material events: changed assumption, shared-boundary conflict, scope growth, risk, blocker, or completion claim. Do not poll or micromanage workers.
4. Invoke `$split-test` at each usable integrated milestone. A failure returns to the smallest responsible mission.
5. Use `$engineering-advisor` once before completion only when the outcome is materially risky or the evidence is ambiguous.

## Change control

- Keep the plan linear. List dependencies only when one mission truly blocks another; do not create a DAG, run ledger, graph version, or node lifecycle for ordinary work.
- Replan only for a material outcome, scope, authority, risk, or shared-contract change. The orchestrator handles local corrections and retests without returning to the user.
- Bind evidence to the current diff or source revision, environment, command or journey, and result.

## Respect authority

- Allow isolated branches, worktrees, and local commits inside approved execution nodes.
- Require explicit authority in the approved graph for dependency installation, push, PR creation, migration, external writes, production access, or deploy.
- Never merge automatically. Never weaken sandbox, secrets, destructive-action, or user-owned-change protections.
- Use a faithful isolated environment for production-like tests. Production remains out of scope unless separately authorized.
- Require all mandatory artifacts to be available locally. Remote-only artifacts may be replaced by equivalent locally collected proof; block only when a contractually mandatory proof cannot be reproduced or materialized by any approved adapter.

## Close the suite

1. Have `$split-report` produce a native, user-visible review canvas.
2. Present the outcome, changes, behavioral proof, residual risk, and skipped obligations.
3. Confirm the current diff, applicable checks, and evidence before calling the work complete.
4. Ask whether the user wants an independent review; do not launch it automatically.

## Recover

- Resume from the approved plan, current task/thread states, and current source evidence.
- Reconfirm repository, host, checkout, branch, head, runtime, and service state after reconnects.
- Re-resolve the approved binding and orchestration adapter after reconnects. A native subagent may replace a persistent task only through the adapter-selection rules and without weakening model guarantees, durability, isolation, or authority.
- A task, subagent, test, or review result remains a claim until the orchestrator verifies it.
