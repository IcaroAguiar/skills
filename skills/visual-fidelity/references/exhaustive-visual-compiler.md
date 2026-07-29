# Exhaustive Visual Compiler

No implementation starts until the visual source is compiled into exhaustive artifacts.

Required artifacts:

- `.visual-fidelity/analysis/visual-ir.v2.json`
- `.visual-fidelity/analysis/visual-checklist.json`
- `.visual-fidelity/contracts/landmark-contract.json`
- `.visual-fidelity/references/atlas/`

## Visual IR v2 Minimum Coverage

`visual-ir.v2.json` must include:

- source context;
- viewport;
- crop boundaries;
- browser/chrome/presentation frame;
- section tree;
- top-down layout geometry;
- relative positions between neighboring blocks;
- typography inventory: family inference, size, weight, line-height, letter-spacing, casing;
- color inventory with element usage;
- spacing inventory: gutters, paddings, gaps, section heights, vertical rhythm;
- image inventory: aspect ratio, crop behavior, focal region, overlay, border, shadow, layer order;
- decorative inventory: shapes, strokes, seals, icons, dividers, textures, ornaments;
- CTA inventory: label, size, color, shape, position, hover expectation when inferable;
- forbidden omissions;
- ambiguity list with confidence score;
- implementation target hints when known.

## Visual Checklist

`visual-checklist.json` marks each visible detail as:

- `represented`
- `omitted`
- `ambiguous`
- `intentionally_ignored_with_reason`

Implementation is blocked if any relevant visible detail is not represented in at least one of:

- `visual-ir.v2.json`
- `visual-checklist.json`
- `references/atlas/`
- `landmark-contract.json`

Reject generic IR language like "modern layout", "similar cards", "hero with image", or "highlighted button".

## Reference Atlas

Atlas must preserve:

- original approved image intact;
- crop per main section;
- crop per high-risk region;
- crop per decorative/overlay element;
- crop per focal image;
- crop per critical CTA;
- crop per dominant typography area.

Each crop points to the original approved source and has hash/metadata. No crop may come from current runtime.

