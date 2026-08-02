# Harness Adapters

Select capabilities at runtime. Never assume a tool exists because another harness exposes a similarly named feature.

## Codex persistent-task adapter

Use when the Codex app exposes project and thread tools.

1. List projects and resolve the exact local or remote project before dispatch.
2. Create one user-visible task per execution, integration, or test node. Use the approved worktree or branch start state.
3. Set `model: gpt-5.6-luna` and preserve the role tier: Explorer `thinking: medium`; Reviewer `thinking: high`; Executor, Debugger, Test Engineer, and Integrator `thinking: xhigh`. Do not lower or raise a frozen tier automatically.
4. Record `threadId`, `hostId`, project, checkout, branch, and head in the node.
5. Monitor with bounded thread waits or reads. Send follow-ups when a thread skips discussion, evidence, a correction, or a gate.
6. Treat thread persistence as coordination evidence, never as product correctness.

## Strict OpenAI native subagent adapter

Use when the runtime exposes the required exact Luna role profile and each writer has a resolved non-overlapping checkout or worktree.

1. Spawn the exact mission role (`luna-explorer-medium`, `luna-executor-xhigh`, `luna-debugger-xhigh`, `luna-test-engineer-xhigh`, or `luna-reviewer-high`) with a fresh, self-contained context (`fork_turns: none` when supported). Do not depend on a direct Luna model override in the spawn schema.
2. Use isolated worktrees or directories for writers when the harness supports them.
3. Record all node state, prompts, receipts, artifacts, and the harness-specific agent identifier in the controller's run state.
4. Require contract reconstruction, then authorize edits with a follow-up unless the approved dispatch packet already contains an accepted reconstruction.
5. If subagent tooling cannot provide isolation, serialize writers even when the logical DAG permits parallelism.

## Portable subagent adapter

Use only when the plan declares `binding_mode: portable`. Route to the matching `split-*` profile and record the harness, profile, and effective model only when exposed. Portable roles preserve the contract but do not prove Sol/Luna parity.

## No-delegation fallback

Do not simulate split engineering inside one opaque context. If the approved binding mode has neither a native nor persistent adapter, explain the missing capability, propose the other mode only as an explicit plan change, and wait for the user.

## Remote reconnect

After any remote reconnect, re-prove host, OS/runtime, working directory, repository, branch, head, worktree, and required services before resuming a node. Never infer that a queued task materialized a remote worktree.
