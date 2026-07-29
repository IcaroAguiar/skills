# Test Quality Calibration

Use this file to choose the smallest credible verification set. The goal is not
maximum test count. The goal is evidence that matches risk.

## Level Selection

- Unit: deterministic pure logic, validation, transforms, policy decisions,
  branching rules.
- Component: UI behavior isolated from routing/backend, but still user-facing
  through DOM semantics.
- Integration: persistence, API handler, service composition, queue/job,
  filesystem, cache, external adapter boundary using controlled fixtures.
- Contract: provider/consumer or schema compatibility across service boundaries.
- E2E/smoke: critical user journey or production-like behavior through the
  runtime stack.
- Browser/visual: rendered UI, interaction, accessibility basics, layout,
  responsive behavior, assets, theming, tenant personalization.
- Migration: schema/data changes, reversible or forward-compatible behavior,
  idempotency, representative fixture.
- Observability: structured log, metric, trace, audit event, or runbook signal
  for high-risk operational paths.

## Regression-First Rule

For bugfixes and production incidents:

1. Identify the failed behavior in runtime terms.
2. Add or update a deterministic regression test before or alongside the fix.
3. If deterministic regression is not practical yet, capture a runnable smoke or
   browser proof and state the follow-up test debt explicitly.

## Coverage Rule

Coverage helps identify unexecuted code, but it does not prove the right
behavior. Treat coverage as supporting evidence only.

Use coverage thresholds or changed-line coverage when the project already has
them. Do not add broad coverage thresholds during unrelated work unless the user
asked for pipeline hardening.

## Flake Rule

Never declare a flaky check as passed because a rerun happened to pass.

Required handling:

- Preserve the first failing signature.
- Compare at least the last failing and passing attempts.
- Decide whether the flake is product, fixture, infrastructure, timing, or
  test-design related.
- Quarantine only with owner, expiry/revisit trigger, linked issue or note, and
  residual risk.
- Prefer deterministic waits, stable fixtures, semantic selectors, and explicit
  test data over retries.

## Negative And Boundary Evidence

Add negative tests when a change touches:

- Auth, permission, role, tenant, workspace, membership, session, or credential
  boundaries.
- Input validation, parser, serializer, API DTO, schema, webhook payload, or
  command arguments.
- Billing, fiscal, legal, production operations, privacy, or critical
  integrations.
- Data deletion, migration, archival, cascading behavior, or idempotency.

## Promotion Rule

Exploratory validation is useful but not enough by itself.

Promote discoveries into deterministic tests when:

- The behavior can regress.
- The selector/state is stable enough.
- The issue affects a user journey, contract, permission boundary, or data
  invariant.
- The validation can run in CI or a local smoke command.

If promotion is not practical, capture artifact evidence and name the residual
risk.

## Mutation And Fault Injection

Use mutation testing, fault injection, or chaos-style checks only when the repo
already supports them or the user explicitly asks. They are high-value for
policy, validation, permission, and financial logic, but they are usually too
expensive to introduce inside unrelated implementation work.
