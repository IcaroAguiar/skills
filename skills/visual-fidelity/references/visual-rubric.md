# Visual Rubric

Create `.visual-fidelity/visual-rubric.json` before the first repair loop.

Default schema:

```json
{
  "scale": "0_to_5",
  "passingScore": 4.3,
  "categories": [
    { "id": "core_completeness", "weight": 0.25, "description": "Required sections, elements, CTAs, text, and assets are present." },
    { "id": "structure_layout", "weight": 0.30, "description": "Spatial layout, hierarchy, grid, alignment, proportions, and scroll rhythm match." },
    { "id": "text_content", "weight": 0.15, "description": "Visible text, labels, nav items, numbers, and form text match." },
    { "id": "visual_tokens", "weight": 0.15, "description": "Color, typography, radius, borders, shadows, and backgrounds match." },
    { "id": "interaction_preservation", "weight": 0.10, "description": "Links, forms, states, route behavior, and accessibility contracts remain intact." },
    { "id": "render_cleanliness", "weight": 0.05, "description": "No broken assets, layout overflow, unintended placeholders, or rendering artifacts." }
  ],
  "criticalCaps": [
    { "condition": "any required landmark missing", "maxScore": 3.0, "status": "structural correction still required" },
    { "condition": "primary hero/form/navigation structurally wrong", "maxScore": 3.4, "status": "structural correction still required" },
    { "condition": "two or more scroll-stops have blocking divergences", "maxScore": 3.8, "status": "structural correction still required" },
    { "condition": "form, route, link, auth, data state, or critical interaction broken", "maxScore": 3.5, "status": "not ready" },
    { "condition": "pixel diff passes but semantic landmark audit fails", "maxScore": 3.8, "status": "not ready" }
  ]
}
```

## Rules

- Pixel diff is evidence, not the final judge.
- A low diff ratio cannot override missing required landmarks.
- A high diff ratio can fail the run even if semantic completeness looks acceptable.
- The final report must include category scores, critical caps triggered, final capped score, and next correction.
- Passing score defaults to `4.3`.

## Rubric Report

Each run should write `.visual-fidelity/runs/<run-id>/rubric-report.json` with:

- category scores;
- weighted score;
- critical caps triggered;
- final capped score;
- status;
- top 5 remaining corrections.

