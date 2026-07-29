# Harness Adapters

Select capabilities at runtime. Never assume a tool exists because another harness exposes a similarly named feature.

## Codex persistent-task adapter

Use when the Codex app exposes project and thread tools.

1. List projects and resolve the exact local or remote project before dispatch.
2. Create one user-visible task per execution, integration, or test node. Use the approved worktree or branch start state.
3. Set `thinking: medium` by default and omit the model so the project configuration remains authoritative.
4. Record `threadId`, `hostId`, project, checkout, branch, and head in the node.
5. Monitor with bounded thread waits or reads. Send follow-ups when a thread skips discussion, evidence, a correction, or a gate.
6. Treat thread persistence as coordination evidence, never as product correctness.

## Generic subagent adapter

Use when persistent project tasks are unavailable but subagent delegation exists.

1. Spawn one bounded subagent per ready node with exclusive ownership and the complete node contract.
2. Use isolated worktrees or directories for writers when the harness supports them.
3. Persist all node state, prompts, receipts, and artifacts in the run ledger because subagent conversations may be ephemeral.
4. Record `durability: degraded` and the harness-specific agent identifier.
5. If subagent tooling cannot provide isolation, serialize writers even when the logical DAG permits parallelism.

## No-delegation fallback

Do not simulate split engineering inside one opaque context. Explain that the harness lacks persistent tasks and subagents, propose a direct workflow, and wait for the user.

## Remote reconnect

After any remote reconnect, re-prove host, OS/runtime, working directory, repository, branch, head, worktree, and required services before resuming a node. Never infer that a queued task materialized a remote worktree.
