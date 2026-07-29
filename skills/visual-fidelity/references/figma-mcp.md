# Figma MCP Workflow

Use when the user provides a Figma URL, frame, selected node, or design system source.

## Principle

When Figma is available, screenshot is visual evidence, not the primary source. Prefer Figma-provided layout, variables, components, variants, assets, and Code Connect mappings.

## Required Steps

1. Fetch design context from Figma MCP when available.
2. Extract frame dimensions, layout mode, constraints, spacing, typography, colors, effects, component names, variants, and assets.
3. Resolve Code Connect mappings or existing codebase components when available.
4. Write `.visual-fidelity/visual-ir.json` using Figma metadata instead of approximate screenshot guesses.
5. Write `.visual-fidelity/visual-plan.md` mapping Figma nodes/components to repository files/components.
6. Use screenshots only to validate rendered parity after implementation.

## Visual IR Differences

For `figma-mcp`, landmark entries should prefer:

- Figma node id/name;
- exact frame bounds;
- component/variant metadata;
- design token references;
- exported asset path;
- Code Connect target component when available.

If Figma metadata conflicts with screenshot appearance, document the conflict in `state.md` and prefer the explicit user instruction or design-system contract.

## Do Not

- Recreate Figma components as static divs when codebase components exist and can be mapped.
- Use screenshot-only approximations when Figma gives exact layout data.
- Ignore Code Connect snippets/imports if they point to real codebase primitives.

