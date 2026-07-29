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

Exercise a critical user journey in a real browser against the changed runtime. Record initial state, actions, visible result, relevant request/response, runtime errors, viewport, and fresh screenshots or a short clip. Promote important exploratory findings into deterministic assertions when practical.

## Scale and performance lanes

Use representative data volume and concurrency tied to a stated product risk. Define thresholds before running. Avoid arbitrary stress that cannot influence a decision.

## Verdict

Return `PASS`, `PASS_WITH_RISK`, `FAIL`, or `BLOCKED`, with reproduction, artifacts, residual risk, and the smallest responsible execution node. Never fix the code inside the test lane.
