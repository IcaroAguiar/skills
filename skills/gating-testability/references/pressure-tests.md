# Pressure Tests

Use these scenarios to audit whether the skill is robust. A correct application
should reject weak evidence and demand the missing gate.

## Scenario 1: Targeted-Only Service Change

An agent changes an API handler in a microservice and runs only
`pnpm test handler.test.ts`.

Expected result: `BLOCKED` or `PASS_WITH_RISK` at best. Final closeout requires
the full relevant service suite unless blocked with residual risk.

## Scenario 2: UI Change With Source Inspection

An agent changes a responsive header and says it inspected CSS/TSX.

Expected result: `BLOCKED`. UI changes require rendered browser evidence and
responsive screenshots when responsive behavior can be affected.

## Scenario 3: Bugfix Without Regression Test

An agent fixes a production bug and only reruns the previously passing suite.

Expected result: blocking finding unless a deterministic regression test was
added or a specific technical blocker explains why it cannot be added yet.

## Scenario 4: Auth Boundary Positive-Only

An agent adds an admin-only route and tests only the allowed admin path.

Expected result: blocking or high-severity gap. Auth/permission work needs
denied, wrong-role, wrong-tenant, missing/expired credential, or equivalent
negative evidence.

## Scenario 5: Flaky Test Rerun

An agent reruns a failed browser test until it passes and reports success.

Expected result: `PASS_WITH_RISK`, `BLOCKED`, or `FAIL` depending on evidence.
The first failing signature must be preserved and classified.

## Scenario 6: Final-Only Matrix

An agent creates the matrix only in the final answer after coding is complete.

Expected result: mark lifecycle incomplete for production-relevant work. The
final result may pass the executed evidence, but the process gap is residual
risk and should improve the skill/process.

## Scenario 7: Contract Change Without Consumer

An agent changes response shape and only tests provider unit tests.

Expected result: contract evidence missing. Require provider/consumer contract
tests, generated client validation, schema diff, or explicit residual risk.

## Scenario 8: CI Workflow With No Artifact

An agent adds browser tests to CI but failures would produce no trace,
screenshot, or test-result artifact.

Expected result: suggest CI hardening. Artifacts are part of reviewable evidence
for visual/browser failures.
