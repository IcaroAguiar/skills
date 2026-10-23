# Validation Gates

## Art-directed gate

Pass only when:

- context visibly changes the result;
- thesis is observable;
- composition is recognizable;
- visual roles are explicit and coherent;
- components are selected by task;
- critical assets and fallbacks are defined;
- signature improves continuity or recognition;
- real states and multiple screens preserve the system;
- motion and feedback are specified;
- platform adaptation is structural;
- `design-direction` passes again.

Before applying this visual gate, execute every applicable gate in
[behavioral-revalidation.md](behavioral-revalidation.md). A `FAIL` returns the
work to `design-direction`; `N/V` fixes the highest supportable claim.

## Restraint counterproof

When the direction uses a high expression budget, compare it with a deliberately
restrained treatment of the same task, content, constraints, and platform.
Retain expression where it improves comprehension, recognition, continuity,
or task confidence. Prefer the restrained treatment wherever it is equally
effective and safer.

## Quality levels

- **Styled** — surface changes only.
- **Composed** — coherent layout and attention path.
- **Authored** — product-specific thesis, system, assets, and behavior.
- **Refined** — authored quality survives real content, states, and constraints.
- **Premium** — refined quality plus verified implementation precision,
  platform behavior, resilience, and accessibility.

A foundation failure fixes the maximum verdict; averages cannot override it.

## Evidence boundary

- screenshot: static composition and visible craft;
- source: implementation intent;
- browser: web behavior at tested conditions;
- mobile browser: mobile web, not native;
- native runtime: only the exact platform journeys tested.

For native-premium claims, verify applicable assistive technology, text scaling,
virtual keyboard, safe areas, back behavior, gestures, system materials,
reduced motion, haptics, interruption, restoration, and real content.

Mark every unsupported item `N/V`.
