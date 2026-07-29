# Hardening Agentic Code Integration

This gate is a hard sub-gate for meaningful implementation review.

## Reviewer Responsibilities

When reviewing code, check:

- Was a Test Obligation Matrix created early enough for the work?
- Do the tests match the changed surfaces and highest risk level?
- Are targeted tests incorrectly presented as final proof?
- Were full service/package/workspace checks run when required?
- Was browser evidence collected for UI/visual changes?
- Were negative, permission, tenant, fallback, and regression paths covered when
  relevant?
- Are failed/skipped/flaky checks explicitly handled?
- Is residual risk honest and tied to concrete missing evidence?

If any answer is weak, file a review finding even when the implementation looks
correct.

## Finding Severity

- Blocking: missing matrix, no executed evidence, failed required tests, missing
  browser proof for UI/visual changes, auth/permission/data boundary without
  negative evidence, or targeted-only validation for service production work.
- High: important missing regression/integration/contract/E2E evidence with
  plausible production impact.
- Medium: final evidence is incomplete but core risk is partly covered.
- Low: reporting clarity or artifact organization issue that does not weaken the
  actual gate.

Do not downgrade validation findings to style. Testability is part of
correctness.

## Closeout Handshake

`hardening-agentic-code` may approve only when this gate ends as:

- `PASS`; or
- `PASS_WITH_RISK` with named non-blocking residual risk accepted by the primary
  agent or user.

`BLOCKED` and `FAIL` must remain blocking unless the user explicitly accepts the
risk after seeing the evidence.

## Reviewer Packet

Include this compact packet in code-review handoffs:

```md
Testability packet:
- Risk:
- Changed surfaces:
- Matrix present: yes/no
- Commands run:
- Browser/visual evidence:
- Untested obligations:
- Residual risk:
- Gate result:
```
