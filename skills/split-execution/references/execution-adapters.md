# Execution Adapters

## Strict OpenAI native subagents

Prefer this adapter for bounded local missions when the required exact Luna role profile is exposed. Spawn by exact agent type with fresh context (`fork_turns: none` when supported) and a self-contained node contract. Do not depend on a direct Luna model override in the spawn schema.

Resolve an isolated worktree or directory before spawning a concurrent writer. Record the agent ID and source identity, require contract reconstruction, and authorize editing through a follow-up unless the approved dispatch packet already records acceptance. The controller must preserve receipts because child-thread durability may differ by harness.

## Persistent project tasks

Use one task per node. Resolve the saved project, host, repository, checkout, base, branch, and current head before creation. Prefer a fresh worktree for writers. Create integration tasks only after every input node has an admitted receipt.

The task prompt must include the node contract, ownership, dependencies, exact authority, source identity, output receipt, and the instruction to stop for contract confirmation before writing.

Monitor with the harness thread APIs. Resume a task when it pauses early, omits evidence, widens scope, changes a shared contract, or claims completion on stale source.

## Model and reasoning

In `strict-openai`, use `gpt-5.6-luna` with role-specific reasoning: Explorer `medium`; Reviewer `high`; Executor, Debugger, Test Engineer, and Integrator `xhigh`. Native adapters enforce this through exact profile names; persistent adapters set model and effort explicitly. Never lower or raise the tier automatically.

## Portable specialist subagents

When the approved plan selects `portable`, map the mission to `split-explorer`, `split-executor`, `split-debugger`, `split-test-engineer`, or `split-reviewer`. These profiles preserve the role contract and permission boundary but inherit or select a harness-native model. Require `binding_mode: portable` in receipts and never label the result as an exact Luna binding.

If the plan requires `strict-openai` and the harness cannot provide the exact profile, stop instead of substituting a portable agent.

If the harness cannot isolate concurrent writers, execute topologically but serially. Read-only discovery and tests may still run in parallel when resource capacity permits.
