# Visual Quality

Evaluate the rendered composition, not component names. The target is a task-shaped, proportional interface in which content and action lead attention.

## Contents

- [Surface budget](#surface-budget)
- [Over-cardification](#over-cardification)
- [Proportional scale](#proportional-scale)
- [Megacard](#megacard)
- [Title as container](#title-as-container)
- [Ornamental callout](#ornamental-callout)
- [AI-slop constellation](#ai-slop-constellation)
- [Unintegrated components](#unintegrated-components)
- [Expressive visual anchors](#expressive-visual-anchors)
- [Rhythm and semantic geometry](#rhythm-and-semantic-geometry)

## Surface budget

Background, border, radius, shadow, and inset spacing combine into a **frame**. Spend a frame only to communicate:

- independence;
- real layer;
- selection;
- state;
- action as a unit;
- comparison among peers.

Use section flow, alignment, proximity, dividers, or a plane-level tonal change for continuous content.

**Criterion:** inventory frames by region, name each function, and remove or lighten any frame whose only purpose is to finish the layout.

## Over-cardification

**Over-cardification** turns organizational groups into a field of independent-looking cards. **Nested cards** add frames inside frames; **container soup** lets borders, backgrounds, radius, and elevation compete without a dominant plane.

Use one visual surface per functionally independent region. Organize continuous content with sections, headings, proximity, alignment, and local dividers.

**Criterion:** no card exists solely to group content, no nested frame repeats its parent's role, and the page remains understandable after decorative elevation is removed.

## Proportional scale

Scale space, elevation, contrast, and control size by importance, frequency, risk, and content volume.

Failure signals:

- a surface occupies most of a column or viewport without independent function;
- large padding and radius amplify simple content;
- desktop controls use promotional height without ergonomic need;
- text areas, uploads, or side panels exceed the task's expected content;
- a frame repeats separation already created by the grid;
- a routine action receives more contrast than critical context.

Large canvases, editors, dialogs, draggable objects, and independent workspaces may legitimately occupy extensive area.

## Megacard

A **megacard** is a large rounded or elevated surface that packages a page, column, or continuous form as an object.

Failure signals:

- it wraps multiple sections of one continuous task;
- it repeats the page background boundary;
- border, radius, and shadow lack layer semantics;
- framing dominates content;
- a second megacard appears to balance the first;
- a form or side column is treated as independent only because it is large.

Prefer a form on the page plane, a grid-defined workspace, a low-contrast outline where orientation requires one, a continuous side panel, or locally divided sections.

**Criterion:** mentally remove background, radius, and shadow. If task and structure remain unchanged, the megacard was packaging; remove it or prove independent function.

## Title as container

**Card-as-heading** or **bannerized section header** occurs when a simple section title becomes a large horizontal surface.

Target a compact title in page flow, optional context label, concise description, aligned action or status, and at most one ordinary separator. A tonal plane is valid when the whole region communicates meaningful state.

Failure signals:

- a wide card contains only title, description, status, or a brief action;
- the header repeats separation already present in the page flow;
- framing exists only to manufacture importance;
- vertical space makes the heading compete with the task;
- a simple empty state occupies a surface larger than its message.

**Criterion:** the heading remains clear without framing; title, description, status, and action fit compactly; the block does not outrank its content; a simple empty state stays compact.

Alerts, actionable summaries, process stages, selectable items, or movable/openable entities may use a horizontal surface because the container communicates independent function.

## Ornamental callout

The pastel rounded rectangle with a colored side stripe, bold title, and generic sentence often simulates importance.

Choose treatment by meaning:

- field validation → message at the field with a programmatic relationship;
- section issue → concise message near its resolution action;
- persistent status → metadata line or structured group;
- relevant warning → restrained tonal surface, semantic label or icon, and action;
- blocking error → clear message, appropriate focus, and recovery.

Color and stripe cannot carry meaning alone. A side stripe is justified in quotations, diffs, timelines, taxonomies, or established severity systems when it adds consistent semantics beyond color.

## AI-slop constellation

Treat generic AI styling as a constellation, not a banned component:

- uppercase eyebrow over oversized title;
- generic blue-gray canvas;
- floating blue header button;
- white megacards with soft shadow;
- purposeless gradient or glass blur;
- pill for routine metadata;
- identical radius across controls, surfaces, and alerts;
- ornamental pastel callout;
- oversized dashed upload area for a simple action;
- expansive gaps that reduce density without improving hierarchy;
- copy that could belong to any SaaS.

One signal may fit the product. Several signals without domain or task rationale require recomposition from content, frequency, risk, and surface mode.

## Unintegrated components

An **unintegrated component**, **raw component**, or **design-system bypass** is a control or interactive primitive that visibly or behaviorally falls outside the product's established system. Its implementation may be native HTML, a headless primitive, a design-system component, or a third-party library; origin alone does not determine whether it passes.

Failure signals:

- equivalent controls use unrelated typography, height, spacing, radius, border, iconography, or focus treatment;
- browser or library defaults appear inside an otherwise deliberate interface without contextual rationale;
- hover, focus, pressed, selected, disabled, loading, error, and success states do not follow the product's interaction grammar;
- labels, helper text, validation, menus, dialogs, or feedback use semantics different from equivalent product patterns;
- a one-off control bypasses shared tokens or components and drifts across themes or responsive widths;
- a library's recognizable default appearance overrides the product's identity;
- visual customization removes native semantics, keyboard behavior, or accessible state.

Prefer the smallest suitable product primitive, then integrate it with the established tokens, state model, interaction behavior, accessibility contract, density, and responsive rules. Extend the system when no suitable primitive exists; record the new variant instead of styling an isolated exception.

Native HTML is valid when its platform behavior is useful and its rendered treatment is deliberately compatible with the surrounding system. A visibly plain control may also be correct in prototypes, content documents, operating-system-native contexts, or products whose design language intentionally uses browser-native controls.

**Criterion:** compare the component with an equivalent product control across default, focus, interaction, disabled, validation, loading, and responsive states. It passes when users can predict its role and behavior, the product retains a coherent identity, and no customization degrades native semantics or access.

## Expressive visual anchors

Do not remove a distinctive visual element solely because it is decorative,
symbolic, spacious, or resembles one signal from the AI-slop constellation.
First determine whether it acts as a recognizable product landmark, explains a
domain relationship, supports orientation, or gives an important recurring
surface its identity.

When an expressive anchor has product value, preserve its concept and improve
its proportion, placement, contrast, motion, and relationship to the task.
Simplify or remove it only when evidence shows that it obscures primary content,
misrepresents the domain, harms task completion, or becomes indistinguishable
from generic decoration.

**Criterion:** before removing an expressive element, record its semantic,
orientational, and recognition value; preserve the concept when any of those
values is material, and map the refinement to the specific usability or
composition problem being solved.

## Rhythm and semantic geometry

- Group what users read or operate together.
- Mark a subject change with space or one divider.
- Size fields by expected content.
- Reserve large gaps for real level changes.
- Preserve scanability, keyboard use, and work area in operational systems.
- Preserve comfortable touch targets without turning every mobile block into a card.
- Use radius, border, and shadow to distinguish controls, surfaces, overlays, selection, and feedback.

**Complete when:** content explains hierarchy, every frame has a named function, scale matches the task, warnings communicate meaning and next action, components follow the product contract, and domain specificity replaces generic decoration.
