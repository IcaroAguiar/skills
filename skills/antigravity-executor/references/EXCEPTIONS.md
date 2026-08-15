# Exceptions

Return to the same workflow gate after an exception. An exception never grants new authority.

## Missing or old `agy`

Stop with `AGY_NOT_FOUND` when absent. When below the supported minimum, run official `agy update`, repeat the entire preflight, and stop if the version remains unsupported.

## Invalid configuration or broken skill links

Stop before consuming quota. Report only paths and parse errors, never configuration values. Repair outside the executor run and repeat `doctor`; do not silently rewrite configuration or delete links.

## Core drift

Require the Antigravity global rule entry to resolve to the configured canonical core. Prefer a supported live import or symlink. Otherwise compare hashes and block until explicit synchronization.

## Low quota or unavailable model

Do not open a package below the 5% reserve. Retain an in-flight package and emit a checkpoint. When the requested model is unavailable, return the available list; never substitute providers or models silently.

## Dirty checkout or wrong base

Treat existing changes as user-owned. Stop and preserve them. Never reset, clean, stash, or switch the primary checkout automatically. Keep requested base, observed HEAD, and effective base separate.

## Missing receipt

Resume the same conversation once and request the receipt immediately. If it still cannot return, preserve the checkout and return `NEEDS_HUMAN`; never duplicate the executor.

## Red CI or unsafe cleanup

Classify failures as diff-caused, newly revealed, baseline, environmental, or inconclusive. Rework only diff-caused failures in scope. Retain unpublished or uncommitted evidence as `BLOCKED_RETAINED`; remove only a clean, published, executor-owned worktree after acceptance.
