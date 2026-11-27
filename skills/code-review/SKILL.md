---
name: code-review
description: >-
  Review a stable PR diff after implementation: T0, then one independent reviewer. Runs unasked for a risky change (data, auth, money, safety-critical values, migration, deploy, CI) and once per production batch, or on request: "revisa com o Codex", "deixa o Codex revisar e corrigir".
---

# Code review

A review is owed for any risky change: data, auth, money, safety-critical values, a migration, deploy or CI. Start it when the PR has exact base and head SHAs, the implementation is complete, and the author has no planned edits. Later commits and pushes start no new review, and the review authorizes nothing outward.

## T0: the author's deterministic check

Before any model reviewer, the author runs:

```bash
node <this-skill>/scripts/review-t0.mjs -C <repo> [--base <base-sha>] [--wrap <queue>]
```

It checks only what the diff added (secrets, vulnerable dependencies, conflict markers, manifest without lockfile, `rules/`, the repository's `.semgrep/`) and runs typecheck, lint and affected tests. It prints:

- `RESULT`: `BLOCKED` goes back to the author; no reviewer runs on a red T0.
- `ROUTE`: the reviewer's starting effort, and whether T1 runs.
- `SIZE`: past the layer target or limit, split into a stack or say in the PR why it stays whole (`references/pr-size.md`).
- `COMMENTS`: from 5% of added source lines it blocks, and `review-run` refuses too; below that the reviewer flags the needless ones.
- `TESTS observe`: the unit and end-to-end test files the change adds. It never blocks.

Hand the reviewer the T0 summary; it confirms or dismisses each warning with a reason. Details and suppression: `references/t0.md`.

When `ROUTE` says `T1 run`, the author runs `scripts/review-t1.mjs` once before the first full review and fixes or dismisses each finding (`references/t1.md`). T1 never approves or blocks.

## One independent reviewer

Exactly one reviewer, in a fresh context that did not write the change: pass the fixed diff, the spec, the standards and the check results, never the author's conversation. The author never approves its own work.

Account boundary: read `~/.config/agent-review/local.md` (or `$AGENT_REVIEW_LOCAL`) first. `~/.config/agent-review/policy.json` maps each repository to its front (an account boundary) and lists the candidates per role. Every model call for a repository, subagents included, stays on its owning account.

Route every reviewer and fixer through `review-run.mjs`, so every harness picks, falls back and logs the same way (`references/providers.md`):

```bash
node <this-skill>/scripts/review-run.mjs --role review -C <repo> --base <base-sha> --prompt <file> --out <file> --author-model <author's model>
```

`--plan` shows the candidates and exposes `nativeFallback`: when the peers are limited, use a fresh native subagent on the owning account, even with the author's model. Stop for availability only when neither can run.

When the user names Codex or the policy routes to it, read `references/codex-cli.md` (CLI facts, prompts, fixer flow).

The reviewer receives a `<known_mistakes>` block, built from the front's pattern catalog and the repository's `REVIEW.md` (`references/patterns.md`), and applies `references/review-standards.md`.

## Findings

Report findings under `Standards` (repository rules, `REVIEW.md`) and `Spec` (the requested behavior, omissions, scope creep); with no spec, say `no spec available`. Each finding carries a severity, `file:line` from the current diff, the impact and the smallest fix. A repeated mistake is one finding listing every place. Severities:

- **Critical / high**: block.
- **Medium / low**: visible, block only when they prove a correctness or verification failure.
- **Pre-existing**: a real bug the change did not introduce; visible, never blocks.

Start the report with the number of blocking findings, and say plainly when there is nothing to fix.

A finding whose fix removes or changes something the user approved in a design goes to the user with options; the approved element stays until they answer.

Optionally, record decisions (`fixed`, `wrong`, `intentional`, `irrelevant`, `deferred`) with `scripts/review-ledger.mjs triage`; `review-ledger stats` reads the acted-on rate back, and `findings` feeds the catalog in `references/patterns.md`. A bug that escapes review becomes a `review-eval` case.

## Delta review

The author or one fixer applies the accepted critical and high findings, reruns the affected checks and T0. A fix adds at most one check per cause, at the cheapest level that catches it. The same reviewer then reads `git diff <old-head>..<new-head>` plus affected callers, through `review-run --resume <call>`, without repeating earlier findings.

- A delta is owed after a blocking finding, and after any correction that crosses auth, tenancy, credentials, migrations, transactions, concurrency or public contracts.
- After approval, fixing the remaining medium or low findings inside the named files and under 50 changed lines owes none: rerun the affected checks and T0, and note `no delta: <reason>`.
- A full review again only when the base changes, the scope grows materially or reviewers disagree.

**Two-delta stop.** When the second delta still has blockers, stop and show the user the open findings with a recommendation: defer, accept as residual risk, rethink the approach, or one more round.
