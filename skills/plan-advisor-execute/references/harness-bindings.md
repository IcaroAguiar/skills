# Harness bindings

The workflow contract is portable; model identity is not. Select one mode before the first advisory call and keep it visible in every plan and receipt.

## `strict-openai`

Use only when the runtime proves the required custom profiles or explicit task model fields.

| Logical role | Exact binding |
|---|---|
| advisor | `engineering-advisor` = Sol/xhigh; gated `engineering-advisor-max` = Sol/Max |
| explorer | `luna-explorer-medium` = Luna/medium |
| executor or integrator | `luna-executor-xhigh` = Luna/xhigh |
| debugger | `luna-debugger-xhigh` = Luna/xhigh |
| test engineer | `luna-test-engineer-xhigh` = Luna/xhigh |
| code reviewer | `luna-reviewer-high` = Luna/high |

All strict profiles resolve to `gpt-5.6-luna`; their effort is role-specific and encoded in the exact profile name and configuration. Persistent Codex tasks must bind the same per-role effort explicitly. Do not infer profile availability from files belonging to another harness.

## `portable`

Use outside Codex, or when exact OpenAI profiles are unavailable and the user accepts harness-native bindings.

| Logical role | Portable binding |
|---|---|
| advisor | `split-engineering-advisor` |
| explorer | `split-explorer` |
| executor or integrator | `split-executor` |
| debugger | `split-debugger` |
| test engineer | `split-test-engineer` |
| code reviewer | `split-reviewer` |

Portable profiles preserve role prompts, fresh context, permissions, ownership, receipts, and non-recursion. They inherit or use a harness-native model. They do not guarantee Sol, Luna, Max, xhigh, or model diversity from the controller.

## Selection and change control

1. Prefer `strict-openai` when all roles required by the plan are currently exposed.
2. Select `portable` automatically when the skill is invoked in another harness, but disclose the mode before presenting the consolidated plan.
3. If the user requested exact Sol/Luna, `portable` is not a fallback. Stop with `CAPABILITY_MISMATCH`.
4. Changing mode after advisory begins invalidates model-specific receipts. Re-run only the affected advisory or execution gate after user approval.
5. A profile name is not proof of the effective model. Record model and effort only when runtime metadata or inspectable configuration proves them.
