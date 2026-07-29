---
name: design-contract
description: Create or update a persistent repository design contract from an approved visual direction, generated image, screenshot, external reference, or existing screen redesign. Use after selecting a visual direction and before future GPT Image 2 generations, visual-web-builder, image-to-code, frontend implementation, or visual-fidelity work when visual language, layout, tokens, components, and preserve/change constraints need to be captured in docs/design/design.md.
---

# Design Contract

Use this skill before implementation. The image is evidence; `docs/design/design.md` is the decision record.

## Do Not Use For

- Implementing UI, fixing CSS, adding libraries, or creating commits.
- Replacing visual-fidelity. Visual diff validates later; it does not invent direction.
- Deciding the whole frontend architecture.
- Generating final visual variants before a contract exists.

## Required Workflow

1. Locate the contract. Prefer `docs/design/design.md`; if the repo already has a clearer design-doc convention, use it and say why.
2. Read any existing contract first. Preserve approved decisions; mark replaced decisions as `superseded` in the decision log.
3. Inspect only relevant repo surface: `AGENTS.md`, docs conventions, stack files, design tokens/theme/CSS variables, component primitives, visual tests, and the target screen/code if any.
4. Classify the work as `new-screen`, `new-visual-direction`, or `redesign`.
5. Inspect the actual visual source directly. If the reference is a file path, open or render it before extracting the contract.
6. For `redesign`, inspect the current code/screen first, then ask preserve/change questions with `request_user_input` if preserve/change is still unclear. Ask 1-3 short questions per call and continue in additional rounds only if needed:
   - What must remain functionally identical?
   - Which sections/components must be preserved?
   - What should change visually?
   - Which existing components/tokens must be reused?
   - Is the image a strict target or inspiration?
7. Extract visual details from the image/reference/screen: layout, grid, spacing, hierarchy, typography, colors, gradients, blur/glass, shadows, borders, radius, density, components, responsive behavior, and reusable patterns.
8. Resolve contract-affecting doubts by inspecting repo docs/assets/package files/components/routes/tokens/tests first. If still unresolved, ask the user with `request_user_input` in short rounds of 1-3 questions. If structured user input is unavailable, ask one concise plain-text question at a time.
9. Label every important detail as `exact`, `inferred`, `approximate`, or `unknown`. Never pretend pixel precision when the source does not support it.
10. Update permanent decisions, screen contracts, GPT Image 2 constraints, implementation constraints, temporary assumptions, production follow-ups, and library decision.
11. If suggesting a UI library, research current official docs first, compare at most 2 options, and recommend one or recommend adding nothing. Do not install packages.
12. Stop if the image conflicts with an approved contract decision. Report the conflict instead of choosing silently.
13. Produce a short implementation handoff with primary layout decisions, reusable component mapping, token mapping, forbidden visual additions, screenshot validation targets, Library Checkpoint, and any explicit temporary assumptions or production follow-ups.

## Image Inspection Rule

Before writing the contract, inspect the actual visual source. Do not rely only on file names, prior summaries, alt text, prompts, or user descriptions. If the image cannot be opened, rendered, or inspected, stop and ask for access. Capture visible layout relationships, approximate positions, typography hierarchy, color roles, component boundaries, motion cues, and uncertainty labels.

## Contract Rules

- Treat the contract as primary for future agents; treat images as secondary evidence.
- Do not create an `Open Questions` section. The contract is a decision record, not a backlog of doubts.
- Questions affecting the contract, implementation, library choice, assets, route behavior, copy, interaction, or visual direction must be resolved before writing the final contract.
- Resolve doubts as `Resolved by repository inspection`, `Resolved by user answer`, or `Explicit temporary assumption`. Use temporary assumptions only when the user authorizes a provisional decision; record why it is safe and when to revisit.
- Separate `Preserve`, `Change only`, and `Do not introduce` constraints for GPT Image 2 prompts.
- For future image edits, repeat critical invariants each iteration: identity, layout, geometry, brand elements, labels, contrast, and surrounding objects.
- For implementation, map visual decisions to existing tokens/components where possible before inventing new primitives.
- Prefer relative measurements and visible relationships over fake exact pixels. Use exact pixel values only when measured from an inspectable source, existing code, Figma, CSS, or screenshot tooling.
- If a new image introduces a visual pattern not present in the contract, classify it as `accepted new pattern`, `rejected drift`, or `needs user decision`. Do not silently merge new visual language into the contract.
- Mark as `unknown` only details that cannot be visually confirmed and do not block the current contract decision.

## Related Skills

- `gpt-image-2`: read the contract before generating/editing images; preserve listed invariants.
- `visual-web-builder`: read the contract before the image and before code.
- `visual-fidelity`: validate implementation against the contract and screenshots; do not create the direction.
- Implementation agents: follow the contract first, image second. If they disagree, stop and report.

## Library Discipline

Suggest a library only when it reduces complexity, improves accessibility, avoids fragile handmade UI, fits the proven repo stack, and has current source support. Typical candidates:

- `shadcn/ui` when the repo is React + Tailwind and open-code components fit the project.
- `Radix UI` when accessible unstyled primitives are needed under a custom design system.
- `React Aria` when complex accessibility, internationalization, or adaptive interactions matter.
- `Motion` only when the contract requires motion beyond CSS transitions.

Always include a final `Library Checkpoint`: `No new library recommended now`, `Use existing stack/components only`, `Recommend evaluating <library>`, or `Recommend adding <library> later, not now`. If no library is recommended, say why in 1-2 bullets.

## Output

Leave the user with:

- Contract path updated.
- Source references used.
- New or superseded decisions.
- Key GPT Image 2 constraints.
- Key implementation constraints.
- Library Checkpoint.
- Temporary assumptions and production follow-ups, if any.
