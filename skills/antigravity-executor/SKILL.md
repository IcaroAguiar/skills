---
name: antigravity-executor
description: "Antigravity-first fast executor for bounded, reversible software delivery through the `agy` CLI: serial packages, Gemini 3.7 Flash High by default, deterministic preflight, isolated or verified-clean checkout, structured receipts, controller audit, independent review, and pre-approved queue continuation. Use automatically for routine implementation packages with clear ownership and known checks, or when the user asks for an Antigravity, AGY, Gemini Flash, fast, or plan-backed CLI executor. Do not route auth, secrets, data migrations, infrastructure, production, destructive work, or high-blast-radius changes automatically."
---

# Antigravity Executor

Use Antigravity as a fast implementation lane while keeping the controller responsible for scope, evidence, review, and external authority. Keep one package in flight.

## Command surface

Prefer the installed helper:

```sh
antigravity-executor doctor --json
antigravity-executor setup --json
antigravity-executor run --packet dispatch.json --receipt receipt.json --json
antigravity-executor resume --conversation <id> --packet rework.json --receipt receipt.json --json
antigravity-executor verify-receipt receipt.json --json
```

If the helper is not on `PATH`, run `node scripts/antigravity-executor.mjs` from this skill package. Read [CLI contract](references/CLI.md) when constructing packets or diagnosing helper errors. Use raw `agy` only as an explicit repair hatch.

## Routing contract

- Route bounded, reversible, routine code packages automatically when ownership and proving checks are known.
- Default to `gemini-3.7-flash-high`.
- Treat any switch to Gemini Pro, Claude, GPT-OSS, another CLI, or another executor as an explicit controller decision. Never silently substitute models.
- Keep auth, credentials, secrets, irreversible data or schema work, infrastructure, production, destructive operations, and high-blast-radius changes out of automatic routing.
- Preserve a 5% reserve in both the five-hour and weekly Antigravity quota buckets. Do not open a new package below either threshold.
- Advance automatically only through a queue whose packages and order were already approved. Never invent the next package.

## 1. Scope one package

Create a dispatch packet conforming to `references/dispatch.schema.json`. Include:

- package ID, objective, source issue or task, and allowed paths;
- non-goals and forbidden side effects;
- repository, confirmed base SHA, branch, and independent or stacked topology;
- requested model and route reason;
- reproduction or starting evidence and required checks;
- Git authority through PR, when authorized;
- runtime, browser, deploy, migration, merge, or production proof reserved for the controller.

Keep merge, deploy, release, production, credentials, destructive actions, and material scope expansion outside the package unless the user grants current, task-specific authority.

## 2. Establish the checkout

Prefer a dedicated worktree. A primary checkout is eligible automatically only when its branch and status are freshly proven clean and no user-owned state would be displaced.

Record repository identity, requested base, observed HEAD, effective base, checkout path and type, branch, active worktrees, and root status separately. Never infer one from another.

Agent worktrees are for implementation and non-interactive checks only. Keep runtime, browser, UI, screenshots, isolated QA data, and acceptance in the persistent primary checkout unless current repository rules explicitly authorize otherwise.

## 3. Run preflight

Run `antigravity-executor doctor --json` and require:

- `agy` installed and its version parseable;
- `gemini-3.7-flash-high` available;
- both relevant quota buckets at or above 5%;
- Antigravity user config valid JSON;
- no broken global skill links;
- a live global rule reference and the `antigravity-executor` custom agent available;
- the selected checkout satisfying the clean-start rule.

The helper may run the official `agy update` path when the installed version is below its supported minimum. It must re-run preflight after updating and stop on any unresolved deviation.

Read [exceptions](references/EXCEPTIONS.md) for a failed preflight, unavailable model, interrupted conversation, unsafe checkout, quota exhaustion, red CI, or cleanup failure.

## 4. Dispatch

The helper injects the declarative `antigravity-executor` rules into Antigravity's built-in coding agent, then selects sandbox, `accept-edits`, the requested model, structured output, and the receipt schema. In `agy` 1.1.13, selecting the Markdown custom profile directly exposes only read/list tools during execution, so it cannot be treated as a writer. Keep the profile installed as the live rules reference, but use the built-in coding agent until a forward test proves direct custom-profile mutation. Never silently change the requested model.

The helper may use Antigravity's full package auto-approval so the executor can edit, check, commit, push, and open or update a PR inside the dispatch packet.

Auto-approval changes interaction mechanics only. It never grants authority beyond the packet or higher-priority rules, and never authorizes secrets, destructive operations, merge, deploy, release, migration, production, or scope expansion.

The executor must:

1. read the closest repository instructions;
2. reproduce or establish the smallest relevant baseline;
3. state and test one causal hypothesis;
4. make the smallest correction inside allowed paths;
5. run proportional checks;
6. inspect the final diff;
7. commit, push, and create or update the PR only when the packet authorizes them;
8. emit the compact receipt and return control immediately.

## 5. Resume the same conversation

Use `resume --conversation <id>` for rework. Preserve package ID, checkout, branch, base, and prior receipt. Never create a duplicate executor for the same package while its conversation or checkout remains recoverable.

Pending CI, review, UI, browser, runtime, or human approval is system proof, not a reason to withhold the implementation receipt. Return `RETURN_TO_CONTROLLER_PENDING` with the exact pending action.

## 6. Audit and review

Run `verify-receipt`, then independently inspect checkout status and ancestry, diff ownership, checks and decisive logs, local and remote SHAs, PR state, requested and observed model, usage, conversation ID, skipped proof, and residual risk.

Material behavior changes require an independent reviewer after the controller audit. Green CI never substitutes for review or primary-checkout acceptance. Choose exactly one disposition: **Accept**, **Accept for primary-checkout validation**, **Rework**, or **Blocked retained**.

## 7. Preserve evidence and continue

Store secret-free receipts under `.scratch/antigravity-executor/` unless closer repository rules choose another private path. Synchronize only the compact decision, evidence links, and open loops to the durable task ledger.

After acceptance, remove only the executor-owned worktree when cleanup is safe, prove published commits remain reachable, and recheck the root invariant. Continue only with the next package in the pre-approved queue.
