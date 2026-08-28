---
name: code-review
description: Review a pull-request or branch diff once against its fixed point, originating spec, repository rules, and shared review standards; use for code review or when another skill needs a code verdict.
---

# Code review

Review one fixed diff along two axes:

- `Standards`: repository rules and `references/review-standards.md`.
- `Spec`: whether the change implements the requested behavior without omissions or scope creep.

Review directly in the current context. Do not spawn nested reviewers. A caller
such as `review-loop` owns reviewer independence and correction lifecycle.

## Process

1. Pin the fixed point. For a PR, resolve its exact base and head SHAs. Otherwise
   use the ref supplied by the user. Capture `git diff <base>...<head>` and
   `git log <base>..<head> --oneline` once. Stop on a missing ref or empty diff.
2. Find the Spec source in the user request, linked issue, PR description, or a
   matching file under `docs/`, `specs/`, or `.scratch/`. If none exists, report
   `no spec available`; do not invent requirements.
3. Find Standards sources such as `AGENTS.md`, `CODING_STANDARDS.md`,
   `CONTRIBUTING.md`, and relevant repository docs. Repository rules override
   the shared baseline. Skip formatting or checks already enforced by tooling.
4. Read `references/review-standards.md`, then inspect the complete diff once.
   Search adjacent code only to answer a concrete question raised by the diff.
5. Report actionable findings under `Standards` and `Spec`. Keep the axes
   separate so one cannot hide the other.

Each finding needs severity, stable location, impact, current-diff evidence,
smallest correction, and validation path. Critical/high findings block.
Medium/low observations remain visible unless they prove correctness or
verification failure.

End with one compact gate line and a verdict:

`CORRECTNESS=PASS SIMPLIFICATION=PASS SEMANTICS=PASS DOCUMENTATION=N/A VERIFICATION=PASS`

Use `APPROVE`, `APPROVE_WITH_RESIDUAL_RISK`, `REQUEST_CHANGES`, or `BLOCKED`.

## Delta review

When the same reviewer receives a corrected head, review
`git diff <old-head>..<new-head>` plus affected callers and tests. Preserve the
earlier full-diff coverage. Request another full review only if the base changes,
the scope expands materially, or the correction changes a sensitive invariant.
