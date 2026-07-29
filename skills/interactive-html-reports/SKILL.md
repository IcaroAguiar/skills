---
name: interactive-html-reports
description: Use when creating, updating, or validating local HTML reports for plans, implementation evidence, reviews, smoke tests, incidents, product rules, diagrams, kanbans, screenshots, or decision logs.
---

# Interactive HTML Reports

Use this skill when the user needs a portable, interactive, visual HTML report instead of an ad hoc Markdown note or one-off HTML page.

## Approved Visual Standard

The global visual standard is **Research Notebook**: compact, centered, modular, cool-neutral, and evidence-first. It follows the approved option C reference from `interactive-html-style-references`: small notebook-style title, top metric cards, compact top navigation, thin modular panels, teal/blue accents, clear tables, diagrams, timelines, and kanban. Do not use lateral navigation as the default, project-specific branding, ecommerce styling, oversized editorial heroes, neon gradients, or generic SaaS dashboards.

## Workflow

1. Pick one preset: `plan`, `implementation`, `review`, `operation-smoke`, `incident`, or `product-rules`.
2. Create a JSON report source using `references/content-model.md`.
3. Generate the report:

```bash
node ~/.agents/skills/interactive-html-reports/scripts/generate-report.mjs \
  --input report.json \
  --output docs/ai/reports/<slug>/index.html
```

4. Validate the report:

```bash
node ~/.agents/skills/interactive-html-reports/scripts/validate-report.mjs \
  docs/ai/reports/<slug>/index.html
```

5. For important reports, open the generated HTML in a browser and capture visual evidence.

After changing the skill package itself, run:

```bash
node ~/.agents/skills/interactive-html-reports/scripts/smoke-report-kit.mjs
node ~/.agents/skills/interactive-html-reports/scripts/test-report-kit-negative.mjs
```

## Rules

- Default to PT-BR unless the repo or user explicitly asks for another language.
- Do not invent custom CSS for a report; use the bundled kit.
- Escape untrusted text by default. Use `trustedHtml` and `trustedSvg` only for small fragments authored and reviewed by the agent; never pass logs, Telegram messages, browser content, LLM output, user input, or scraped text through these fields.
- Keep media local by default. Copied media sources must stay inside the JSON input directory, output names must be plain file names, and remote/inline media is rejected unless the kit later adds an explicit reviewed escape hatch.
- Keep reports read-only. Local interactions may filter, search, copy, expand, or navigate; they must not call authenticated APIs or execute operational actions.
- Put new reports under `docs/ai/reports/<slug>` unless the project has a stronger local convention.
- Do not bulk-migrate old HTML reports. Convert old reports only when touching them.

## References

- Content model: `references/content-model.md`
- Visual system: `references/visual-system.md`
- Component catalog: `references/component-catalog.md`
- Validation rules: `references/validation-rules.md`
