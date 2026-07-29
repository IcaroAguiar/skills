# Figma MCP v2 Source Precedence

When a Figma URL or selected Figma node exists, treat Figma structured context as the primary source and screenshot as validation evidence.

Source authority:

1. Figma MCP design context: layout, components, tokens, variables, text, sizes.
2. Figma screenshot: visual validation source.
3. Existing codebase: behavior, routing, data, component APIs.
4. Model-estimated visual spec: fallback only for missing or ambiguous information.

## Required Figma Extraction

- parse file key and node ID;
- get high-level tree/metadata when the frame is large;
- get design context for frame and major children;
- get variables/tokens/styles;
- get Code Connect mapping when components are mapped;
- get screenshot for the same selected frame;
- use assets exposed by the MCP server rather than inventing placeholders.

## Figma-Driven IR Fields

Add these fields to relevant `visual-ir.json` landmarks:

- `nodeId`;
- `layerName`;
- `componentName`;
- `codeConnect` source path/snippet when available;
- token references;
- Auto Layout direction/gap/padding;
- exact text;
- exact asset reference.

If Figma context conflicts with screenshot:

- prefer Figma structured context for tokens, dimensions, text, component variants, and assets;
- prefer screenshot for final rendered visual parity;
- document the conflict in `state.md` and `visual-plan.md`.

