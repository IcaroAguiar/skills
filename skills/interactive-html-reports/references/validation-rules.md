# Validation Rules

Run `scripts/validate-report.mjs` before considering a report ready.

After changing the kit itself, also run `scripts/test-report-kit-negative.mjs`. It asserts that common unsafe or broken states fail loudly instead of slipping through validation.

## Required

- `<!doctype html>`, `html lang`, `title`, `viewport`, and `main` landmark.
- Metadata for `kitVersion`, `preset`, `updatedAt`, and status.
- No remote scripts, stylesheets, fonts, iframes, or CDN references by default.
- Exactly one inline script tag is allowed: the bundled report kit script marked with `data-report-kit-script`.
- No inline event handlers such as `onclick`/`onload`, and no `javascript:` URLs.
- No unresolved placeholders: `TODO`, `lorem`, `xxx`, `exemplo pendente`.
- All local images referenced by `src` exist.
- Every image has non-empty `alt`.
- No remote or `data:` images by default, including case-insensitive schemes, `img srcset`, and `source srcset`.
- Media copied by the generator must originate inside the JSON input directory.
- Media output names must be plain file names and must not escape the generated `assets/` directory.
- Internal hash links point to existing ids.
- Required preset sections are present.
- CSS tokens for core colors are present.

## Negative Coverage

The negative test script currently covers:

- assets trying to escape the JSON input directory;
- asset output names trying to escape the generated `assets/` directory;
- images without `alt`;
- remote or inline images, including uppercase `DATA:` and `srcset`;
- broken internal anchors;
- remote scripts/CDN patterns;
- extra inline scripts, event handlers, and `javascript:` URLs;
- unresolved placeholders.

## Browser QA

For important reports, open the HTML in a browser and confirm:

- Search filters visible content.
- Status filters work.
- Tabs and collapsibles operate.
- Kanban columns remain readable.
- Diagrams and screenshots render.
- Desktop and mobile widths have no obvious overlap.
