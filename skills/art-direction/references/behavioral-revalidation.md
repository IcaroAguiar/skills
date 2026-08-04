# Behavioral revalidation

Art direction is not approved by a strong frame. It is approved only when the
authored direction survives the inherited task, state, accessibility, and
platform contract in a rendered runtime.

## Hard gates

Run these gates before visual scoring. A single `FAIL` returns the work to
`design-direction`; it cannot be offset by taste, differentiation, or a
high-quality screenshot.

### 1. End-to-end journey

Write the smallest required journey as observable transitions, then execute it
from the real initial state. Do not set classes, storage, or component state by
hand to simulate completion. Verify the primary action, the required
prerequisite, the next surface, cancellation or back, recovery, and the
boundary action that must remain inactive or unperformed.

### 2. Prerequisite reveal

For every gated action, prove:

```text
prerequisite unmet → reason is perceptible → action is safely unavailable
prerequisite met   → next surface is visible → action becomes available
```

The reason, the completion state, and the action must refer to the same object
and scope. A visually quiet direction must not hide the condition that makes a
high-consequence action possible.

### 3. Semantic visibility

Inspect the rendered DOM and the accessibility tree. When a state changes,
visual visibility and semantic availability must agree. Check the full set of
coupled state mechanisms where applicable: `hidden`, `display`, `visibility`,
`disabled`, `aria-disabled`, `aria-hidden`, and `inert`. Removing a CSS class is
not enough when a native attribute still suppresses the content.

### 4. Focus and input continuity

Exercise keyboard, touch, pointer, and the relevant platform back behavior.
Focus must move to the newly revealed or invalid state, remain visible, and
return safely after cancellation. Native controls are preferred over composite
ARIA widgets; if a composite is used, verify its complete focus, keyboard,
selection, and announcement contract.

### 5. Compact overflow

Test the narrowest declared width with real content. Any page-level horizontal
overflow that hides content or an action is a hard failure. Do not accept a
phone-shaped browser viewport as proof of native mobile behavior.

### 6. Critical-state evidence

Capture the states that determine the journey, not only the hero frame. At a
minimum include initial, selected or in-progress, prerequisite-complete,
action-ready, error or unavailable, and recovery or review. Each evidence item
must name the observable state and the requirement it proves.

### 7. Runtime and platform truth

Record a redacted console result and the exact runtime used. Browser evidence
proves web behavior; a mobile browser proves mobile web; a native runtime proves
only the native journey actually executed there. Keep native, refined, and
premium claims `N/V` when the required runtime evidence is missing.

## Result contract

```yaml
hard_gates:
  journey_complete: PASS | FAIL | N/V
  prerequisite_reveal: PASS | FAIL | N/V
  semantic_visibility: PASS | FAIL | N/V
  keyboard_and_focus: PASS | FAIL | N/V
  compact_overflow: PASS | FAIL | N/V
  console_clean: PASS | FAIL | N/V
  critical_state_evidence: PASS | FAIL | N/V
  platform_runtime: PASS | FAIL | N/V
failure_policy: any FAIL rejects; N/V limits the highest claim
visual_scoring: only after all applicable hard gates pass
```

The final `design-direction` revalidation must consume this result and confirm
that the context lock, task topology, required content, action geography, and
state contract remain intact.
