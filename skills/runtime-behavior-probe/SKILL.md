---
name: runtime-behavior-probe
description: Use when implementing, debugging, refactoring, reviewing, or verifying executable behavior and runtime proof is needed.
---

# Runtime Behavior Probe

## Overview

Static reading is not behavior proof. For executable changes, prove behavior by running the real production code path touched.

## When to Use

Use for:
- bug fixes, feature work, refactors, and regressions that change executable behavior
- review or verification of claims that behavior is understood, fixed, complete, or ready
- situations where tests pass but may not call the touched code

Do not use for pure docs, comments, formatting, or metadata changes with no executable path.

## Required Pattern

1. Identify the touched production path: function, class, handler, route, component, hook, adapter, repository, command, or job.
2. Find the closest existing harness: focused test, script, CLI, route smoke, story, browser flow, or dev command.
3. Exercise the real code path with representative inputs.
4. If no harness exists, create a temporary probe under `/codex-scripts/` that imports/calls production code.
5. Mock only external side effects at boundaries: network, email, payments, production DBs, queues, destructive filesystem writes, or third-party APIs.
6. Report the path exercised, evidence observed, and anything not covered.

## Probe Rules

- Do not copy the implementation into a scratch file and test the copy.
- Copy only minimal inputs, fixtures, or setup required to call production code.
- Never copy secrets, cookies, tokens, private data, full env files, shell snapshots, or large runtime dumps.
- Keep `/codex-scripts/` local and gitignored. Do not commit it unless explicitly requested.
- If the exact path cannot be run, state the blocker, substitute verification, and residual uncertainty.

## Closeout Line

Every executable behavior change should answer:

```md
Runtime path exercised: <real production path or blocked>
Evidence: <focused test/script/browser/command and observed result>
Not covered: <none or residual uncertainty>
```
