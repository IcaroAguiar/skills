# Execute

Use when the direction is already explicit or approved. If a consequential
visual choice remains ambiguous, route to `explore`; if the thesis is approved
but execution is inconsistent, route to `refine`. Follow the scope and
applicable completion criteria in [SKILL.md](../SKILL.md).

Implement the explicit or approved direction within the requested scope.
Resolve only the remaining choices needed for that work, and explain material
tradeoffs. Obtain or direct assets only when the requested change needs them.

Record or load the [direction decision](../templates/direction-decision.md)
before implementation. Reuse the approved record for unchanged decisions.
Capture comparable baseline evidence; include an authorship score when that
judgment is part of the requested deliverable.

## Decision standard

For each new expressive decision, answer:

```text
Why this product?
Why this task?
Why this platform?
What changes in the rendered result?
What is the sober fallback?
```

Reconsider a new decision that cannot answer the first four. Do not reopen
approved choices that the task preserves.

## Approved artifact parity

When the direction is an approved artifact (canvas, mockup, prototype), the
artifact is the specification for appearance as well as structure. Implement
with the components the artifact used. Capture the implementation in the same
theme, shell, widths, and states as the approved captures, compare each pair
side by side, and list every non-data difference: frames, dividers, fonts and
case, sizes, spacing, colors, icons, copy. Fix each one or bring it to the user
as a deviation with both images. A substitution the implementer chose is not
covered by the approval. With `$design-canvas`, this is its parity gate
(`pairs.mjs`).

## Complete when

- the requested change expresses the approved thesis under realistic content
  and constraints;
- affected components, assets, behavior, states, and screens are specified to
  the extent needed for implementation;
- every applicable completion criterion in `SKILL.md` passes;
- a requested full direction specification covers the applicable sections of
  the executable-direction template; bounded edits may report the changed
  decisions and evidence;
- equivalent before/after evidence is present when a trustworthy baseline
  exists, with authorship scores when scoring is in scope;
- for an approved artifact, the parity comparison shows no unapproved difference;
- revalidation passes or names exact blockers;
- the quality claim does not exceed the evidence.
