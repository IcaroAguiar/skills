# Taste Profile

The user's standing house style for every app they build: operational,
institutional, and research products first. Apply it by default. A repository's own design
document, an approved direction, or an explicit request overrides it for that
scope.

The style has two layers, and a screen needs both. **Discipline** is the floor
every screen meets. **Expression** is the choice that makes the screen belong
to its domain. Discipline without expression reads as generic; expression
without discipline reads as noise. The user has rejected both.

## Discipline (the "essential" floor)

- **Demarcated blocks.** Content sits in sections with a quiet tonal surface,
  a small icon tile, a title with its count ("Precisam de decisão · 3"), and an
  optional one-line description. Inside a section there is one level of frame.
  An item frame is allowed when the item is a movable or selectable object,
  such as a pipeline card or a passport; a decorative box inside a box is not.
- **Little per item.** Each item shows its identity, its state, and at most one
  supporting line that explains something. Dates, codes, addresses, owners,
  history, and secondary facts live in the detail panel.
- **One primary action per screen.** The decision the role exists to make is the
  one filled button. Other row actions are outline; the rest go to the detail
  panel or an overflow menu.
- **State always carries text.** At most one badge per item, omitted when the
  section already says the state. Color never carries meaning alone.
- **Page anatomy.** One page title, one sentence of description, metadata as
  plain text, actions on the right. No strip of metric cards above the content.
- **Language.** Sentence case, the product's own vocabulary, active voice. A
  jargon term (D0, CEUA) appears with a plain-language label.
- **Same idea on mobile.** At 390 px the composition adapts (columns stack,
  rails become indented trees, timelines go under the item) without horizontal
  scroll and without a separate card design.

## Expression (the choice for each screen)

- **Shape follows the work.** Pick the composition from the task, using
  [composition-models.md](composition-models.md). A framed table is right when
  the work is comparing many similar rows, and only then.
- **A domain metaphor.** Name what the screen is in the user's world before
  drawing it: an identity check is a passport, a stage process is a pipeline,
  an institution is an org chart, animal delivery is a production calendar.
- **Three strong precedents.** Before drawing, name three products that solved
  the same kind of work well and what each contributes. Domain tools count as
  much as famous apps.
- **One signature element per screen,** born from the domain; everything else
  stays quiet. Reuse a signature the product already has before inventing one.
- **Bold structure over decoration.** The user celebrates structural ideas, such
  as a rail that makes area switching one click, and rejects ornament.

## Verdict log

Evidence behind the rules. Add a dated entry when the user approves or rejects
a screen, and update the rules above when a pattern repeats.

| Date | Screen | Verdict | What it teaches |
| --- | --- | --- | --- |
| 2026-10-17 | Funding-call lists | Approved after three rejections | Discipline means demarcation and less per row; borderless minimalism and wordy rows were rejected |
| 2026-10-22 | Institution audit log as sentence rows, read/write split, override highlight | "Muito bom" | Precedents (GitHub audit log, Okta, CloudTrail, OWASP) plus domain language win; tables are right for comparison |
| 2026-10-22 | App shell: area switcher inside the sidebar; rail with counts and ⌘K | Approved; "ideia interessantíssima" | Structural boldness that fixes a real problem |
| 2026-10-22 | Home "Hoje": greeting plus one "Precisa de você" list | Preferred over "Áreas vivas" and "Retomar" | Daily usefulness and lightness beat visual density |
| 2026-10-23 | Researcher validation queue, organizations, lab pipeline, and animal requests redone as framed tables | Rejected: "área genérica com tabela e lista", "pouco criativo", "ruidoso" | One layout for every screen is the failure mode; it erased an existing passport metaphor |
| 2026-10-23 | Same screens redone as passport queue with checklist strip, org chart, stage pipeline, delivery timeline with the breeding cycle | "Excelente" / "Muito bom e criativo" | Task → metaphor → precedents → one signature element produces the house style; keep complexity in check |
