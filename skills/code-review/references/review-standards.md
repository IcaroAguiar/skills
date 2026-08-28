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

Report the gate result compactly:

`CORRECTNESS=<status> SIMPLIFICATION=<status> SEMANTICS=<status> DOCUMENTATION=<status> VERIFICATION=<status>`

Use `PASS`, `FAIL`, or `BLOCKED`; documentation may also use `N/A`.
