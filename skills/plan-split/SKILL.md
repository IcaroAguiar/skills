---
name: plan-split
description: Turn a complex engineering request into a concise, user-approved execution plan with bounded missions, ownership, risk, authority, and verification. Use only when explicitly invoked as the planning phase of Split Engineering or when the user directly asks for plan-split.
---

# Plan Split

Produce a linear execution plan. Do not implement it.

## Discover facts

1. Read applicable instructions and inspect the real repositories, branches, runtime, services, documentation, issue or PR state, and existing tests.
2. Use read-only scouts when independent discovery can reduce context pollution or latency. Give each scout a bounded factual question and forbid writes.
3. Resolve facts from sources instead of asking the user. Mark observed facts, source-backed claims, inference, and assumptions separately.

## Resolve decisions

1. Compose `$grilling` when available. Otherwise ask one decision at a time with a recommended answer.
2. Scale the interview to uncertainty. Stop when objective, non-goals, constraints, acceptance, authority, risk, environment, and unresolved decisions are explicit.
3. Challenge false decomposition, unnecessary parallelism, trivial testing, hidden production authority, and work that does not justify a graph.

## Build the plan

Create one mission per verifiable delivery, not per arbitrary layer or repository. For each mission define:

- unique ID, title, kind, repository and environment;
- observable result and acceptance criteria;
- exclusive ownership boundary;
- only the dependencies that genuinely block it and its integration milestone;
- risk, selected binding mode, logical specialist role, and exact profile; in `strict-openai`, fix Explorer to Luna/medium, Reviewer to Luna/high, and writers plus test writers to Luna/xhigh;
- local executor checks;
- independent test obligations;
- authority envelope and prohibited actions;
- artifacts and receipts required to pass.

Represent integration only when it needs distinct ownership. Plan independent testing by usable milestone, not by test-count quotas.

## Gate the plan

1. Keep the plan short: objective, non-goals, decision points, missions, ownership, verification, authority, and risks.
2. Mark advisor consultation as `required`, `optional`, or `not needed`, with its exact question.
3. Ask the user for approval of the intended outcome, non-goals, authority envelope, and material risks. Do not ask them to approve orchestration mechanics.
4. Freeze the approved plan. Corrective work continues automatically; replan only when outcome, scope, authority, or irreducible risk changes.
