---
name: review-loop
description: Review a stable material pull request after implementation and focused checks are complete; invoke implicitly once for code readiness, or when the user asks for review-loop.
---

# Review loop

Control when review happens and how corrections converge. `$code-review` owns
the review standards, Spec comparison, five gates, findings, and code verdict.

## Stable PR gate

Invoke once when all are true:

- the change affects behavior, a public contract, data, security, concurrency,
  or multiple modules for one behavior, unless the user explicitly requests review;
- the PR has an exact base SHA and head SHA;
- the requested implementation is complete;
- focused checks passed or their known blockers are recorded;
- the author has no planned code edits before review.

Before this gate, continue implementation. Commits, pushes, CI updates, review
comments, and local corrections do not start another review-loop run.

## Loop

1. Pin the PR base and head. Review only `git diff <base>...<head>` and the PR
   commit list. Exclude staged, unstaged, untracked, and unrelated worktree state.
2. Dispatch one fresh independent harness-native reviewer. Give it the request,
   PR base/head, focused checks, relevant repository context, and instruct it to
   use `$code-review`. The reviewer reads the full PR diff once.
3. Give accepted critical/high findings to the author or one fixer. Rerun only
   affected checks.
4. Continue the same reviewer session with `git diff <old-head>..<new-head>`,
   affected callers, and affected tests. Do not invoke review-loop again, reread
   the full PR, or launch a reviewer for each correction.
5. Start a new fresh reviewer only when the base changes, scope expands
   materially, reviewers disagree, or a correction crosses auth, tenancy,
   credentials, migrations, transactions, concurrency, or public contracts.
6. When blockers converge, run required final checks once, confirm the final PR
   head, and return the `$code-review` verdict with residual risk.

There is no fixed correction cap and another in-scope correction does not need
permission. Ask only for missing product or architecture decisions, production,
credentials, permission-changing or destructive authority, or genuine
non-convergence. The author and fixer never approve their own work.

Hosting review, CI monitoring, external providers, merge, deployment, and
tracker state stay outside this skill.

## Roles and references

Use native reviewer and fixer roles. Protected engine selection is an optional
explicit override described in `references/engine-selection.md`, never part of
the normal path. Use a stronger reviewer only for the escalation conditions
above.

Load these references only when their concrete trigger applies:

- `references/correctness-and-risk.md`, `references/quality-simplification.md`, and `references/semantic-integrity.md` for a relevant code question;
- `references/documentation-impact.md` and `references/runtime-proof-and-qa.md` for docs or executable proof;
- `references/systemic-risks.md`, `references/go-review.md`, and `references/quality-gate-ratchet.md` for their named boundary;
- `references/real-diff-benchmark.md` only when evaluating this skill.

The loop is complete when the final head is unchanged, `$code-review` reports
no critical/high blocker, required checks passed or are explicitly blocked, and
residual risk is visible.
