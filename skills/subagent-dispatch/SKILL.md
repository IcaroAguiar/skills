---
name: subagent-dispatch
description: Use automatically for delegated, multi-agent, bounded worker, mission-card, broad implementation, investigation, review-gated execution, or "what should Codex delegate?" workflows. Builds compact mission cards and chooses reader/writer agents while keeping the main chat as coordinator.
---

# Subagent Dispatch

Use this skill automatically before edits for any material implementation, fix, refactor, test, CI, PR, or review-gated request. The user does not need to mention subagents, mission cards, or this workflow.

The main chat stays responsible for intent, routing, integration, verification, user-facing decisions, and final judgment. Subagents are bounded workers.

## Role Grid

| Role | Use | Permission |
| --- | --- | --- |
| `spark-reader` | Fast file/path/command scouting | read-only |
| `high-reader` | Careful analysis of a suspected path | read-only |
| `max-reader` | High-risk analysis where being wrong is costly | read-only |
| `spark-writer` | Tiny reversible edits | workspace-write |
| `high-writer` | Normal serious implementation | workspace-write |
| `max-writer` | Hard, risky, or subtle bounded implementation | workspace-write |

Prefer these six generic roles before legacy broad roles. Use specialist reviewers such as `reviewer`, `security-reviewer`, `api-designer`, `architect`, or `performance-reviewer` only when the risk calls for that specialty.

## Runtime Adapters

Use the exact role names only when the active runtime exposes them. If it does not, route by this adapter map and state the intended mission role in the mission card.

| Intended role | Codex Desktop/App fallback | Claude Code | OpenCode |
| --- | --- | --- | --- |
| `spark-reader` | `default` read-only mission; no model/reasoning override | `--agent spark-reader` | `--agent spark-reader` |
| `high-reader` | `default` read-only mission, or risk-matched reviewer/architect when explicitly available | `--agent high-reader` | `--agent high-reader` |
| `max-reader` | `architect`, `security-reviewer`, or `default` read-only mission by risk | `--agent max-reader` | `--agent max-reader` |
| `spark-writer` | `worker` or `default` mission; no model/reasoning override | `--agent spark-writer` | `--agent spark-writer` |
| `high-writer` | `worker` or `default` mission; no model/reasoning override | `--agent high-writer` | `--agent high-writer` |
| `max-writer` | keep primary control or use risk-matched specialist only when bounded | `--agent max-writer` | `--agent max-writer` |

Codex Desktop/App fallback must not use deprecated specialist aliases such as `backend-builder`, `executor`, `frontend-builder`, or `build-fixer` for implementation retries unless a fresh compatibility smoke has already passed in that runtime. If a worker fails before execution with a model or reasoning capability error, retry exactly once through `worker` or `default` with the intended role preserved in the mission card and without model/reasoning overrides.

Codex reviewer gates should continue to use the native `reviewer`, `security-reviewer`, `api-designer`, `architect`, or similar reviewer roles because those are the current active Desktop/App review surfaces.

## Dispatch Gate

Delegate only when the mission can be stated compactly and the worker does not need the whole conversation.

Good delegation:
- bounded, reversible, and deterministic;
- owned files or read scope are clear;
- validation is known or can be discovered;
- output is smaller than doing the work in the main context.

Do not delegate:
- sensitive reasoning, credentials, auth, tenancy, billing, migrations, production, or architecture-defining decisions unless the scope is explicitly bounded and the main chat retains control;
- subjective final judgment;
- final approval, merge-ready, or production-ready claims.

Keep delegation depth at 1. Child agents must not spawn more agents unless the user explicitly authorizes a different workflow.

## Mission Card Decision

For every activation, record the routing decision before implementation:

- `single-lane` or `delegated`;
- intended role from the six-role grid;
- actual runtime role/adapter if the intended role is unavailable;
- reason for delegation or single-lane execution;
- mandatory closeout gates.

When delegating, send only this compact card plus essential paths/snippets:


```markdown
Mission:
Owned scope:
Allowed read scope:
Known context:
Do not touch:
Acceptance criteria:
Verification expected:
Output format:
Stop condition:
```

For write-capable workers, include:

```markdown
Allowed writes:
Behavioral requirements:
Validation command:
Rollback / risk notes:
```

## Output Contract For Workers

Require compact evidence:

```markdown
Status:
Files read:
Files changed:
Commands run:
Summary:
Checks:
Risks / assumptions:
Next action:
```

Reject raw transcripts or unevidenced success.

## Main Chat Closeout

After worker output:
- inspect the diff/evidence yourself;
- run or repeat the required verification when feasible;
- apply `agentic-testability-gate` for material behavior changes;
- apply `agentic-code-review` with the independent reviewer subagent for material code changes;
- report skipped checks and residual risk.
