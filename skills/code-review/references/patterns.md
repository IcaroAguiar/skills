# Recurring findings become local checks

A finding that reviewers keep making costs a model call every time. Once a
deterministic check catches it, T0 finds it for free, before any model runs:
T0 runs the repository's lint scripts and its `.semgrep/` rules
([t0.md](t0.md)).

## Catalog

Keep one file per front: `patterns/<front>.md` in the state directory
(`$AGENT_REVIEW_STATE`, default `~/.local/state/agent-review`). A front's file
names that front's code and is processed only with that front's account. One
entry per mechanism:

```markdown
## hover-only-action: row action visible only on hover
- seen: 2026-10-22 front-processes src/features/context/components/context-row-actions.tsx:41; …
- check: candidate
```

`check` is one of:

- `candidate`;
- `proposed <repo> PR #<n> (<rule>)`;
- `enforced <repo>: <rule>`;
- `review hint <repo>: REVIEW.md`;
- `not checkable: <why>`.

## Weekly pass

1. Read the week's real findings with `scripts/review-ledger.mjs findings --since 7 --front <front> --json`. The command defaults to `fixed`.
2. Group the findings by mechanism, not by wording. Rows that share a `group` are one T1 spot reported by several lenses: count them once, and take the highest severity among them. Count a finding that both T1 and the reviewer reported once too. Merge each group into an existing entry when one matches.
3. Promote an entry when it has two occurrences, or one serious occurrence (P1, P2 or high) that a rule can catch without judgment.
4. Pick the cheapest check that catches the mistake. Try these in order:
   1. a built-in rule of the repository's linter (oxlint, Biome, ESLint), switched on;
   2. a Semgrep rule in the repository's `.semgrep/`, with a rule test;
   3. a custom oxlint rule, when the pattern needs context that Semgrep lacks (the `install-anti-slop` plugin layout);
   4. a type or a test helper that makes the mistake unrepresentable.
5. Prove the check works. It must flag the defective code, and it must pass on the current default branch with no new suppressions. Look for the defect at the row's `head` first, and confirm it is really there: a review of uncommitted changes records a head that never contained it. When no commit has it, write the smallest example from the finding and make it the rule's test. When it does not pass cleanly, fix the existing hits in the same PR or narrow the rule.
6. When no rule can decide a pattern (a domain rule, a judgment), add one line to the repository's `REVIEW.md` so reviewers look for it, and mark the entry accordingly.
7. Open each check as its own PR in that repository, through the normal review gate. The calibration only proposes: wait for the user's approval before opening one.
