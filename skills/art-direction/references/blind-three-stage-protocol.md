# Blind Three-Stage Protocol

Use this protocol to measure the incremental contribution of each skill.

## Arms

1. **Control** — neutral brief, no design skill.
2. **Direction** — same brief with `design-direction`.
3. **Art direction** — same brief with `design-direction`, then
   `art-direction`.

The third arm is sequential. Do not apply `art-direction` directly to the
control and attribute structural corrections to it.

## Freeze before authoring

Keep identical:

- product brief and requirements;
- content, data, and edge cases;
- technology and dependency boundary;
- target platforms and viewports;
- task journey and success criteria;
- time and tool budget when practical.

## Blindness and isolation

- Use fresh isolated authors or sessions.
- Do not mention the experiment, other arms, evaluation rubric, expected
  outcome, or suspected weaknesses.
- Prevent source inspection across arms.
- Freeze each output before evaluation.
- Keep evaluators separate from authors when possible.

## Evaluation layers

Evaluate after all outputs are frozen:

### Foundations

- task completion;
- accessibility and semantics;
- navigation and adaptation;
- state and error handling;
- content fidelity.

### Design direction

- hierarchy and context;
- surface budget;
- component integration;
- action and status coherence;
- resistance to generic anti-patterns.

### Art direction

- product-specific thesis;
- dominant composition;
- attention path;
- craft language;
- signature behavior;
- platform adaptation;
- differentiation without overdesign.

### Feasibility

- implementation cost;
- performance;
- real-content resilience;
- maintenance;
- evidence boundary.

## Required counterproof

Include at least one deliberately sober context. The art-direction arm should
show restraint rather than adding expression mechanically.

## Claims

Report:

- what improved from arm 1 to arm 2;
- what improved from arm 2 to arm 3;
- regressions unique to each arm;
- highest evidence-supported quality level;
- native or runtime checks that remain `N/V`.

Do not select a winner by visual preference alone.
