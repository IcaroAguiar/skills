---
name: visual-web-builder
description: Use this combined Codex skill when a task needs AI image generation or image editing plus frontend implementation from those generated visuals. It orchestrates the system imagegen workflow for raster assets, mockups, edits, transparent cutouts, and image prompts, then applies the image-to-code workflow for visually important websites, hero sections, landing pages, product pages, portfolios, redesigns, and premium frontend implementation. Use when the user wants one renamed skill that combines $imagegen and $image-to-code into a single visual website builder.
---

# Visual Web Builder

## Purpose

This is an orchestrator skill that combines two existing skills without duplicating their full instructions:

- `imagegen`: generate or edit raster images, visual references, transparent cutouts, UI mockups, product shots, and project-bound assets.
- `image-to-code`: generate website section references first, analyze them deeply, then implement the frontend faithfully.

Use this skill when the user wants a single workflow that starts with AI-generated visuals and ends with usable code.

## Source Skills

Load the source skill details only when needed:

- Image generation source: `references/imagegen.md`
- Image-to-code source: `references/image-to-code.md`

Do not copy large sections from those files into context unless the task requires their exact rules. Prefer reading only the relevant portions.

## Trigger

Use this skill for:

- visual website creation where image generation should happen before coding
- landing pages, hero sections, product pages, portfolios, editorial pages, and startup sites
- redesigns where the final frontend should closely match generated design references
- tasks that need both generated bitmap assets and frontend integration
- user requests that explicitly mention combining `$imagegen` and `$image-to-code`

Do not use this skill for:

- pure bug fixes or backend work
- deterministic SVG/icon edits that are better done directly in code
- simple image generation with no code output, unless the user explicitly asks for the combined skill

## Workflow

1. Classify the task:
   - `asset-only`: generate or edit images, no implementation.
   - `visual-to-code`: generate design references, analyze them, implement frontend.
   - `asset-plus-code`: generate project assets, save them into the workspace, and wire them into code.
2. For all image work, follow the `imagegen` skill rules:
   - use built-in `image_gen` by default
   - use CLI fallback only when explicitly requested or confirmed
   - handle transparency with chroma-key removal first unless true native transparency is confirmed
   - save project-bound assets inside the workspace and report final paths
3. For visually important frontend work, follow the `image-to-code` sequence:
   - generate visual reference images first
   - prefer one large readable image per section
   - generate fresh detail images when text, spacing, buttons, or components are unclear
   - deeply analyze typography, colors, spacing, layout, image treatment, and component logic
   - implement the frontend only after analysis
4. Preserve the generated design during implementation:
   - do not drift into generic templates
   - keep the hero clean, spacious, and readable
   - avoid nested cards, giant section wrappers, fake technical pills, and decorative micro-UI clutter
   - use real project assets instead of leaving references under `$CODEX_HOME/generated_images`
5. Verify:
   - run the app or open the static page when appropriate
   - use browser inspection/screenshots for local frontend work when available
   - confirm images render from workspace paths
   - report any tests or visual checks performed

## Prompt Handling

When generating website references, produce prompts that include:

- section name and intended use
- visual direction and brand mood
- layout, typography, spacing, and component constraints
- image treatment and asset requirements
- exact text when the user provides it
- constraints to avoid unreadable tiny text, overstuffed heroes, nested card structures, and generic AI-gradient styling

When generating standalone assets, use the `imagegen` shared prompt schema and taxonomy from the source skill.

## Output Discipline

For final responses, include:

- generated asset paths if files were saved
- implemented file paths if code changed
- local preview URL when a dev server was started
- verification performed

Keep the explanation concise. The value of this skill is the executed workflow, not a long written design brief.
