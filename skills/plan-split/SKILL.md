---
name: plan-split
description: Turn a complex engineering request into a user-approved, versioned execution DAG with explicit ownership, dependencies, risk, authority, acceptance metrics, and test obligations. Use only when explicitly invoked as the planning phase of Split Engineering or when the user directly asks for plan-split.
---

# Plan Split

Produce the graph contract. Do not implement it.

## Discover facts

1. Read applicable instructions and inspect the real repositories, branches, runtime, services, documentation, issue or PR state, and existing tests.
2. Use read-only scouts when independent discovery can reduce context pollution or latency. Give each scout a bounded factual question and forbid writes.
3. Resolve facts from sources instead of asking the user. Mark observed facts, source-backed claims, inference, and assumptions separately.

## Resolve decisions

1. Compose `$grilling` when available. Otherwise ask one decision at a time with a recommended answer.
2. Scale the interview to uncertainty. Stop when objective, non-goals, constraints, acceptance, authority, risk, environment, and unresolved decisions are explicit.
3. Challenge false decomposition, unnecessary parallelism, trivial testing, hidden production authority, and work that does not justify a graph.

## Build the DAG

Read [references/plan-contract.md](references/plan-contract.md). Create one node per verifiable delivery, not per arbitrary layer or repository. For each node define:

- unique ID, title, kind, repository and environment;
- observable result and acceptance criteria;
- exclusive ownership boundary;
- dependencies and integration milestone;
- risk and reasoning level;
- local executor checks;
- independent test obligations;
- authority envelope and prohibited actions;
- artifacts and receipts required to pass.

Represent integration as dedicated nodes. Plan independent testing by integrated milestone, not by test-count quotas. Treat host capacity, ports, databases, browsers, and shared services as scheduling dependencies.

## Gate the plan

1. Validate that dependencies are acyclic and every non-root dependency exists.
2. Show the critical path, ready frontier, ownership boundaries, risk matrix, test matrix, authority, and expected artifacts.
3. Render the draft canvas.
4. Ask the user for explicit approval. Do not infer approval from silence or earlier authority.
5. Record the approved graph version. Any later material change requires a version delta and new approval.
