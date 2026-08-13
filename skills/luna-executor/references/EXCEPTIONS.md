# Luna executor exceptions

Read only the branch that matches the observed deviation. Return to the main executor cycle at the same gate; an exception never skips a gate.

## Automatic worktree starts from the wrong HEAD

Record the observed detached/local HEAD as initial state. Confirm the intended remote SHA through a fresh remote read, fetch that object, and create the package branch from the confirmed SHA inside the isolated worktree. Keep initial HEAD, remote SHA, and effective base as three separate receipt fields.

If the package is stacked, confirm the parent PR head SHA rather than assuming a local tracking ref is current.

## Git transport differs inside the task

Confirm repository identity through an authenticated read before changing transport. Prefer a command-scoped credential helper or worktree-scoped URL rewrite. Restore the original remote configuration after fetch/push and prove no secret was printed or persisted.

Treat authentication failure as an environment blocker until the scoped transport succeeds. It is not evidence against the code or PR.

## Disk reaches the repository floor

Measure exact free space before installs or broad checks. Respect the closest repository floor. Below it, stop heavy local work, identify the artifact class causing pressure, and use remote CI or a narrower check only when it still proves the package claim. Record the skipped local proof and environmental reason.

## Existing worktrees consume the allowed slots

Resolve ownership from `git worktree list` and current task state. Reuse only a worktree already owned by the same live task and package. Ask the owner or user before removing any other worktree. Never create a duplicate checkout as a substitute.

## Requested model or dedicated-task capability is unavailable

Report the unavailable capability before dispatch. Never silently substitute a collaboration subagent. Offer the closest dedicated-task model only as an explicit user decision.

## CI stays red after the targeted blocker is removed

Inspect step-level logs and ordering. Classify each failure as:

- caused by the package diff;
- the next blocker revealed by the package;
- pre-existing baseline;
- environmental or external;
- inconclusive.

Fix only failures caused by the package inside its ownership. Record newly revealed independent blockers as candidate packages. Keep end-to-end status red, the PR draft when appropriate, and ledgers non-Done.

## Tracker integration is unavailable

Follow the repository's outbox or reconciliation rule. Store a secret-free, structured receipt with the intended page/task, status, evidence URLs, and idempotency key. Report queued synchronization; never claim the tracker is current.

## Cleanup is unsafe

Retain the worktree when it contains unpublished or uncommitted evidence that would be lost. Return `BLOCKED_RETAINED` with path, owner, branch, status, unpublished state, and the exact recovery action. Resume the same task for recovery. No next package starts while this blocker owns the executor lane.

If the tree is clean and published but removal fails because the task's current directory is inside it, run removal from the parent repository and then prune. Verify the path and Git metadata separately.

## User interrupts or changes direction

Stop the executor at the next safe boundary. Capture current branch, diff, process, worktree, PR, and ledger state. If the package will not resume, publish or otherwise preserve recoverable work before owner cleanup. Ask the user to choose resume, retain, or close; never release a new package while ownership is ambiguous.
