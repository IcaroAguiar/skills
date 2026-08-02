# Test Lane Contract

## Admission rule

Every lane must name:

- behavior or invariant under test;
- credible failure mode;
- why existing evidence does not already prove it;
- source SHA or diff identity;
- faithful isolated environment and relevant configuration;
- exact commands, inputs, journey, load shape, or browser actions;
- pass, fail, and blocked criteria;
- mandatory artifacts.

Reject lanes that exist only to increase test count, coverage, snapshots, or assertions around implementation details.

## Independence packet

Give the tester:

- approved objective, non-goals, acceptance criteria, and risk;
- raw source state, diff, schema, runtime, and artifacts;
- environment access and allowed tools;
- explicit prohibition on product-code fixes;
- receipt format.

Do not provide executor conclusions, suspected findings, intended fixes, or expected verdicts.

## UI lane minimum

Exercise a critical user journey in a real browser against the changed runtime. Prefer Playwright when supported: use an isolated browser and synthetic data, capture a final screenshot, record a video for the critical journey, and retain a trace only when the journey fails. Record initial state, actions, visible result, relevant request/response, runtime errors, and viewport. When Playwright is unavailable, use another real-browser adapter and record the limitation. Promote important exploratory findings into deterministic assertions when practical.

Record video at a natural human-review pace. Never accelerate, skip meaningful transitions, or use rapid scripted clicks that make the behavior difficult to inspect. Hold each decisive visible result long enough for a reviewer to understand the proof.

## Scale and performance lanes

Use representative data volume and concurrency tied to a stated product risk. Define thresholds before running. Avoid arbitrary stress that cannot influence a decision.

## Verdict

Return `PASS`, `PASS_WITH_RISK`, `FAIL`, or `BLOCKED`, with reproduction, artifacts, residual risk, and the smallest responsible execution node. Never fix the code inside the test lane.

If expected visual proof is unavailable because the browser or capture capability is missing, return `PASS_WITH_RISK`; identify the missing capability, any substitute evidence, and the residual risk. Return `BLOCKED` only when the approved contract explicitly requires that proof.

An approved local Mac is a valid fallback when a remote worker cannot collect evidence. Treat this as an operational substitution, record it in the receipt, and do not require a graph revision unless it changes authority, scope, acceptance criteria, risk ceiling, or a mandatory obligation.
