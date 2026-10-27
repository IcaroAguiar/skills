# Review standards

Apply every gate, but report only evidence grounded in the reviewed diff.

## Gates

- `CORRECTNESS`: behavior, contracts, security, data, lifecycle, compatibility, and failure paths are sound.
- `SIMPLIFICATION`: the change avoids unnecessary code, duplication, branching, indirection, and misplaced ownership.
- `SEMANTICS`: names, responsibilities, states, roles, units, and logic-bearing values tell the truth.
- `DOCUMENTATION`: changed behavior and public contracts have current documentation, or documentation is not applicable.
- `VERIFICATION`: tests and checks independently prove the affected behavior and relevant failure path.

## Test evidence

Tautological tests considered harmful.

A test is tautological when it provides no evidence independent from the code
under test. Flag it when the test:

- calculates the expected value with the same production logic;
- asserts that a mock returns only the value configured by that same test;
- restates the implementation algorithm instead of checking observable behavior;
- mocks away the boundary or failure path the requirement needs to prove.

Prefer fixed independent expectations, externally visible state transitions,
contract-level inputs and outputs, or a regression that fails before the fix.
A short test with an obvious literal expectation is not tautological merely
because it is simple.

## Comments

A comment earns its place by saying what the code cannot: why a non-obvious
choice was made, a constraint or invariant, a unit, or an outside reference (a
spec, an issue, an upstream bug). Report the added comments that:

- restate the name, the signature or the next line (`/** Returns the user. */`);
- document declarations by habit: a docblock on internal or self-explanatory
  code. Keep docblocks for public contracts whose behavior the signature does
  not tell;
- narrate history or process: what changed, what the code used to do, which
  review, finding or PR asked for it;
- keep commented-out code, or a TODO without an issue.

Report them as one `SIMPLIFICATION` finding that lists every place: medium when
they run through the diff (T0 printed a `COMMENTS` line), low otherwise. The fix
is to delete them, or to move what they say into a name, a type or a test. Never
ask the author to add a comment that a clearer name, type or test would make
unnecessary.

## Structural baseline

Repository standards override this baseline. Treat these as judgement calls and
report them only when the changed diff shows a concrete cost:

- `Mysterious Name`: a name hides what a value, function, state, or unit means.
- `Duplicated Code`: the same logic shape appears in more than one changed place.
- `Data Clumps`: the same fields or parameters repeatedly travel together.
- `Primitive Obsession`: a primitive stands in for a domain concept with rules.
- `Repeated Conditionals`: the same decision is reimplemented across the change.
- `Shotgun Surgery`: one behavior requires scattered edits across unrelated owners.
- `Divergent Change`: one module changes for unrelated reasons in the same diff.
- `Speculative Generality`: abstraction or configuration exists without a current requirement.
- `Middle Man`: a changed layer delegates without owning policy, translation, or behavior.

Do not propose cleanup outside the reviewed diff unless it is required to make
the changed behavior correct or verifiable.
