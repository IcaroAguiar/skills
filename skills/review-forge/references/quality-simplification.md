# Quality and simplification

## Approval bar

Passing tests are not enough when the diff makes future behavior harder to
reason about. Prefer deleting incidental complexity over reorganizing it.
Require the implementation to be direct, cohesive, and unsurprising in the
architecture that already owns the concept.

Every review must return `SIMPLIFICATION: PASS`, `FIX_REQUIRED`, or `BLOCKED`
with concrete evidence. A generic clean verdict is invalid.

## Pressure checks

- Delete dead code, unused exports, obsolete branches, temporary compatibility,
  redundant comments, and speculative hooks.
- Ask whether a state model, direct flow, canonical helper, or ownership change
  can remove branches, flags, adapters, wrappers, casts, or modes.
- Flag duplicated logic and near-duplicate helpers when one canonical
  implementation can serve the domain.
- Reject thin wrappers, identity helpers, pass-through layers, and abstractions
  that add vocabulary without hiding meaningful complexity.
- Treat scattered booleans, nullable modes, feature checks, and condition chains
  in busy paths as design pressure.
- Make types and invariants explicit instead of preserving `any`, `unknown`,
  casts, silent fallbacks, or optionality that hides the real contract.
- Keep logic in the package, service, or module that owns the concept.
- Separate orchestration from business rules when both become difficult to
  scan, test, or reuse.
- Prefer atomic related updates and simple parallelism where sequential or
  partial flow creates brittleness.
- Require decomposition when a change crosses a repository-defined limit or
  pushes a source file from below 1,000 lines to above it without a compelling
  cohesive reason.

## Simplification evidence

A blocker must show more than taste. Provide at least one:

- exact dead or unreachable path;
- duplicate implementation shape and canonical owner;
- unnecessary concept, wrapper, branch, flag, or dependency that can be
  removed;
- concrete smaller state model or control path;
- responsibility boundary violated by the diff;
- measurable file, branch, parameter, dependency, or concept growth tied to
  regression risk.

The correction need not match a maintainer's preferred patch. It must preserve
behavior while reducing the concepts or moving pieces a reader must hold.

## Fix guidance

Prefer, in order:

1. delete unnecessary code or behavior;
2. reuse the canonical domain model or helper;
3. move logic to its rightful owner;
4. collapse special cases into a clearer default;
5. extract one focused pure unit;
6. add an abstraction only when it removes more complexity than it introduces.

Do not settle for renaming a structurally confused function. Do not replace one
large function with many indirections that preserve the same mental load.

## Precision controls

Do not block on file size, duplication, or abstraction preference alone when the
code remains cohesive and the alternative is speculative. Do not broaden a PR
into unrelated cleanup. Record nearby pre-existing debt separately unless the
change materially worsens it or the requested behavior cannot be safe without
addressing it.
