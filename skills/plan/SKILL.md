---
name: plan
description: Create a lightweight implementation plan for local, low-risk, clearly bounded work. Use only when the task is not substantial enough to require consensus-plan.
---

# Plan

Use this skill for lightweight planning only.

`plan` is no longer the default planning lane for non-trivial work. When the task is ambiguous, cross-cutting, risky, or naturally decomposes into multiple implementation lanes, use `consensus-plan` instead.

## Use When

- The task is local and bounded
- Verification is obvious
- There is little or no architectural branching
- The user explicitly wants a short implementation plan
- A written checklist is useful before coding, but rigorous consensus planning would be overkill

## Do Not Use When

- Work is non-trivial
- The task needs aggressive interrogation
- The task needs multi-role sequential review
- The task benefits from lane decomposition for `subagent-driven-development`
- The task changes contracts, schemas, migrations, integrations, or sensitive surfaces

## Core Behavior

1. Inspect the repository first.
2. Ask at most the minimum number of questions needed.
3. Prefer codebase inspection over asking the user for repository facts.
4. Produce a short, concrete, executable plan.
5. Stop after the plan is written.

## Output

Write the plan to `docs/ai/plans/YYYY-MM-DD-<task-slug>.md` when persistence is useful.

The plan should include:

- goal
- scope
- files/areas likely affected
- ordered implementation steps
- verification steps
- notable risks or assumptions

## Writing Standard

- keep it concise
- keep it concrete
- avoid generic “consider” language
- avoid five-step templates when the work is smaller
- prefer visible paths over hidden runtime directories

## Completion Condition

This skill is complete when the lightweight plan is ready to execute or has been written to a visible path.
