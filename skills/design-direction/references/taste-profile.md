# Taste Profile

A set of cross-product design rules, a starting house style to adapt to your own taste. Design inside the product's established language (its design document and neighbour screens); these rules judge the result and do not shape a screen on their own. A repository design document, an approved direction or an explicit request wins for its scope. Where two rules conflict, the more specific one wins.

## Layout and density

- Shape follows the work; a framed table only when the work is comparing many similar records.
- Screens that sit side by side get distinct shapes; one layout repeated on every screen is the failure mode.
- Demarcated sections: a title with its count ("Precisam de decisão · 3"), an optional one-line description, one level of frame inside; an item is framed only when it is movable or selectable. One frame with internal dividers beats separate bordered cards (later wins over the earlier tonal surface with icon tile).
- Each item shows its identity, its state and at most one supporting line; dates, codes, owners and history live in the detail panel.
- Page anatomy: one title, one sentence of description, metadata as plain text, actions on the right, no strip of metric cards above the content.
- A page title carries structural weight (band, module icon, rule, spacing), not only a bigger font; a sticky header is the same element compacting, never a second title.
- A new page keeps its neighbours' exact frame and top hierarchy, checked beside one at 1440, 1920 and 2560 px; a mismatch is a defect, never "legacy".
- Restraint: each added helper (shortcut chips, nav arrows, side lists, repeated counts) erodes whitespace and cohesion; one surface level, wide margins, detail on demand.
- A record screen shows the live system around the record (health from other modules, its place in the chain, its history) with one hero block carrying the answer.
- A routine screen's hero is the day answered (yesterday in one sentence, today's timeline with a "now" line) over a navigable period ruler; a money screen answers with a place in time (the month's real-plus-projected curve).
- On an evidence screen the evidence is the hero, in its module's own form and name, full size; counts are captions. Summarise for the reader (would an auditor get it at a glance?), never dump source data in nested boxes.
- Density is a product-wide proportion, judged live at the real monitor size, never from downscaled composites; tables are the first suspect.
- A redesign changes structure; polishing, re-tinting or reordering the same blocks is not one, and each move fixes a named problem shown beside the current screen.
- Collapse an old form-heavy flow onto the screen that already holds the work; a flow is judged by the fields and steps removed.
- Bold structure over decoration: a structural idea that fixes a real problem wins; "um pouco fora da caixinha" means structural boldness, not a themed costume.
- Shell navigation stays neutral across clients; one client's structure lives in page content.
- A mode that changes the whole shell has one clear frame and one place for its context (unit, period).

## Colour and emphasis

- Emphasis is a neutral surface lift, a stronger weight and, when needed, a text label ("Sua vez"); accent side stripes and tinted outlines on items or callouts read as AI-made. A callout is an icon plus text; focus rings stay.
- Sheets and bars carry no decorative accent stripe.
- State always carries text; colour alone never carries meaning. At most one badge per item, omitted when the section already says the state.
- One filled action per screen, on the decision the role exists to make; other actions are outline or in the detail panel or overflow; a read-only state may have none.
- Identity comes from the product's own assets and a domain colour, not from a reference's structure tinted with the accent.
- A brand mark sits directly on the surface in the variant that fits it, never boxed in a contrasting chip.

## Typography

- Sentence case, active voice, the product's own neutral vocabulary (never one client's jargon or a developer field name); a jargon term (an internal code or acronym) carries its plain label where it appears.
- Proof annotations are body-size, with the problem in words beside the piece, not tiny mono captions or a dashed border; monospace is for codes, data and measures.
- Fonts are part of an approved design; a fallback font reads as a different design.

## Components and controls

- Mature component libraries and professional assets over hand-drawn parts.
- Refining a component means redesigning it from a named market reference shown beside it, not shrinking its height and radius.
- Compacting keeps the product's shape language and signatures (compact them, never flatten them), but a house shape must not become a cage.
- Header bars stay one row: at most 3 visible actions on desktop (one filled, one secondary, `···`), 2 at ≤ 640 px; no text-only ghost buttons beside filled ones.
- Header controls share one spacing; small misalignments are defects, found in zoomed crops before showing.
- Feedback is a well-made toast (Sonner on the web): icon, what happened, what next, an action when there is one ("Desfazer"); one per subject.
- A warning that blocks the primary action is a toast, a prominent block beside its cause, and the reason next to the blocked action.
- A secondary sign-in method is a quiet glyph and muted label under the primary action, not a second full-width button.
- A suggested money action still passes through a human edit step; no batch approval.
- A domain glyph (such as a category silhouette) replaces generic initial circles without becoming the hero.
- A row says first what it is and where it came from; a recap has a detailed view that loses nothing.

## Motion

- "Duro e estático" is about behaviour: answer with skeletons, stagger, list-to-record crossfades, sheets and empty states the user can play, not stills.
- Direct manipulation moves with springs (a sliding mode pill, a draggable deck).
- Glow, blur and gradients never stand in for composition.

## Tables and forms

- Forms are named sections with organised fields; a finished section may collapse to a summary with "Editar".
- A field is as wide as its value (a date, a CPF) and a button as its label; full width only on phones and for free text.
- Form errors: one toast naming the fields ("Revise 2 campos: Nome e E-mail"), focus on the first, borders marked; a message under a field only when the reason is not obvious ("CPF inválido") (later wins over the earlier per-field errors).
- Ask for the fewest fields up front; the rest go under "Mais detalhes (opcional)".
- Form screens are centred and keep the product's content frame.
- Generic framed tables are the fallback, not a default; tables stay thin.

## Mobile

- At 390 px the same idea adapts (columns stack, rails become indented trees, timelines go under the item), with no horizontal scroll and no separate card design.
- Phones get families designed for phones, one per platform (Apple's on iOS, Material 3 on Android), not shadcn ports; kits of one family are one option.
- Judge a phone screen on the real tenant, with its real brand and content.
- A hero treatment belongs to one element; browsing lists keep their compact size.
- A crop into another ratio keeps the face and the title in frame.
- On phones the toast sits above the tab and action bars.

## What reads as AI-made

- Equal cards of icon, heading and text as the page structure, or a spreadsheet typed into equal boxes.
- Big counts as the headline where the content should be.
- A list and detail in framed panels with a plain textarea, until it gets a signature from the domain.
- No brand mark, no real app shell, or a re-drawn shell.
- A reference copied and tinted with the accent.
- A themed costume (git log, package.json, periodic table) standing in for an idea.
