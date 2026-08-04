# Foundations

## Precedence

Resolve conflicts in this order:

1. safety;
2. accessibility;
3. usability;
4. clarity;
5. interaction consistency;
6. contextual fit;
7. visual hierarchy;
8. authorial direction;
9. local aesthetic preference.

A lower layer cannot compensate for a failure above it. Record exceptions with context, functional rationale, impact, boundary, and evidence that the exception stayed contained.

## Functional floor

### Safety

- Make impact and reversibility explicit for sensitive operations.
- Separate destructive actions from routine decisions.
- Present advertising, consent, and state changes honestly.

### Accessibility

- Provide sufficient text and non-text contrast.
- Preserve coherent reading and focus order.
- Communicate meaning beyond color, position, hover, gesture, shape, or motion.
- Give controls clear names, labels, instructions, errors, and input-sized targets.
- Respect motion preferences and keep animation subordinate to comprehension.

### Usability and clarity

- Keep the primary task and action identifiable without exhaustive reading.
- Place controls near their effects and feedback.
- Preserve domain language and platform expectations.
- Expose enough information to decide; disclose secondary detail on demand.
- Give equivalent-looking controls equivalent behavior.

### Interaction consistency

- Keep semantics, placement, and feedback predictable for equivalent actions.
- Distinguish navigation, action, selection, and state.
- Let visual variation express a rule rather than replace one.

### Responsive ergonomics

- Recompose hierarchy instead of shrinking desktop.
- Preserve task, context, errors, and the primary action at each relevant width.
- Account for keyboard, touch, pointer, zoom, safe areas, virtual keyboards, and long content.
- Tune density to task frequency, risk, and input method.

### States

Cover applicable initial, loading, empty, partial, success, recoverable error, blocking error, unavailable, selected, focus, hover, pressed, offline, and syncing states. Feedback must state what happened, what remains preserved, and the next action.

## Evidence boundary

Judge only what the artifact can prove.

### Static image

A legible image can prove visible copy, static hierarchy, proportion, density, rhythm, borders, radius, shadows, backgrounds, apparent contrast, frames, and visual cliches. Inspect the original resolution, zoom relevant regions, transcribe key labels, and inventory rendered surfaces before scoring.

A static image cannot prove keyboard behavior, focus order, zoom reflow, programmatic semantics, responsiveness, or asynchronous states.

### Source and implementation

Source without a running interface does not prove final composition, line wrapping, or behavior. A running interface does not prove inaccessible states that were not exercised.

Use `N/V` only where the evidence boundary genuinely blocks verification.

**Complete when:** every observable property was checked and every unsupported behavior is marked `N/V`.
