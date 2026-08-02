# Plan Contract

The plan is a reviewable control artifact, not implementation prose.

## Run contract

Define:

- objective and observable outcome;
- non-goals and explicit scope exclusions;
- facts, assumptions, unknowns, and decision log;
- repositories, hosts, environments, source bases, and relevant services;
- global constraints and architecture boundaries;
- authority envelope: local edits, branches, commits, installs, push, PR, migrations, external writes, production, deploy, merge;
- risk classification and critical failure modes;
- report destination and mandatory artifact types;
- graph version and explicit user approval.

## Node contract

Each node must contain:

- stable ID and concise title;
- kind: `scout`, `execute`, `integrate`, `test`, or `report`;
- verifiable delivery and acceptance criteria;
- repository, host, checkout, base, and target branch when applicable;
- exclusive ownership paths or responsibility boundary;
- logical dependencies and operational capacity dependencies;
- reasoning level, defaulting to Luna with `xhigh` reasoning for writers and testers and `low` for mechanical discovery;
- local checks and independent test obligations;
- prohibited actions and any exceptional authority;
- expected receipts and artifacts;
- risk, likely failure modes, and rollback or recovery boundary.

## Decomposition rules

- Split by independently verifiable outcome.
- Keep coupled writers together when their files or contract must change atomically.
- Separate a shared contract node from its consumers when the consumers can safely wait on it.
- Create dedicated integration nodes for converging branches.
- Test integrated behavior by milestone; do not create a tester merely to mirror every executor.
- Make capacity explicit when nodes share CPU, RAM, ports, browsers, databases, or services.
- Reject a graph whose coordination overhead exceeds a direct implementation.

## Approval presentation

Show objective, non-goals, node table, dependency graph, critical path, initial ready frontier, ownership map, risk/test matrix, authority, artifact plan, and unresolved decisions. State that no execution starts without approval.
