---
name: root-cause-plan
description: Use when investigating a suspected bug, regression, cross-repo mismatch, or high-risk behavioral inconsistency before defining a correction plan.
---

# Root Cause Plan

Plan corrective work only after the diagnosis is evidenced.

This skill is the strong-gate sibling of `consensus-plan`. Use it when the main risk is not plan quality alone, but acting on the wrong diagnosis.

## When to Use

- Suspected bug or regression without confirmed root cause
- Cross-repo or cross-surface mismatch where the failure may sit in more than one system
- Conflicting contracts, flows, or behaviors across backend, frontend, infra, or docs
- User asks for a final sweep, diagnosis, correction plan, or pre-PR confidence before implementation
- Opening a PR depends on evidence that the problem is real and correctly located

Do not use when:

- The cause is already confirmed and only implementation planning remains
- The task is a true local fix with obvious verification
- There is no real investigative branch to resolve

In those cases, use `consensus-plan` or a lighter path.

## Non-Negotiables

- Inspect before asking. If the codebase can answer, inspect the codebase.
- Ask one question at a time, always with a recommended answer.
- Use the spirit of `grill-me`: resolve one branch fully before moving to the next.
- No executable correction plan until the root-cause gate passes.
- If the diagnosis stays unproven, stop with a blocked artifact and next investigation steps.
- Prefer subagents when responsibilities split cleanly by repo, surface, or role. If staying local, say why.
- No "ready for PR" language without review gates, automated test planning, QA disposition, and final validation.

## Required Flow

### 1. Context Intake

- Restate the symptom, impacted surface, and failure claim.
- Identify which repos, services, or interfaces may participate.
- Inspect relevant code, docs, tests, telemetry, or prior plans before asking for missing context.

### 2. Investigative Sweep

- Perform local investigation first, then cross-repo investigation if the symptom crosses boundaries.
- Build a concrete map of where the behavior is produced, transformed, consumed, and validated.
- Use subagents when the investigation is separable by repo or responsibility.

### 3. Evidence Map

- Record only confirmed evidence.
- Cite files, flows, endpoints, contracts, tests, or screenshots that support each claim.
- Separate confirmed facts from assumptions, open questions, and missing proof.

### 4. Hypothesis Review

- List plausible root-cause hypotheses.
- Reject weak hypotheses explicitly.
- Prefer one best-supported diagnosis, but only if evidence explains the symptom and excludes the nearby alternatives.

### 5. Root-Cause Gate

This gate has only two valid outcomes:

- `passed`: evidence is sufficient to explain the observed symptom, localize the failure surface, and rule out the strongest alternatives
- `blocked`: evidence is incomplete, contradictory, or still hypothesis-grade

If blocked:

- do not produce an executable correction plan
- rank the remaining hypotheses
- define the next mandatory investigation steps
- do not claim pre-PR readiness

### 6. Correction Plan

Only after `Root cause decision: passed`.

- Define the smallest safe correction
- Call out contract, compatibility, migration, or rollout concerns
- Decompose by lane when responsibilities are separable
- Mark which work should use subagents and which should stay local

### 7. Sequential Review

Review the latest draft in this order:

1. `planner`
2. `architect`
3. `reviewer`
4. `test-auditor`
5. `qa-tester` when UI, CLI, or other interactive multi-step flow is involved
6. `verifier`

Use `critic` only when tradeoffs are structurally important, alternatives are close, or the cost of error is high.

If the plan changes materially after review, rerun the relevant part of the sequence instead of hand-waving approval forward.

### 8. Automated Tests, QA, And Pre-PR Validation

- Define the automated tests needed to prove the correction and prevent regression.
- Define QA coverage for UI, CLI, and interactive flows.
- For backend-only work, QA may be `n/a`, but the reason must be explicit.
- Close with a hard pre-PR validation gate, not a soft recommendation.

## Artifact

Write one visible artifact to:

`docs/ai/plans/YYYY-MM-DD-<task-slug>.md`

If the project already has an explicit visible plan directory, use that instead.

The artifact must be reviewable and must not rely on hidden runtime directories.

## Required Artifact Structure

```md
# <Title>

**Goal:** <objective>
**Why now:** <why this work exists>
**Symptom:** <observed problem or suspected regression>
**Scope:** <included>
**Out of scope:** <excluded>

## Evidence confirmed
- <fact with supporting files, flows, or evidence>

## Cross-repo findings
- <repo or surface specific finding>

## Hypotheses considered
- <hypothesis>
- <why rejected or retained>

## Root cause decision
- Status: `passed` | `blocked`
- Decision: <diagnosis or blocked summary>
- Evidence: <why this status is justified>
- Next mandatory investigation: <required only if blocked>

## Correction plan
- <smallest safe correction>
- <lane or ownership split when applicable>
- <contract or rollout notes when relevant>

## Review gates
- `planner`: `passed` | `blocked` | `n/a`
- `architect`: `passed` | `blocked` | `n/a`
- `reviewer`: `passed` | `blocked` | `n/a`
- `test-auditor`: `passed` | `blocked` | `n/a`
- `qa-tester`: `passed` | `blocked` | `n/a`
- `verifier`: `passed` | `blocked` | `n/a`
- `critic`: `passed` | `blocked` | `n/a` <only when invoked>

## Automated test plan
- <unit, integration, contract, e2e, regression coverage>

## QA plan
- Status: `passed` | `blocked` | `n/a`
- <manual flows or explicit reason for n/a>

## Pre-PR validation gate
- Status: `passed` | `blocked`
- [ ] Root cause confirmed or explicitly blocked with next investigation
- [ ] Relevant reviewers completed
- [ ] Automated tests defined for the correction
- [ ] QA defined or marked `n/a` with reason
- [ ] Final evidence consolidated
- [ ] PR-open conditions explicitly stated

## Deferred questions
- <only unresolved items that do not invalidate the plan>
```

## Review And QA Rules

- `qa-tester` is mandatory for UI, CLI, and interactive multi-step flows.
- Backend-only corrections may mark QA as `n/a`, but only with an explicit reason.
- `reviewer` and `test-auditor` are never optional when the skill reaches an executable correction plan.
- `verifier` closes the artifact and may reopen it if evidence is weak.

## Subagent Rules

- Use subagents when the investigation or review can be split by repo, subsystem, or surface.
- Typical split examples: backend contract vs frontend consumer, admin UI vs member UI, app vs infra, repo A vs repo B.
- If work is too narrow or tightly coupled for delegation, stay local and say why.
- Do not claim a subagent-oriented plan when all investigation was actually single-threaded guesswork.

## Failure Modes

- Jumping from symptom to fix without evidence
- Treating the most likely hypothesis as confirmed root cause
- Producing a pre-PR-ready plan without independent review gates
- Treating QA as optional for interactive flows
- Skipping cross-repo sweep when the symptom crosses boundaries
- Naming a change surface without proving the failure surface

## Pressure Scenarios

### RED

- The agent receives a suspected cross-repo regression and drafts a correction plan before performing a repository sweep.
- The agent sees one plausible explanation and labels it root cause without confirmatory evidence.
- The agent says the plan is ready for PR without `reviewer`, `test-auditor`, and final validation status.
- The agent treats QA as optional for a UI or CLI flow.
- The agent avoids subagents even though the investigation clearly splits by repo or surface.

### GREEN

- For a cross-repo bug, the agent records evidence by repo, closes the diagnosis, and produces a correction plan with ownership and pre-PR gates.
- For backend-only work, the agent keeps strong review and test gates and marks QA as `n/a` with an explicit reason.
- When the root cause does not close, the agent stops with `blocked`, ranks hypotheses, and defines the next investigation steps instead of pretending the plan is implementation-ready.

## Completion Condition

This skill is complete only when one of these is true:

- a root cause is evidenced, the correction plan is defined, and the review, test, QA, and pre-PR gates are explicit
- the artifact is explicitly blocked, with ranked hypotheses and the next mandatory investigation steps

Do not implement from inside this skill.
