# Systemic risk review

Load this reference when the diff touches concurrency, async work, events,
queues, retries, transactions, caches, cancellation, authz/tenancy, migrations,
rollout, rollback, or feature flags.

## Concurrency and async

- Identify shared state, ownership, synchronization, ordering, and termination.
- Trace read-modify-write races, duplicate work, lost wakeups, backpressure,
  blocked producers/consumers, goroutine/task leaks, and out-of-order completion.
- Verify cancellation, deadlines, cleanup, and shutdown on success and failure.
- Distinguish safe parallelism from concurrency that complicates invariants.

## Events, retries, and replay

- Define event identity, idempotency, ordering, deduplication, retry budget,
  poison handling, and terminal failure.
- Check crash windows between state change, publication, acknowledgement, and
  consumer side effects.
- Prove replay does not duplicate externally visible actions or corrupt state.

## Transactions and consistency

- Name the atomic boundary and state visible during partial failure.
- Trace database and external side effects, rollback, compensation, isolation,
  optimistic versioning, and concurrent writers.
- Reject network calls or unbounded work inside transactions without a justified
  invariant and timeout.

## Caches and derived state

- Define source of truth, key dimensions, invalidation, TTL, stale-read policy,
  tenant/user isolation, and behavior when cache infrastructure fails.
- Check that permission or schema changes cannot leave privileged stale entries.

## Authorization and tenancy

- Verify authorization before data exposure or side effects.
- Trace tenant/user identifiers through reads, writes, caches, jobs, events,
  exports, logs, and error paths.
- Test cross-tenant, revoked-access, missing-context, and mixed-version paths.

## Migration and rollout

- Check old/new application and schema combinations, backfill, rollback,
  defaults, lock duration, partial deployment, and feature-gate behavior.
- Require a removal owner for temporary compatibility and flags.
- Report any fail-open state or irreversible step without recovery evidence.

The reviewer receipt must name each trigger, changed invariant, failure path,
evidence/check, completion state, and residual uncertainty.
