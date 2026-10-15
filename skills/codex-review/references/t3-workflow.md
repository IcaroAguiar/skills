# T3 delegation

Discover `orchestrator_capabilities` in the active T3 MCP catalog. If discovery omits it, make one bounded direct call through the supported runtime name before concluding it is absent. Select the provider instance, model and options the catalog returns for the account that owns the code (see the local policy); model slugs are not interchangeable with native collaboration aliases.

A review has this shape:

```javascript
await tools.mcp__t3_code__delegate_task({
  title: "Project — independent review",
  role: "review",
  target: {
    providerInstanceId: "<instance for this account>",
    model: "<model>",
    options: [{ id: "reasoningEffort", value: "high" }]
  },
  mode: "async",
  clientRequestId: "project-pr123-codex-review-round1",
  task: completeReviewPrompt
});
```

Verify these IDs against the live catalog and choose effort by the skill's table. A scoped fixer uses `role: "implementation"`. Capture `taskId`, `providerInstanceId`, `model` and `workState`. The review prompt restricts writes; an inherited full-access runtime is not a technical read-only sandbox.

Each new round (review, fix, delta) is a new `delegate_task` call with a distinct, stable `clientRequestId`; a retry of the same dispatch reuses its key. Include the original brief, prior findings, triage, responses and unresolved objections, because the new task starts without the earlier context. Do not send continuation messages to `childThreadId` or create top-level threads for review.

T1 (`review-t1`) runs from the orchestrator's shell with the owning account's Claude wrapper; its tool restrictions are technical. Delegate T1 only when no Claude CLI is available there: write the prompt with `--prompt` and send one `role: "review"` task per fast model to the account's Claude instance, as described in the `code-review` skill's `references/t1.md`.

Async completion wakes the root. Continue independent work, then end the turn rather than polling or creating a watcher. On notification, read `task_status` with the retained `taskId`. A terminal turn with pending child work is not a finished review: inspect `workState` and `hasPendingChildRuns`. Recheck the snapshot before accepting the verdict. Use `task_cancel` if cancellation is needed.

When an ACP runtime lacks injected tools and exposes `T3_ACP_MCP_NODE`, use only the supported T3 `acp-mcp-call` transport with its runtime-provided launcher and entrypoint. Failures do not authorize switching accounts or inventing transports. If the account's provider is unavailable in T3, report the blocked gate; the CLI path applies only in an authorized environment outside T3.
