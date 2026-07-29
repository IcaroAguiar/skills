# Preserve Structure Workflow

Use for existing routes/components where the user wants maximum fidelity to a reference while preserving the current product surface.

Default execution mode: `maximum-fidelity-preserve-structure`.

## Preservation Map

Before implementation, document in `.visual-fidelity/visual-plan.md`:

- header, nav, footer, and route structure;
- each existing section/component in order;
- forms, validation, submit handlers, loading/error states;
- links, hrefs, routing behavior, anchors, WhatsApp/mailto/tel links;
- auth/data state and integrations;
- accessibility roles, labels, focus behavior, keyboard behavior;
- analytics or tracking hooks;
- localized content and content source of truth.

## Allowed Changes

Prefer:

- local CSS/classes/tokens;
- props and small child markup;
- image source/crop adjustments;
- layout wrappers when they do not break semantics;
- local variants of existing components;
- spacing, radius, type, color, border, shadow, and density changes.

Component replacement requires a documented reason:

- existing abstraction prevents required layout;
- component has incompatible semantics;
- local variant would be more invasive than a replacement;
- user explicitly requested rebuild.

## Blocking Mistakes

- Removing real forms/links/state to match pixels.
- Replacing real content with screenshot placeholders.
- Flattening interactive UI into static blocks.
- Preserving components so rigidly that major reference landmarks cannot be expressed.

If preserving structure prevents a required landmark, escalate the conflict instead of silently omitting the landmark.

