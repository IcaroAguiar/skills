# Specialist Agent Adapters

Keep logical role, binding mode, and orchestration adapter distinct. Select them from current runtime capabilities and the approved plan; never infer availability from another harness.

## Adapter selection

1. Prefer a native subagent when the exact approved role profile is exposed, the mission can run safely in the resolved local checkout or worktree, and no persistent user-owned task is required.
2. Use the persistent project-task adapter when the user requests visible durable tasks, the work runs on a saved local or remote project, continuity across controller sessions is material, or the approved isolation topology requires it.
3. Record the selected adapter in the consolidated plan. `execution_authorization` covers every declared use of that adapter across all waves. Do not switch adapters after approval unless the user-visible outcome, authority, isolation, or durability changes; when it does, replan only the affected remainder.
4. If neither adapter can prove the approved binding, stop. Never substitute another model, role, or reasoning tier silently.

## Native strict OpenAI subagents

1. Map the mission to `luna-explorer-medium`, `luna-executor-xhigh`, `luna-debugger-xhigh`, `luna-test-engineer-xhigh`, or `luna-reviewer-high`; do not depend on a direct Luna model override in the spawn schema.
2. Use a fresh-context spawn such as `fork_turns: none` when supported and provide a self-contained dispatch packet. This ensures the custom profile, rather than the controller model, owns model selection.
3. Create or resolve an isolated worktree before spawning each concurrent writer. Subagents may share the filesystem; never assign overlapping write ownership concurrently.
4. Record the agent ID, checkout, worktree, branch, base, and initial head. Use follow-up steering only for contract acceptance, material correction, or missing evidence.
5. Wait for the contract reconstruction before authorizing edits unless the dispatch packet explicitly records that the same contract was already accepted.

## Native portable subagents

Map the same logical roles to `split-explorer`, `split-executor`, `split-debugger`, `split-test-engineer`, and `split-reviewer`. Use fresh self-contained context and the same ownership, worktree, contract-confirmation, and receipt rules. Require `binding_mode: portable` in every receipt. Do not claim Luna, Sol, Max, xhigh, or model diversity unless current runtime metadata proves it.

## Persistent project tasks

Use this adapter only when the Codex app exposes project and thread tools and task creation is included in the standing `execution_authorization`.

1. List projects and resolve the exact local or remote project before dispatch.
2. In `strict-openai`, set `model: gpt-5.6-luna` and preserve the role tier: Explorer `thinking: medium`; Reviewer `thinking: high`; Executor, Debugger, Test Engineer, and Integrator `thinking: xhigh`. In `portable`, select a current harness-native model deliberately and record it in the approved plan.
3. Create one task per bounded mission. Prefer an isolated worktree for each Git writer.
4. Never run overlapping write ownership concurrently. Serialize shared contracts, migrations, lockfiles, configuration, and integration boundaries unless ownership is provably disjoint.
5. Record `threadId`, `hostId`, project, host, checkout, worktree, branch, base, and initial head.

## Executor prompt contract

Give every task:

- mission ID, objective, observable result, and non-goals;
- exact owned and forbidden files, modules, or responsibility;
- repository, host, checkout, worktree, branch, base, and initial head;
- dependencies, inputs, shared contracts, and integration destination;
- acceptance criteria and required checks;
- allowed and prohibited actions, including install, commit, push, PR, merge, migration, deploy, and external writes;
- required artifacts and completion receipt;
- the instruction that other workers may exist, unrelated changes must be preserved, and peer work must never be reverted.

Require the first response to reconstruct the objective, boundaries, dependencies, strategy, credible failure modes, checks, and open assumptions. Do not authorize writing until the controller accepts that reconstruction.

## Monitor and admit

- Treat dispatch as asynchronous. Monitor bounded executor sets and react only to contract confirmation, changed evidence, shared-boundary conflict, scope growth, risk, blocker, or completion.
- Advance automatically from one declared wave to the next when its recorded entry conditions pass. Never treat ordinary mission readiness as a new approval boundary.
- Send a follow-up when an executor skips evidence, widens scope, changes a shared contract, or claims completion from stale source.
- Require changed files, behavior summary, source or diff identity, exact commands and results, artifacts, local commits, skipped checks, baseline failures, blockers, prohibited actions not taken, and residual risk.
- Re-prove the final branch, head, and diff before admitting the receipt. A completed task is not final verification.

## Integrate and verify

Keep final truth in the controller. Use a dedicated `luna-executor-xhigh` integration executor only when integration itself has a distinct write boundary. Validate the integrated state with focused tests plus applicable build, typecheck, lint, diff checks, and behavioral journeys. Return failures to the smallest responsible mission.
