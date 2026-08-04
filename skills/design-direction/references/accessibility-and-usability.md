# Accessibility and Usability

Visual quality cannot compensate for functional friction. Mark behavior beyond the evidence boundary `N/V`.

## Perception and reading

- Keep body text legible and essential content above overly faint gray.
- Give controls, focus, selection, and state perceptible non-text contrast.
- Communicate meaning beyond color, position, shape, hover, or animation.
- Preserve reading order and essential actions under zoom and text enlargement.
- Give meaningful icons a name or text alternative.

## Keyboard, focus, pointer, and touch

- Make pointer-operable controls keyboard-operable where the platform requires.
- Match focus order to reading and task order.
- Show focus on the element perceived as interactive.
- Let visually customized controls expose focus on the visible target.
- Preserve native semantics and keyboard behavior when styling native controls or wrapping headless primitives.
- Size targets for the input method without visually inflating every desktop control.
- Use hover as enhancement, not as the only source of name, state, or action.

## Forms

- Give each field a persistent label and programmatic relationship.
- Expose requiredness, format, unit, and constraints before errors when relevant.
- Match input type, virtual keyboard, and autofill to the data.
- Identify the invalid field, explain correction, and preserve entered values.
- Move invalid submission to the first error or a navigable summary.
- Size long fields by expected content.
- Keep the primary action near its context and report pending, success, or failure.

## Long forms

Shape complexity around goals, decisions, dependencies, and review.

Use progressive or conditional sections when they reduce cognitive load while preserving direct access, summary, state, errors, and required information. Keep short forms continuous. Use a blocking stepper only for a real mandatory order, regulatory sequence, or irreversible dependency.

A long form passes when:

1. the next action is identifiable without scanning every field;
2. fields are grouped by objective rather than input type alone;
3. essential and optional fields have distinct weight and instruction;
4. complete, pending, incomplete, and error states are clear;
5. users can review without reopening the entire form;
6. collapsed sections retain useful summary and direct access;
7. any stepper has a real sequence rationale.

Expansion controls need perceptible name, state, and focus and must preserve the user's working position.

## Upload

- Provide an accessible name, visible focus, and keyboard activation.
- State accepted format, count, and size before selection when relevant.
- List attachments with upload state, error, and removal.
- Scale the visual target to task frequency and complexity.
- Mention drag-and-drop only when implemented.

## States and feedback

Loading preserves useful context; empty states explain meaning and next action; success states identify what was preserved; errors provide recovery. Disabled controls do not replace explanation. Announce asynchronous feedback appropriately and place alerts near the affected decision.

Apply [states-and-feedback.md](states-and-feedback.md) when states are present.

## Operational collections

- Keep total and displayed counts understandable.
- Make remaining items visibly reachable by keyboard, touch, and pointer.
- Name selection, sorting, filters, pagination, and context menus and expose their states.
- Keep destructive actions discoverable without hidden gestures and confirm in proportion to risk.
- Preserve table headers and row relationships when revealing details.

Apply [operational-collections.md](operational-collections.md) when collections are present.

## Responsive criterion

- Recompose priority instead of stacking every desktop block.
- Keep primary action, context, and errors findable.
- Prevent accidental horizontal page scrolling.
- Keep virtual keyboards, safe areas, and long content from covering essential controls.
- Tune density to frequency, risk, and input method.

**Complete when:** the interface can be perceived, understood, operated, and recovered at relevant sizes and input methods; any unsupported behavior is `N/V`.
