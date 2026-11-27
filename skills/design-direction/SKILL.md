---
name: design-direction
description: >-
  Judge or set visual direction without editing code, and record a person's taste: "avalie/critique esse design", "o que acha dessa tela ou screenshot", "que direção visual seguir", "gostei desse estilo". Holds a house style. UI changes in code: impeccable.
---

# Design Direction

## Read the product, then the taste

1. Read the product's established design: its design document, the repository's `AGENTS.md`, and the neighbour screens of the same menu (page header, filters bar, cards, tables, buttons). The new work lives inside that language.
2. Read [taste-profile.md](references/taste-profile.md), the cross-product rules, and use it as the judge of the result. A repository design document, an approved direction or an explicit request wins for its scope.
3. When revisiting a screen that already has verdicts, read the verdict log the user keeps (if any) to see what was approved or rejected there.

## Judge

- Turn a vague complaint ("sem vida", "genérico", "cara de IA") into defects named on the current screen, each tied to what the person does there, before proposing anything.
- Find references yourself and bring variety: the user reacts to options and never researches them. Name what each reference contributes to this work, and translate its function, not its look.
- For a new screen or a redesign, metaphor, precedents and a signature element are prompts worth trying when they serve the work; the product's own language comes first.
- Keep evidence honest. A screenshot proves static composition; source code proves intent; a claim you could not check is stated as unverified. A before/after uses a real baseline captured in the same state, viewport, theme and data, never a reconstructed "before".

## Hand off

- Anything the user must approve before it is built goes to `design-canvas`, which owns the concepts, the number of directions and how they are shown.
- Edits to the interface in code go to `impeccable`.
- A review answers with the defects ranked by how much they hurt the task, each with its fix.

## Record a verdict

When the user approves or rejects a screen, a direction or a library and the verdict says something about their taste, append one dated line to the user's verdict log (outside the repository) with the user's words and the lesson. A plain "aprovo" needs no line. A verdict becomes a rule in `taste-profile.md` only in a retrospective with the user, and only when it says something the rules do not.
