# Luna executor exceptions

Read only the branch that matches the observed deviation. Return to the main executor cycle at the same gate; an exception never skips a gate.

## Authorized parallel worktree starts from the wrong HEAD

Record the observed detached/local HEAD as initial state. Confirm the intended remote SHA through a fresh remote read, fetch that object, and create the package branch from the confirmed SHA inside the isolated worktree. Keep initial HEAD, remote SHA, and effective base as three separate receipt fields.

If the package is stacked, confirm the parent PR head SHA rather than assuming a local tracking ref is current.

## Git transport differs inside the subagent

Confirm repository identity through an authenticated read before changing transport. Prefer a command-scoped credential helper or worktree-scoped URL rewrite. Restore the original remote configuration after fetch/push and prove no secret was printed or persisted.

Treat authentication failure as an environment blocker until the scoped transport succeeds. It is not evidence against the code or PR.

## Disk reaches the repository floor

Measure exact free space before installs or broad checks. Respect the closest repository floor. Below it, stop heavy local work, identify the artifact class causing pressure, and use remote CI or a narrower check only when it still proves the package claim. Record the skipped local proof and environmental reason.

## Existing worktrees consume the allowed slots

Resolve ownership from `git worktree list` and current agent state. Reuse only a worktree already owned by the same live executor and package. Ask the owner or user before removing any other worktree. Never create a duplicate checkout as a substitute.

## Primary checkout is unavailable or ownership overlaps user changes

Do not fall back to a worktree merely because several agents are active or the checkout is dirty. First prove the overlap: record branch, HEAD, status, intended writable paths, existing changes, and active owners or processes. Disjoint writers may remain in the primary checkout under the shared-checkout Git-turn rules. Use a worktree when the overlap, independent Git state, incompatible repository-wide mutation, or concrete interference risk creates a real isolation requirement. Ask the user to release, preserve, or re-scope unresolved user-owned paths before dispatch.

## Shared-checkout writers collide

Pause every affected writer before another edit or Git mutation. Record the ownership map, overlapping paths, current HEAD, staged and unstaged changes, and each agent's last safe checkpoint. Do not solve the collision with `git add -A`, reset, stash, checkout, or history rewriting.

If one package owns a shared contract, sequence it first and resume dependents from the resulting HEAD. If ownership cannot become disjoint, move one package to an authorized isolated worktree. Preserve the same executor for that package and record the workspace transition.

If two packages require independent branches or PRs, they cannot remain in the same checkout even when their files are disjoint. Preserve the prepared wave branch, move the independent package to an isolated worktree from its confirmed base, and update the ownership map before resuming it.

## Requested model or native-subagent capability is unavailable

Report the unavailable capability before dispatch. Never silently substitute another model or create a user-owned thread. Offer the closest native-subagent model only as an explicit user decision.

## Luna discovers a Terra-only boundary

Stop Luna before any sensitive mutation and return a checkpoint with branch, workspace mode/path, diff, processes, evidence, and the exact escalation reason. Do not run Luna and Terra as concurrent writers for the same package or writable paths. Unrelated Luna packages may continue only when their ownership and Git turns remain disjoint from the escalation.

Prefer a read-only Terra advisory pass when Luna can safely retain implementation ownership. If Terra must become the writer, make Luna idle at a recoverable checkpoint, audit the state, and transfer sole ownership of the same primary checkout to Terra. Use a new worktree only when authorized parallel work still requires separate writable checkouts. Record both agent ids and the ownership transition.

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

Retain the worktree when it contains unpublished or uncommitted evidence that would be lost. Return `BLOCKED_RETAINED` with path, owner, branch, status, unpublished state, and the exact recovery action. Resume the same executor for recovery. No dependent package or next wave starts while this blocker owns the executor lane.

If the tree is clean and published but removal fails because the subagent's current directory is inside it, run removal from the parent repository and then prune. Verify the path and Git metadata separately.

## Isolated work finishes before runtime validation

Stop worktree execution after automated checks and handoff. Audit and preserve the branch/HEAD, move the accepted state into the primary checkout, remove the clean worktree, and verify the primary checkout branch, HEAD, and status. Start Portly services, browser/UI QA, manual acceptance, or user-visible testing only there.

## User interrupts or changes direction

Interrupt the executor at the next safe boundary. Capture current branch, diff, process, workspace mode/path, PR, ledger, agent id, and model state. If the package will not resume, publish or otherwise preserve recoverable work before any isolated-worktree cleanup. Ask the user to choose resume, retain, or close; never release a new wave while ownership is ambiguous.
