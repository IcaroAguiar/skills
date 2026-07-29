---
name: orchestrator-lite
description: "Use automatically for broad coding work that benefits from orchestration: multi-step implementation, multi-repo or multi-module changes, worktree/PR-per-task workflows, parallel or delegated agents, review-gated execution, or when the user says orchestrator, orchestrate, multi-agent, DAG, worktree, PR por tarefa, or automatic workflow."
metadata:
  short-description: "Lightweight worktree/review/smoke orchestration"
---

# Orchestrator Lite

Use this skill to turn broad work into a small, auditable orchestration lane without installing a heavyweight external orchestrator.

Default posture: automate structure, not trust. Keep merge/deploy authority human-gated unless the user explicitly asks otherwise and verification is complete.

## Trigger

Use this skill when the task is:

- broad, multi-step, multi-repo, multi-module, or cross-boundary;
- likely to benefit from worktree isolation or PR-per-task;
- asking for orchestration, DAG, parallel agents, subagents, delegated work, review gates, or automatic workflow;
- risky enough that execution needs explicit ownership, tests, smoke, review, and cleanup.

## Operating Contract

1. Inspect before acting:
   - repo root and local instructions;
   - branch and dirty state;
   - existing worktrees;
   - package/task commands;
   - existing utilities, helper APIs, contracts, schemas, and local patterns that could be extended instead of duplicated;
   - environment readiness: dependencies installed, expected services/ports, env/config availability without exposing secrets, and whether the agent can actually run verification;
   - likely verification path.
2. Classify the work:
   - single-lane: one focused branch/worktree, no parallelism;
   - orchestrated-lane: multiple independent write scopes, possible worktrees/subtasks;
   - sensitive-lane: auth, billing, permissions, secrets, production, migrations, or deploy. Keep primary control and add security review.
3. Build the execution packet:
   - objective;
   - issue-style task framing: problem, affected surface, acceptance criteria, constraints, and explicit non-goals;
   - Ask/plan-first step for broad or ambiguous work before switching into implementation;
   - authorized scope and out-of-scope actions that require a pause/confirmation;
   - implementation notes path for material work where decisions, deviations, tradeoffs, or unresolved questions may accumulate;
   - existing utilities/contracts checked before adding new helpers or abstractions;
   - checkpoint cadence for re-stating constraints on long sessions or multi-file generation;
   - environment readiness gaps and whether large outputs/logs should be written to searchable files instead of pasted into chat;
   - slices with owner/write scope;
   - shared boundaries each slice may touch, such as API contracts, schemas, migrations, env/config, auth/permission surfaces, routes, generated clients, package manager files, or shared design-system primitives;
   - branch/worktree naming;
   - dependencies between slices;
   - verification per slice;
   - final integration/review gate;
   - cleanup plan.
4. Use worktrees conservatively:
   - one worktree per independent write scope by default;
   - when an orchestrated-lane has 2+ implementation slices, use one worktree per slice unless setup cost is larger than the change and state why;
   - no two agents write the same files;
   - no agent touches shared boundaries outside its declared ownership without pausing to update the packet;
   - keep generated scratch under `/private/tmp` or approved scratch paths;
   - remove or archive stale worktrees after completion.
5. Use agents only when allowed by the runtime and task:
   - delegate only bounded, reversible, deterministic slices;
   - do not delegate sensitive/credential/architecture-critical work unless explicitly bounded and independently reviewed;
   - require compact evidence from each worker.
6. Review before completion:
   - material code changes require deterministic checks and an independent review gate where available;
   - for PR-like work, treat review as a first-class deliverable: include reviewer role/model, findings disposition, and evidence in the packet;
   - summarize implementation notes in the final evidence, and only leave/commit a notes file when the repo convention or user request makes that artifact useful;
   - for long sessions, refresh acceptance criteria, non-goals, and write boundaries before continuing into the next slice;
   - if logs, CI output, traces, or generated reports are large, write them to a file under `/private/tmp` or approved scratch path and summarize only the relevant evidence;
   - do not claim done until checks/smoke/review are fresh or explicitly blocked.

## Model Routing

Do not assume orchestration means GPT-5.5 for every worker.

- If the user explicitly asks for Codex Spark, fast agents, cheap executors, or speed-first subagents, use `gpt-5.3-codex-spark` for bounded implementation workers whenever the runtime supports model override.
- Prefer `default` or `worker` agent types for Spark-routed implementation slices, because specialized role agents may have fixed models that cannot be overridden.
- Reserve fixed GPT-5.5 specialist agents for review, architecture, security, sensitive reasoning, or when the runtime requires that role's fixed model.
- If a requested model cannot be applied because the selected agent role has a fixed model, switch to a compatible generic worker or state the limitation before spawning.
- Include the chosen model per slice in the execution packet when model routing matters.

## Decision Matrix

Adopt a lightweight single-lane when:

- one repo and one cohesive change;
- fewer than five known files;
- one test/smoke path can prove it.

Use orchestrated-lane when:

- independent slices can be assigned without write conflicts;
- each slice has a clear verification command;
- context transfer is cheaper than doing it sequentially;
- cleanup and integration are clear.
- shared boundaries can be named explicitly before edits.

Avoid or pause orchestration when:

- repo is dirty in affected files and ownership is unclear;
- the task depends on secrets, production state, or credentials not yet verified;
- worktree setup would be larger than the change;
- tests/smoke cannot be identified.

## Required Packet

Before edits on orchestrated-lane work, produce this compact packet:

```text
Objective:
Lane: single-lane | orchestrated-lane | sensitive-lane
Repo/root:
Current branch:
Dirty-state handling:
Issue-style framing:
Ask/plan-first output:
Authorized scope:
Out-of-scope actions requiring confirmation:
Implementation notes path:
Existing utilities/contracts checked:
Checkpoint cadence:
Environment readiness gaps:
Large output handling:
Slices:
- name:
  owner:
  write scope:
  shared boundaries:
  worktree:
  model:
  dependencies:
  verification:
Review gate:
Integration plan:
Cleanup plan:
Residual risks:
```

## Commands

Use the bundled diagnostic script from a repo root when useful:

```bash
bash <skill-dir>/scripts/orchestrator_status.sh
```

The script is read-only. It reports git root, branch, dirty summary, worktrees, remotes, and likely package scripts without printing secrets.

## External Orchestrators

Do not install external orchestrators automatically inside a real project unless the user explicitly asks for that specific tool and accepts its permissions. First pilot external tools in a disposable repo.

Candidate tools to monitor or pilot:

- worktree-only helpers: `git-stint`, `rift`, `worktree-pr`;
- UI/TUI orchestrators: Orca, Grove, Orkest, Agent Orchestrator;
- DAG/pipeline plugins: Orchestra, WORCA.

External adoption gate:

- local-first;
- no broad GitHub/Linear token required for first test;
- no auto-merge;
- worktree isolation;
- logs/audit trail;
- clean uninstall path;
- successful disposable-repo smoke.
