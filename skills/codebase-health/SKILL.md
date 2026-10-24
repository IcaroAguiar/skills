---
name: codebase-health
description: Evidence-based health check of a repository, ending in a discussion and a sequenced roadmap. Use when asked to assess, audit or "check up" a codebase ("saúde do repo", "auditar o repositório"); when CI or delivery is slow or flaky; to find dead code, near-copies or low-value tests; or to discuss abstractions, architecture or a refactoring plan with numbers instead of impressions.
---

# Codebase health

A check-up, not a lint run. Each dimension below is measured from real history and real code, the strong claims are verified, and the result is a conversation: what hurts, why, which decisions are the user's, and the order of small PRs that fixes it. Rules that keep it fixed belong to `codebase-guardrails`; module shape to `codebase-design`; vocabulary and ADRs to `domain-modeling`.

## 0. Ground rules

- **Front and account first.** Read `~/.config/agent-review/local.md` when it exists and identify the repository's front. Every model call (you, subagents, reviewers) runs on that front's accounts; corporate code uses only corporate wrappers and instances, briefs in the front's language. Without a resolvable account, stop with `BLOCKED`.
- **Read-only until the user decides.** The diagnosis changes nothing tracked: temporary configs, reports and scripts live in one task folder on persistent storage outside the repository (never `/tmp`, which a reboot wipes). No branch switches in a checkout someone else is using.
- **Machine capacity.** Heavy commands go through the machine's queue when it has one (for example a `heavy` wrapper); never two full suites at once; never an unfiltered root test command.
- **Evidence bar.** Every number names its source (command, run IDs, files). Before relaying a strong claim from a subagent ("X never runs", "Y passes with the implementation broken"), open the evidence yourself.

## 1. Scope

Ask nothing when the request is a full check-up: run all dimensions. When the user names one ("why is CI slow", "discuss the architecture of module X"), run that dimension plus whatever it depends on. Note the repository's stack, package manager, workspaces, CI provider and deploy trigger from the environment (manifests, workflow files), not from memory.

## 2. Measure — one read-only subagent per dimension, in parallel

Brief each with the goal, the hard rules above (quoted), the task folder, and the report shape from [references/dimensions.md](references/dimensions.md). Use the cheapest model the front trusts for read-heavy analysis; keep judgment in the main thread.

| Dimension | Question | Main instruments |
| --- | --- | --- |
| Delivery | Where does the time from push to production go, and why does it fail? | `scripts/ci_stats.py`, workflow files, [references/delivery.md](references/delivery.md) |
| Tests | Which tests protect behavior, which only mirror the implementation, and what makes suites slow? | `scripts/vitest-import-profile.mjs` (or the stack's equivalent), sampled reading |
| Code | What is dead, copied or oversized? | knip / vulture / deadcode, `scripts/dup_files.py`, size census |
| Abstractions | Where does the shape of the code fight the domain? | reading guided by the smells in dimensions.md, `codebase-design` vocabulary |
| Architecture | Do boundaries, layers and dependencies match what the docs and ADRs promise? | dependency graph, import rules, ADRs and `AGENTS.md` |

Run `ci_stats.py` yourself while the subagents work: it takes seconds and anchors everything else.

Done when every dimension in scope has a report on disk with numbers, sources, and an explicit list of what it could not verify.

## 3. Verify

Spot-check the two or three claims each report rests on: rerun one command, open one log per failure class, read the cited lines. Correct or drop what does not hold, and say so. Copy anything a subagent left in `/tmp` into the task folder.

## 4. Discuss

Present the diagnosis as the user needs to decide, following [references/discussion.md](references/discussion.md):

1. The few numbers that explain the pain (with sources).
2. Findings per dimension, worst first, each with its cost.
3. The **decisions that belong to the user**, each with options, trade-offs and your recommendation.
4. A roadmap of small, verifiable PRs in dependency order: stability before speed, guardrails before removals, removals before refactors.

Wait for the decisions. Opening issues, branches or PRs needs the user's go-ahead in this conversation.

## 5. Act (after the go-ahead)

Record the plan where the team tracks work (an epic plus one issue per front, with the diagnosis), then deliver PR by PR through the repository's own review and merge rules. Each PR proves its gain with before/after numbers from the same instrument used in the diagnosis.
