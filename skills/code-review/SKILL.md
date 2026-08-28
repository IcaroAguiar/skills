---
name: code-review
description: Review a stable material pull-request diff once after implementation and focused checks are complete; invoke implicitly for code readiness, or explicitly for a fixed branch or PR review.
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

## Independence

If the current context authored or fixed the change, dispatch exactly one fresh
independent reviewer with this skill and the fixed diff. If the current context
is already that reviewer, review directly. Never create separate Standards and
Spec reviewers or other nested reviewer waves.

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

The author or one fixer applies accepted critical/high findings and reruns only
affected checks. The same reviewer then reviews
`git diff <old-head>..<new-head>` plus affected callers and tests. Preserve the
earlier full-diff coverage. Request another full review only if the base changes,
the scope expands materially, reviewers disagree, or the correction crosses
auth, tenancy, credentials, migrations, transactions, concurrency, or public
contracts.

Continue in the same reviewer session while blockers converge. There is no
fixed correction cap, and another in-scope correction does not need permission.
The author and fixer never approve their own work.

Run required final checks once, confirm the final PR head, and report residual
risk. Hosting approval, CI monitoring, external providers, merge, deployment,
and tracker state are separate tasks.
