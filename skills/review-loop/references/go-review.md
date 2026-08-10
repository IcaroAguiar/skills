# Go review

Load for `.go`, `go.mod`, `go.sum`, `go.work`, build tags, generated/protobuf Go,
or Go build and CI tooling.

## Contracts and errors

- Preserve error identity and wrapping with `%w`; do not match error strings
  when `errors.Is` or `errors.As` owns the contract.
- Check zero values, nil interfaces, typed nils, optional pointers, slice/map
  ownership, and mutation across API boundaries.
- Verify exported names and comments describe durable behavior.

## Context and lifecycle

- Pass `context.Context` explicitly and honor cancellation/deadlines in blocking
  I/O, database, network, stream, worker, and retry paths.
- Trace goroutine start/stop ownership, joins, channel close ownership, blocked
  sends/receives, timers/tickers, and cleanup on every return.
- Check loop-variable capture, wait-group balance, select starvation, and races.

## Data and concurrency

- Verify transaction boundaries, row locking/versioning, idempotency, and the
  race between reads, writes, publication, and acknowledgement.
- Avoid sharing mutable slices, maps, buffers, or request objects without clear
  ownership or synchronization.
- Run or account for `go test`, `go test -race`, `go vet`, focused integration
  tests, and repository linters when relevant.

## APIs and generated code

- Update the source schema before regenerating OpenAPI, protobuf, mocks, or
  clients; check for reproducible zero drift.
- Trace HTTP status/error mapping, JSON field compatibility, omitempty/zero-value
  semantics, gRPC status codes, interceptors, streaming cancellation, and old/new
  client-server combinations.

## Modules, build, and portability

- Justify module/version changes, replacements, build tags, CGO, platform files,
  and toolchain directives.
- Check dependency graph and sums, local developer workflow, supported Go
  versions, and CI/runtime parity.

Return a Go receipt with triggered topics, changed invariant, failure path,
checks, skipped checks, and residual uncertainty. A generic five-gate verdict is
not enough when a triggered Go surface remains unexamined.
