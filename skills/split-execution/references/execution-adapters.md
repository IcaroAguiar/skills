# Execution Adapters

## Persistent project tasks

Use one task per node. Resolve the saved project, host, repository, checkout, base, branch, and current head before creation. Prefer a fresh worktree for writers. Create integration tasks only after every input node has an admitted receipt.

The task prompt must include the node contract, ownership, dependencies, exact authority, source identity, output receipt, and the instruction to stop for contract confirmation before writing.

Monitor with the harness thread APIs. Resume a task when it pauses early, omits evidence, widens scope, changes a shared contract, or claims completion on stale source.

## Generic subagents

Use a bounded writer agent with explicit allowed files or responsibility. State that other agents share the codebase and that unrelated edits must be preserved. Persist the prompt and returned receipt in the ledger.

If the harness cannot isolate concurrent writers, execute topologically but serially. Read-only discovery and tests may still run in parallel when resource capacity permits.

## Model and reasoning

Inherit the configured model. Use `medium` reasoning for implementation and integration by default; use `low` for deterministic mechanical work. Do not silently elevate a worker to the orchestrator's maximum reasoning.
