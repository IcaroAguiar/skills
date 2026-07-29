---
name: presentation-pdf-builder
description: Create polished presentation-style PDFs from screenshots, metrics, feature notes, migration results, product updates, onboarding material, handoff evidence, or operational documentation. Use when the user wants a visual PDF that explains what changed, why it matters, how to use it, how to validate it, and what to do next for any target audience.
---

# Presentation PDF Builder

Build clear, polished, evidence-based PDFs for product, business, onboarding, migration, feature announcement, training, handoff, release, and executive communication use cases.

## Core Principle

Do not just write a PDF. First decide:

- who will read it;
- what they need to understand;
- what they need to trust;
- what they need to do next;
- how visual, executive, friendly, instructional, operational, or technical the document should feel.

Adapt structure, language, density, screenshots, and CTAs to the target audience and context.

## Intake

Ask only for missing information that materially changes the PDF. If enough context exists, proceed.

Clarify when needed:

- **Audience:** client, executive, internal team, support, sales, students, operators, technical team.
- **Purpose:** understand, approve, start using, test, announce, hand off, train, decide.
- **Language and tone:** PT-BR or English; executive, friendly, premium, instructional, operational, technical-light, formal, sales-oriented.
- **Visual direction:** brand/product design to follow; corporate, SaaS, enterprise, training guide, release note, onboarding, or pitch deck.
- **Evidence:** screenshots, metrics, before/after, user flows, links, repo files, outputs, assets to capture.
- **Sensitivity:** secrets, credentials, private data, internal IDs, unsupported claims, or redaction needs.

## Content Model

Choose the closest model and adapt it.

### Feature Announcement

- What is new
- Why it matters
- Who benefits
- How to use it
- Annotated screenshots
- Rollout notes
- CTA or next step

### Onboarding Guide

- Welcome/context
- What is ready
- First access
- Key workflows
- Examples
- Troubleshooting
- Checklist

### Migration or Handoff Summary

- What moved or changed
- What is ready
- What needs review
- Human-readable tables
- Operational next steps
- Support guidance

### Executive Report

- Summary first
- Key metrics
- Decisions needed
- Risks/blockers
- Timeline/next actions
- Minimal screenshots

### Training or How-To

- Goal
- Step-by-step instructions
- Annotated screenshots
- Common mistakes
- Practice checklist
- Support path

## Layout Rules

- Use strong hierarchy: cover, section headers, short paragraphs, tables, screenshots, checklists.
- Avoid dashboard clutter unless the PDF is explicitly a dashboard/report.
- Avoid too many small cards and never nest cards inside cards.
- Use tables for repeated data.
- Use cards only for important grouped ideas.
- Keep page density readable.
- Prefer fewer, better screenshots over many weak screenshots.
- Do not split screenshots awkwardly across pages.
- Avoid accidental blank pages.
- Avoid oversized callout boxes.
- Avoid decorative elements that do not improve understanding.

## Screenshot and Annotation Rules

- Prefer real screenshots.
- Capture the relevant UI area, not unnecessary full-screen clutter.
- Use consistent screenshot dimensions when possible.
- For precise HTML-to-PDF annotations, prefer inline SVG overlays with `viewBox` equal to the screenshot's native pixel dimensions. Put the screenshot in an SVG `<image>` and draw marks, arrows, and callouts in that same pixel coordinate system.
- Do not rely on CSS percentage-positioned overlays for final annotated screenshots unless the result is intentionally approximate.
- Do not position annotations over a generic screenshot container using `object-fit: contain`; letterboxing changes the rendered image box and causes PDF misalignment.
- For clean exact marking, prefer small target pins/crosshairs plus short leader lines aimed at the exact UI control, label, row, or value. Use large translucent rectangles only when the annotation intentionally refers to a full region, not a specific element.
- The center of each target pin must land on the intended UI element in the rendered PDF page image. If a reader could plausibly interpret the target as another adjacent element, adjust the native SVG coordinates and rerender.
- Keep reusable annotation styling in CSS classes. Keep geometry in the SVG's native coordinates or CSS variables, not scattered HTML layout percentages.
- If absolute precision matters more than editability, precompose the annotated SVG into a high-resolution PNG and embed that final image in the PDF.
- Keep arrows short and pointed at the actual UI element.
- Do not cover the element being explained.
- Use max 3-4 annotations per screenshot.
- Use consistent annotation color, stroke, font size, and callout style.
- Use numbered callouts for sequences.
- Use labels for explanation.
- Use highlight boxes for fields/buttons when arrows are not enough.
- Render PDF pages as images and inspect annotation accuracy before final delivery.

## Writing Rules

- Lead with what matters to the reader.
- Translate technical facts into user impact.
- Explain what changed, why it matters, how to use it, how to test it, and what to do next.
- Use plain language unless the audience is technical.
- Do not expose raw JSON, logs, stack traces, internal enums, IDs, or implementation details unless appropriate for the audience.
- Do not blame users for missing or inconsistent data.
- State limitations calmly and actionably.

## Design Adaptation

Before styling, inspect or infer the target design pattern:

- Brand colors, logo, typography, product UI style.
- Audience expectation: corporate, premium, friendly, operational, technical, sales, training.
- Existing screenshots: match their tone instead of fighting them.
- For executive PDFs: reduce visual noise, use fewer metrics, stronger summary.
- For user guides: prioritize steps, screenshots, examples, and support copy.
- For feature announcements: emphasize value, before/after, what is new, and CTA.
- For internal technical handoffs: allow more detail, but still structure it cleanly.

## Safety Rules

Never include secrets, real passwords, private keys, tokens, cookies, internal credentials, unsupported claims, or sensitive personal data unless explicitly necessary and safe for the intended audience.

If sensitive values are needed, use placeholders and explain the secure handoff path.

## Validation Checklist

Before final delivery:

- PDF exports successfully.
- Page count is expected.
- A4 or requested size is correct.
- No accidental blank pages.
- No cut-off text.
- No overlapping elements.
- Screenshots are readable.
- Arrows/callouts point correctly.
- Annotated screenshots were checked from rendered PDF pages, not only from browser/HTML preview.
- Precise overlays use native screenshot coordinates via SVG `viewBox`, or a precomposed annotated image.
- Exact annotations use small target pins/crosshairs whose centers land on the intended element in the rendered PDF output.
- No final annotation depends on unaccounted letterboxing from `object-fit: contain` or percentage coordinates over a resized container.
- Cards are not oversized.
- Tables fit the page.
- Text matches requested language and audience.
- No forbidden technical/debug terms remain.
- No secrets or unsafe credentials are present.
- Missing screenshots or auth blockers are reported.

## Final Response

Return:

- PDF path.
- Source file path.
- Screenshots/assets path when relevant.
- What changed.
- Validation performed.
- Any blockers or residual risk.
