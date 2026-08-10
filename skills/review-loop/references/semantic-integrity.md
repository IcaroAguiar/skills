# Semantic integrity

## Purpose

Names and literals are part of the design. They must communicate durable domain
meaning, ownership, lifecycle, units, and side effects. Semantic drift is a
correct-now defect when it makes the current code lie, hides responsibility, or
causes future changes to target the wrong concept.

Every review must return `SEMANTICS: PASS`, `FIX_REQUIRED`, or `BLOCKED` and name
the files, symbols, and literal classes inspected.

## Blocking semantics

Require correction when the diff introduces or preserves, within its ownership:

- production files, APIs, types, functions, variables, or routes named after
  roadmap phases such as `week-3`, `phase-2`, `v2`, `new`, `temporary`, or a
  ticket rather than the durable domain concept;
- names that contradict current behavior, omit meaningful side effects, confuse
  source and derived state, or misuse domain vocabulary;
- generic names such as `processData`, `handleStuff`, `doWork`, `item`, or
  `manager` where the owned responsibility is knowable;
- an unwieldy name joined by multiple actions because one function owns several
  responsibilities; decompose the responsibility rather than merely shortening
  the label;
- booleans whose call sites cannot reveal what `true` or `false` means;
- string or number literals encoding roles, states, protocols, error codes,
  limits, retries, time units, money, permissions, feature flags, or values that
  must change consistently across locations;
- aliases, comments, exports, tests, or documentation that retain an obsolete
  symbol after a rename.

If no honest concise name exists, treat that as evidence that the model or
ownership boundary is unclear.

## Preferred corrections

- Rename to the domain concept used by users, contracts, and neighboring code.
- Split mixed responsibilities before choosing shorter names.
- Replace boolean mode arguments with a named option, enum, strategy, or
  separate operation when call-site meaning is otherwise hidden.
- Use a named constant, enum, value object, schema, or typed unit for
  logic-bearing values that must remain consistent.
- Update imports, callers, tests, generated contracts, documentation, metrics,
  events, feature flags, and examples affected by the semantic change.
- Preserve public compatibility only when the real contract requires it; do not
  keep an obsolete alias as automatic backward compatibility.

## Precision controls

Do not flag:

- historical planning, release notes, migrations, or fixtures whose chronology
  is the subject of the artifact;
- long test names that accurately state behavior and expectation;
- common local loop/index names with obvious scope;
- self-explanatory local literals that are not logic-bearing or synchronized;
- protocol constants whose spelling is owned externally and cited;
- a one-use constant that would merely rename `3` to `THREE` without adding
  domain or unit meaning.

A semantic finding must state what the current name/value claims, what the code
actually means, and the smallest durable correction.
