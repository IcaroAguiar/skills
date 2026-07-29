# Visual System

The visual language is **Research Notebook**, the approved option C from the style reference board: calm, centered, modular, readable, evidence-first, and neutral enough to work across projects without inheriting any single brand.

## Principles

- Use a cool off-white notebook background, white modular surfaces, thin cool borders, and restrained shadows.
- Use high-contrast serif headings for document hierarchy, system sans for reading, and system mono only for metadata, labels, and code.
- Use teal as the main accent, blue for informational structure, green for success, amber for pending states, red for blockers, and violet only for secondary diagrams.
- Keep the opening area compact like a notebook or dashboard header. Avoid large hero sections; metrics and modules should appear high in the first viewport.
- Use compact top navigation by default. Do not reserve a lateral rail for navigation unless a specific report explicitly requires it.
- Center the main content in a controlled max-width and use a two-column modular report grid on desktop when sections are short enough to scan side by side.
- Build each section with the same notebook grammar: small mono eyebrow, restrained serif title, thin divider, compact body rhythm, and contextual grids that never force three cramped cards inside narrow panels.
- Treat timelines, evidence tables, risk cards, and decision cards as dense operational modules: short labels, small status pills, muted body copy, and consistent internal padding.
- Do not use remote fonts, CDNs, decorative blobs, glassmorphism, neon gradients, brand-specific palettes, or generic SaaS hero styling.
- Components should scan well in a long report, work under `file://`, and print reasonably.
- Keep cards modular and readable; use them for evidence, metrics, kanban, screenshots, rules, decisions, risks, and diagrams.
- Avoid poster-like heroes, oversized intro blocks, nested cards, and heavy decorative backgrounds.

## Tokens

The CSS kit exposes tokens such as:

- `--report-bg`, `--report-paper`, `--report-paper-soft`, `--report-paper-tint`, `--report-ink`, `--report-muted`
- `--report-line`, `--report-line-strong`, `--report-accent`, `--report-accent-soft`
- `--report-green`, `--report-amber`, `--report-red`, `--report-blue`, `--report-violet`
- `--report-radius`, `--report-shadow`

Projects may override tokens in a small inline block, but should not replace the component CSS.

## Layout

Reports use:

- Sticky topbar with local search/filter controls.
- Notebook-style hero with report summary and a compact metadata panel.
- Left or top table of contents depending on viewport.
- Main content stream with full-width sections and component grids inside sections.
- Responsive collapse below tablet width with no horizontal page overflow.
