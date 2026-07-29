# Screenshot-Only Workflow

Use when the source is PNG, JPG, WebP, PDF, exported mockup, generated image, or current-vs-target screenshots without Figma layout metadata.

## Reference Quality Gate

Before implementation, classify confidence in `state.md`:

- `high`: exact viewport is known, screenshot is clear, assets/fonts are available or easily matched.
- `medium`: screenshot is clear but tokens/assets/fonts are inferred.
- `low`: source is low resolution, cropped, blurred, compressed, ambiguous, or responsive behavior is unknown.

Downgrade confidence when:

- viewport is unknown;
- large portions are cropped;
- screenshot has compression/blur;
- fonts/assets/logos are unavailable;
- source is generated or internally inconsistent;
- dynamic content in the app is not represented in the source.

## Grounding Output

Write `.visual-fidelity/visual-spec.md` before code:

- source type and confidence;
- target viewport and device scale factor;
- page structure and scroll-stops;
- layout model and major x/y alignment landmarks;
- visual hierarchy and content density;
- per-section landmarks;
- tokens: colors, typography, spacing, radius, borders, shadows;
- required assets and visible image crops;
- allowed deviations and unknowns;
- elements that must not be omitted.

## Visual IR

Create `.visual-fidelity/visual-ir.json` before implementation.

Minimum schema:

```json
{
  "source_type": "screenshot-only",
  "viewport": { "width": 1440, "height": 900, "deviceScaleFactor": 1 },
  "page": {
    "background": "description or token",
    "maxWidth": "number or token",
    "layoutModel": "single-column | two-column | sidebar | dashboard | freeform | mixed",
    "scrollStops": [
      { "id": "hero", "yStart": 0, "yEnd": 900, "status": "pending" }
    ]
  },
  "tokens": {
    "colors": [],
    "typography": [],
    "spacing": [],
    "radius": [],
    "shadow": []
  },
  "landmarks": [
    {
      "id": "hero-title",
      "kind": "text",
      "required": true,
      "scrollStop": "hero",
      "approxBox": { "x": 120, "y": 180, "w": 620, "h": 140 },
      "text": "exact text if visible",
      "visualRole": "primary heading",
      "styleHints": {
        "fontSize": "approx",
        "weight": "approx",
        "color": "approx",
        "alignment": "left"
      },
      "implementationTarget": {
        "file": "path or unknown",
        "component": "name or unknown"
      }
    }
  ],
  "mustNotOmit": [],
  "allowedDeviations": [],
  "unknowns": []
}
```

Rules:

- Every visible section has at least one landmark.
- Every CTA, form, logo, nav item, image, chart, pricing card, and footer block is represented.
- Use approximate pixel boxes for screenshot-only sources.
- Mark uncertainty in `unknowns`; do not hide ambiguity.

## Validation Emphasis

Screenshot-only work needs both pixel evidence and semantic audit. A low diff ratio cannot override missing required landmarks, broken links/forms, or lost content.

