# Lifecycle State Machine

Use uppercase state names exactly. Record every accepted transition in `stateHistory` with timestamp, actor, reason, and receipt references.

## Run states

| From | Allowed next states |
| --- | --- |
| `DRAFT` | `PLAN_PENDING_USER`, `BLOCKED`, `CANCELLED` |
| `PLAN_PENDING_USER` | `DRAFT`, `APPROVED`, `BLOCKED`, `CANCELLED` |
| `APPROVED` | `EXECUTING`, `BLOCKED`, `CANCELLED` |
| `EXECUTING` | `INTEGRATING`, `TESTING`, `REPORTING`, `BLOCKED`, `CANCELLED` |
| `INTEGRATING` | `EXECUTING`, `TESTING`, `BLOCKED`, `CANCELLED` |
| `TESTING` | `EXECUTING`, `INTEGRATING`, `REPORTING`, `BLOCKED`, `CANCELLED` |
| `REPORTING` | `AWAITING_REVIEW_DECISION`, `BLOCKED`, `CANCELLED` |
| `AWAITING_REVIEW_DECISION` | `COMPLETE`, `EXECUTING`, `BLOCKED`, `CANCELLED` |
| `BLOCKED` | the recorded `resumeState`, `CANCELLED` |
| `COMPLETE` | none |
| `CANCELLED` | none |

Require explicit user approval plus an approved graph version for `PLAN_PENDING_USER -> APPROVED`. Require current admitted receipts for every required node before `TESTING -> REPORTING`. Require a self-contained materialized report before `REPORTING -> AWAITING_REVIEW_DECISION`.

`AWAITING_REVIEW_DECISION -> COMPLETE` is a fail-closed completion gate. First
admit exactly one structured completion receipt while recomputing the candidate
fingerprint from the protected repository state (`--repo`), then pass the
receipt id plus optional confirming fingerprint to the transition command. A
material-code receipt is valid only when it is one of these two forms:

- `REVIEW_FORGE_APPROVAL`: a current Review Forge evidence receipt has verdict
  `APPROVE`, is bound to the exact candidate fingerprint, mode, base,
  repository, and schema version, and each of `CORRECTNESS`, `SIMPLIFICATION`,
  `SEMANTICS`, `DOCUMENTATION`, and `VERIFICATION` has a current gate receipt
  bound to that same identity.
- `USER_RISK_ACCEPTANCE`: the user explicitly accepts reported blocker or
  residual-risk evidence for that exact candidate, and the receipt records the
  accepting identity, time, statement, risk evidence, and all five gate
  receipts. It is an exception receipt, never an inferred default.

Reject a missing receipt, a second admission, any non-`APPROVE` Review Forge
verdict, a missing gate, stale evidence, a changed graph version, a forged or
self-declared fingerprint, or a fingerprint mismatch between the protected
state, candidate, gate evidence, review/acceptance evidence, and transition
argument. `NOT_APPLICABLE` needs a gate-specific rationale; it does not remove
the gate. A material graph bump or node invalidation clears `completionReceipt`
and marks affected evidence stale.

## Node states

| From | Allowed next states |
| --- | --- |
| `PROPOSED` | `READY`, `BLOCKED`, `INVALIDATED` |
| `READY` | `DISCUSSING`, `RUNNING`, `BLOCKED`, `INVALIDATED` |
| `DISCUSSING` | `READY`, `RUNNING`, `FAILED`, `BLOCKED`, `INVALIDATED` |
| `RUNNING` | `EVIDENCE_PENDING`, `FAILED`, `BLOCKED`, `INVALIDATED` |
| `EVIDENCE_PENDING` | `PASSED`, `RUNNING`, `FAILED`, `BLOCKED`, `INVALIDATED` |
| `PASSED` | `REOPENED`, `INVALIDATED` |
| `FAILED` | `REOPENED`, `BLOCKED`, `INVALIDATED` |
| `REOPENED` | `DISCUSSING`, `RUNNING`, `BLOCKED`, `INVALIDATED` |
| `BLOCKED` | the recorded `resumeState`, `INVALIDATED` |
| `INVALIDATED` | none |

Increment `attempts` whenever a node enters `RUNNING` from `READY` or `REOPENED`. Refuse a fourth attempt. Require at least one current receipt for `EVIDENCE_PENDING -> PASSED`. A downstream failure can reopen a passed node, but must invalidate dependent receipts tied to the old source state.

## Graph versions

Freeze material contract fields after approval: objective, non-goals, acceptance criteria, scope, ownership, dependencies, authority, risk, and test obligations. Create a new graph version for a material change. Preserve earlier versions and record the delta, affected nodes, invalidated receipts, proposer, and user approval.

Implementation tactics that preserve the approved contract do not create a new graph version.

Operational fallbacks are implementation tactics: switching between an approved remote worker and local Mac, changing browser or capture adapter, adjusting viewport, or collecting equivalent evidence locally. Record the actual environment and substitution in the receipt. Escalate only when the fallback changes authority, source scope, acceptance criteria, risk ceiling, or a contractually mandatory test obligation.

Small corrective changes are also implementation tactics: fixing reproduced defects, strengthening a test, making a scoped refactor, refreshing an affected receipt, or substituting equivalent evidence. Keep these inside the current graph version and resolve them automatically. The graph is an internal control surface; user approval is reserved for outcome, material scope, authority, irreducible risk, and the final review decision.
