---
name: code-review
description: Review a stable material pull-request diff once after implementation and focused checks are complete. Invoke implicitly, without being asked, whenever a material change is ready; it runs T0, the fast pre-pass (T1) when T0's route asks for it, and one independent reviewer, the same way on every account, harness and model, with fallback when a subscription is limited. Also invoke explicitly for a fixed branch or PR review.
---

# Code review

Review one fixed diff along two axes:

- `Standards`: repository rules and `references/review-standards.md`.
- `Spec`: whether the change implements the requested behavior without omissions or scope creep.

## Stable review gate

Invoke implicitly when the change is material, the PR has exact base/head SHAs,
the implementation is complete, focused checks ran or have named blockers, and
the author has no planned edits. Before that point, keep implementing. Commits,
pushes, CI updates, comments, and local corrections do not start another review.

An explicit review request may supply a fixed branch or PR before this gate.

## Deterministic pre-review (T0)

Before any model reviewer, the author runs T0 on the checkout under review:

```bash
node <this-skill>/scripts/review-t0.mjs -C <repo> [--base <base-sha>] [--wrap <queue>]
```

It checks only what the diff added (secrets, new vulnerable dependencies,
conflict markers, manifest without lockfile, the rules in `rules/`, and repository
rules in `.semgrep/`) and runs the repository's typecheck, lint and affected
tests. `BLOCKED` goes back to the author; no reviewer runs on a red T0. Hand the
reviewer the T0 summary: it does not re-report what T0 or repository tooling
covers, and confirms or dismisses each T0 warning with a reason. T0's `ROUTE`
line gives the reviewer's starting reasoning effort and says whether T1 runs.
Details, configuration and suppression: `references/t0.md`.

## Fast pre-pass (T1)

When T0 passes and its route says `T1 run`, the author runs:

```bash
node <this-skill>/scripts/review-t1.mjs -C <repo> [--spec <pr-body-file>] [--claude <account wrapper>]
```

Fast lenses from the review policy (without one, Claude Sonnet at medium effort
and Claude Haiku) review the same diff and the changed files in parallel,
read-only, in about three minutes. The author
fixes or dismisses each finding with a reason, reruns T0 if code changed, and
gives the reviewer the dismissed findings, which it may re-raise. Like T0, T1 is
the author's tool, not a reviewer wave: it never approves or blocks, and it runs
once, before the first full review. Details: `references/t1.md`.

## Accounts, providers and fallback

If `~/.config/agent-review/local.md` (or `$AGENT_REVIEW_LOCAL`) exists, read it
first: it is this machine's private policy for accounts, models and job queues.
Every model call for a repository, including subagents and delegated tasks, runs
on the account that owns the repository.

`~/.config/agent-review/policy.json` is the machine-readable part of that policy.
It maps each repository to its front (an account boundary) and gives, per role,
the candidates allowed to answer. Call every reviewer and fixer through
`scripts/review-run.mjs` (in T3, through its `--plan`), so every harness picks the
same model, falls back the same way when a subscription is limited, never leaves
the front, and logs the call. Details: `references/providers.md`.

```bash
node <this-skill>/scripts/review-run.mjs --role review -C <repo> --base <base-sha> --prompt <file> --out <file> --author-model <author's model>
```

## Independence

If the current context authored or fixed the change, dispatch exactly one fresh
independent reviewer with this skill and the fixed diff. When the local policy
names the reviewer (for example an OpenAI model through the Codex CLI), use that one, on
the account that owns the repository, at the starting effort from T0's route.
Pass the author's model as `--author-model`, so a fallback never lands on it.
If the current context is already that reviewer, review directly. Never create
separate Standards and Spec reviewers or other nested reviewer waves.

The whole sequence (T0, T1 when routed, independent review, delta reviews) runs without the
user asking: reaching the stable review gate is the trigger. It authorizes
nothing outward; pushing, merging and deploying still follow the task's own
authorization.

## Process

1. Pin the fixed point. For a PR, resolve its exact base and head SHAs. Otherwise
   use the ref supplied by the user. Capture `git diff <base>...<head>` and
   `git log <base>..<head> --oneline` once. Stop on a missing ref or empty diff.
2. Find the Spec source in the user request, linked issue, PR description, or a
   matching file under `docs/`, `specs/`, or `.scratch/`. If none exists, report
   `no spec available`; do not invent requirements.
3. Find Standards sources such as `REVIEW.md` (what matters to the code's
   owners, what failure looks like there, paths to skip), `AGENTS.md`,
   `CODING_STANDARDS.md`, `CONTRIBUTING.md`, and relevant repository docs.
   Repository rules override the shared baseline. Skip formatting or checks already enforced by tooling
   or reported by T0.
4. Read `references/review-standards.md`, then inspect the complete diff once.
   Search adjacent code only to answer a concrete question raised by the diff.
5. Report actionable findings under `Standards` and `Spec`. Keep the axes
   separate so one cannot hide the other.

Each finding needs severity, stable location, impact, current-diff evidence
(a file and line, not a guess from a name), smallest correction, and validation
path. When one mistake repeats, report it once with every place, so the fix
covers the whole class. Mark a real bug the change did not introduce as
`Pre-existing`: it stays visible, never blocks, and is not the author's fault.
Critical/high findings block. Medium/low observations remain visible unless they
prove correctness or verification failure. Start the report with the number of
blocking findings, and say plainly when there is nothing to fix.

End with one compact gate line and a verdict:

`CORRECTNESS=PASS SIMPLIFICATION=PASS SEMANTICS=PASS DOCUMENTATION=N/A VERIFICATION=PASS`

Use `APPROVE`, `APPROVE_WITH_RESIDUAL_RISK`, `REQUEST_CHANGES`, or `BLOCKED`.

## Triage and measurement

The author decides every finding from T1 and from the reviewer: `fixed`,
`wrong`, `intentional`, `irrelevant` or `deferred`, with a reason for all but
`fixed`. Record the decisions with `scripts/review-ledger.mjs triage` (T1 spots
by number, review findings by call id; `[]` when a review found nothing).
Before the final report, `scripts/review-ledger.mjs untriaged --repo <repo>` must
print no call: it exits 1 while an answered T1 or review call has no decisions. Those decisions are the acted-on rate
that tells which model and effort are worth their cost; `review-ledger stats`
reads it back. When the same kind of finding keeps coming back, stop it before
review: a pitfall the author reads in `AGENTS.md`, a type or test that makes it
impossible, or a lint or T0 Semgrep rule:
`review-ledger findings` lists the fixed findings, and
[references/patterns.md](references/patterns.md) keeps the catalog and the
weekly pass. When a bug escapes review, add the change as a `review-eval` case.

## Delta review

The author or one fixer applies accepted critical/high findings, reruns only
affected checks, and reruns T0 until it passes; T1 does not run again. The same reviewer then reviews
`git diff <old-head>..<new-head>` plus affected callers and tests, through
`review-run --resume <call>`. Preserve the earlier full-diff coverage and do not
repeat findings already reported. Request another full review only if the base changes,
the scope expands materially, reviewers disagree, or the correction crosses
auth, tenancy, credentials, migrations, transactions, concurrency, or public
contracts.

Continue in the same reviewer session while blockers converge; another in-scope
correction does not need permission. Rounds that keep finding blockers are a
signal, not progress: Anthropic found that most code flagged again had been
there since the first pass, so the reviewer was finding a few more old bugs each
round. After the second delta still has blockers, stop and show the user the
open findings with a recommendation (defer, accept as residual risk, rethink the
approach, or one more round). The author and fixer never approve their own work.

Run required final checks once, confirm the final PR head, and report residual
risk. Hosting approval, CI monitoring, external providers, merge, deployment,
and tracker state are separate tasks.
