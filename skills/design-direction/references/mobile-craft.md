# Mobile Craft and Premium Finish

Use this module when the request asks for a premium, refined, polished,
high-end, native-feeling, or less generic mobile interface, or when a correct
mobile result still looks assembled from generic components.

This module defines the craft evaluation contract inside `design-direction`.
When the complementary `art-direction` skill is available, use it to generate
the thesis, composition, and expressive direction only after this skill passes
the foundations; then return here for revalidation. Do not duplicate the
generative art-direction workflow inside this module.

## Contents

- [Quality levels](#quality-levels)
- [Craft lock](#craft-lock)
- [Dominant composition](#dominant-composition)
- [Semantic rhythm](#semantic-rhythm)
- [Functional typography](#functional-typography)
- [Material roles](#material-roles)
- [Task-appropriate components](#task-appropriate-components)
- [Motion and response](#motion-and-response)
- [Rendered frame inventory](#rendered-frame-inventory)
- [Premium gate](#premium-gate)
- [Contrasting cases](#contrasting-cases)

## Quality levels

Keep these claims distinct:

1. **Functional** — the primary task can be completed.
2. **Well designed** — foundations, hierarchy, states, and adaptation are solid.
3. **Native** — interaction and presentation follow the target platform, with
   runtime evidence.
4. **Refined** — composition, rhythm, type, material, components, and response
   show deliberate craft.
5. **Premium** — refined craft and native precision remain coherent across real
   content, states, text enlargement, interruption, and assistive use.

A higher level includes the lower levels. Do not infer a higher level from a
static screenshot or from the use of a native component library.

## Craft lock

Before styling, record:

```text
Dominant task:
Dominant composition:
First-viewport obligation:
Rhythm map:
Typographic roles:
Material roles:
Component rationale:
Motion and feedback plan:
Platform evidence available:
```

If these answers are interchangeable with an unrelated product, the direction
is still generic.

## Dominant composition

Make one relationship govern the screen: timeline, list-detail, reader-action,
map-context, editor-inspector, conversation-composer, or another task-shaped
topology.

Avoid a composition that is only:

```text
framed header
+ framed summary
+ framed panel
+ framed rows or cards
+ framed detail
+ CTA
```

This can be orderly and still under-authored. Prefer one primary content plane,
stable navigation, and local emphasis where state, selection, or action needs it.

**Criterion:** removing decorative frames must reveal a coherent spatial
relationship, not an undifferentiated column of components.

## Semantic rhythm

Use proximity to express relation and larger pauses to express a true context
change. Vary spacing by semantic level rather than applying one gap and one
padding everywhere.

Check:

- title-to-context is tighter than section-to-section;
- repeated rows use a stable cadence;
- selection and action do not create accidental gaps;
- safe-area and keyboard accommodation preserve the rhythm;
- compact density does not reduce touch confidence.

**Anti-pattern:** uniform-spacing assembly — every block, surface, and heading
uses the same vertical interval, making hierarchy depend on borders.

## Functional typography

Assign distinct roles to:

- navigation title;
- task title;
- primary value or content;
- section heading;
- instruction;
- metadata;
- state;
- action label.

Do not create hierarchy with arbitrary size and weight combinations. Preserve
line measure, wrapping, localization, and platform text scaling. Use truncation
only when the complete value remains available.

**Criterion:** type alone should explain the reading order before color,
surface, or elevation is added.

## Material roles

Define a small material vocabulary by function:

- base content plane;
- persistent navigation or action chrome;
- selected or focused region;
- transient overlay or sheet;
- semantic tonal state;
- true elevated layer.

Do not render every region as the same rounded rectangle with border and fill.
Blur, glass, gradient, shadow, and saturated color do not constitute premium
craft; use them only when they communicate platform material, depth, state, or
brand meaning.

**Criterion:** each material treatment has one named role and equivalent roles
share the same treatment.

## Task-appropriate components

Choose patterns from the task, not from the available component palette:

- schedule → time spine or agenda rows;
- selection → native rows or selection list;
- dense metadata → grouped list or structured detail;
- local state → inline status;
- secondary operation → toolbar or contextual menu;
- long reading → dedicated reader;
- contextual completion → inset-aware action region.

Prefer simpler semantics over an ARIA composite widget unless the complete
keyboard and focus behavior is implemented and verified.

**Criterion:** replacing the component with a generic card would make the task
relationship less clear.

## Motion and response

Specify motion and feedback even when the primary deliverable is static:

```text
Trigger:
What changes:
Spatial or causal relationship:
Visual response:
Focus or assistive announcement:
Haptic or sound, if applicable:
Reduced-motion behavior:
```

Use motion to preserve causality, selection, continuity, and state change.
Avoid ceremonial animation and success modals for routine completion. Runtime
evidence is required to claim haptic, platform-transition, or assistive quality.

## Rendered frame inventory

For every element using any combination of background, border, radius, shadow,
blur, or inset shell, record:

```text
Region:
Frame count:
Functional role of each frame:
Can spacing, type, alignment, or one divider replace it?
Decision: keep | lighten | merge | remove
```

Perform this on the rendered result, not only on component names or CSS tokens.
Nested frames require different roles. A framed parent and framed child cannot
both exist merely to group the same content.

**First-viewport check:** primary task, urgent state, current selection, and
top-level navigation must remain discoverable without decorative framing
consuming the useful viewport.

## Premium gate

Classify the result as **Premium** only when all applicable items pass:

- foundations and primary journey pass;
- target-platform runtime evidence supports the `Native` claim;
- one dominant composition is evident;
- first-viewport utility fits the task;
- rhythm communicates semantic levels;
- typography has explicit functional roles;
- materials have differentiated, named roles;
- components fit the task and platform;
- rendered frame inventory contains no functionless or duplicate frame;
- interaction states are complete;
- motion and feedback explain causality;
- real content, localization, text enlargement, keyboard, safe areas,
  interruption, and assistive use preserve the refinement.

Any `N/V` in an applicable native or craft category prevents the Premium label.
The interface may still be approved as Functional, Well designed, or Refined.

## Contrasting cases

Containment remains valid for an editor, map, controlled document reader,
selected object, transient sheet, or independently scrollable canvas when the
boundary communicates ownership or interaction.

Calm legal, clinical, and transactional flows can be premium without expressive
decoration. Their craft comes from precision, hierarchy, state continuity,
error prevention, material restraint, and platform behavior.

An editorial or discovery surface may use stronger type, image, motion, or
material expression when it preserves the task and accessibility contract.

**Complete when:** the quality level matches the evidence, the craft lock is
specific to the task, the rendered frame inventory is complete, and no
decorative technique substitutes for composition or behavior.
