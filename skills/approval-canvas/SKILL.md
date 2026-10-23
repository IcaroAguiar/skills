---
name: approval-canvas
description: Build a static, interactive prototype ("canvas") with the project's real design-system components and fake data so the user approves a visual change before product code changes, then hand the approved canvas to an implementer as the spec. Two branches: redesigning an area screen by screen, and adding, moving or changing one block on an existing screen. Use when asked for "canvas de aprovação", "abra o canvas", "mockup para eu aprovar", "aprovar o visual antes de implementar", "redesign da área X", "reconstruir as telas reais no canvas" or "aplicar o novo design em toda a área".
---

# Approval canvas

The user approves **composition and copy** on real components before any product code changes. The canvas is a static Vite prototype that imports the repository's real design-system package, uses fake data and keeps all state in memory. Respond in the user's language.

You are the orchestrator: you own the design recipe, the redesign decision for every screen, the visual review and the decision log. Subagents inventory and build.

## Pick the branch first

Decide what the user is approving, then say it back in one sentence before building ("vou mostrar a home real e trocar só o card X pelo card Y; o resto fica igual").

- **Area redesign**: the user wants screens redesigned. Follow the whole workflow below.
- **Change on an existing screen**: the user asked for one block added, removed, moved or changed. The approval object is the **delta**; everything around it is the real product. Follow the next section and skip the recipe, inventory and per-screen redesign.

## Change on an existing screen

1. **Current (H0) is the real screen.** Render it from the product itself, in this order of preference: (a) the real route or page component mounted in the canvas with its data hooks or API module mocked; (b) the real app running from a snapshot or worktree against a mock API; (c) a screenshot of the running app with the new block composed on top, labelled as such. A hand-built reproduction of the surroundings is a different screen: the user ends up judging the imitation (wrapping, spacing, missing details) instead of the change.
2. **Proposal (H1) is H0 plus the requested change only.** Neighbouring blocks keep their real look, copy, order and spacing. Diff H0 against H1 at every captured width. The affected region is the block's old and new positions plus the reflow they cause (content shifting up or down). Inside it, displacement is expected; anywhere else, and for any change of copy or styling in a neighbour, a difference is a defect to fix before presenting.
3. **Variants.** When the user has not fixed the design, offer 2–3 variants of the block (placement, density, content) as `H1a`, `H1b`, `H1c`, each with one line on the trade-off. When they described the design, build that one.
4. **The new block matches its neighbours**: same card shape, heading style, spacing and icon set as the blocks beside it.
5. **Gate the block.** Run the `$design-direction` anti-generic gate on the changed block only, not on its surroundings. A block that fails goes back to step 3.
6. **Present** H0 and each variant side by side at 1440 and 390 px, plus the block's own states (loading, empty, error). Product files stay untouched until approval; a variant flag used to render the real app lives only in the snapshot or worktree.
7. **Hand off** the approved variant as in step 8 of the area workflow, and run the parity gate (step 9) before the PR.

## Area redesign

### Defaults the user has already set

- **Build the canvas in the repository by default.** A design tool (for example the Claude Design `/design` plugin) is fine when it actually works and the user wants it, but it is often unavailable (consent or login fails). Never block on it.
- Mock **every screen of the area**, including relevant states (empty, blocked, error, variants by role). Prose proposals are not a substitute.
- Give screens short stable IDs (`A1`, `P4`) so feedback can point at them. How the user approves is up to them: a message per screen, "tudo aprovado", or approve/reject controls inside the canvas. Typical outcomes: approved; rejected, keep the current screen; approved but **only real improvements** (the screen already follows the new design); approved with adjustments.
- Screens that are new and already in the target pattern get only pontual improvements.
- Screens you were not asked to redesign are rendered from the real product, not rebuilt.
- After approval, **implementation goes to a helper agent in an isolated worktree**, with the canvas and the decisions as the spec.

### Workflow

1. **Context.** Identify the current design pattern on the real default branch: design-system docs, the most recently redesigned area, any previous canvas README in the repo. If the repository has a canvas adapter (for example `docs/design/CANVAS.md`), read it first; it overrides the generic paths below. Make sure the UI source you build against is up to date: if the local checkout is behind the remote and is served or dirty, use a snapshot (`git archive origin/<default> | tar -x -C /tmp/<name>-snapshot`, then install dependencies there) instead of touching it.
2. **Inventory, in parallel.** Spawn read-only explorers: (a) screen by screen — route, purpose, data, actions with literal labels, components used, visible problems; for old screens also what each screen *meant* when it was built (commit history, docs, tests); (b) the real recipe and component APIs (what exists in the UI package, what is missing). Decide each screen's expression yourself with `$design-direction` (its step 4: work, composition, metaphor, three precedents, signature element, existing assets). Keep signatures the product already has, such as a distinctive card or diagram, unless the user rejects them.
3. **Skeleton.** Copy `references/template/` into the repo's design folder (for example `docs/design/<area>-canvas/`). Set the package names in `vite.config.mjs`, the `@source` path in `src/canvas.css`, the navigation in `src/main.tsx` and the fake data in `src/data.ts`. Encode the recipe as primitives in `src/kit.tsx` (Page, Section, List, Toolbar, Status, RowAction, Empty, Field, Facts, DetailSheet). The kit carries the discipline; each screen's composition comes from its expression, so `List` is one primitive among others, used where the work is comparing records. **Write one reference screen yourself** (pattern in `src/screens/example.tsx`) and capture it before delegating. States are reachable through the hash (`#P4~rascunho`); dark theme through `?tema=escuro`. **The canvas starts from the product's baseline**: `src/canvas.css` imports the app's entry stylesheet (the UI package styles plus the app's global overrides) and `index.html` carries the app's font links, so fonts and global rules match. **The canvas never restyles the UI package**: `src/canvas.css` holds only the canvas frame, and kit primitives pass props to the package's own recipe pieces. A look the package cannot produce (a lighter divider, another header style, a font) is a change to the UI package: make it there, or list it in the README under "Mudanças no pacote de UI" and show it to the user. `node check-fidelity.mjs` must pass. This check covers CSS and embedded `<style>`; the parity gate covers the remaining visual differences, including `className` tweaks in `kit.tsx`.
4. **Delegate screen groups** to parallel implementers with `references/implementer-brief.md`: one file per implementer, isolated `OUT`/`PORT`/`SHOTS`, the recipe and each screen's expression written out. Real components only, no new variants, no hard-coded colors, the project's icon set, fake data, Dialogs/Sheets/toasts working in memory.
5. **Capture and review.** `THEMES=claro,escuro node shoot.mjs [IDs]` captures every combination of screen, state and requested theme at 1440 and 390 px and reports JS errors and horizontal overflow. Put the product’s default theme first (`THEMES=escuro,claro` for a dark-default product); `THEMES` defaults to `claro`. Filenames stay `<ID>[-<state>][-escuro]-<width>.png`. Legacy `DARK=IDs` remains supported when `THEMES` is unset and now adds dark captures for every state of those screens; explicit `THEMES` takes precedence. Capture in the **product's default theme** (read it from the app's theme provider) and in the other theme when the product has one: the user approves the look they will meet. A clean run is necessary, not sufficient: **open the images yourself** and fix truncation, duplication, weak hierarchy and inconsistency with the reference screen, then run the `$design-direction` anti-generic gate on every screen.
6. **Present.** Build a gallery from `references/gallery-template.html` with 1440 and 390 thumbnails per screen and 2–3 bullets on what changes and why; render it inline when the host offers an HTML render tool, otherwise share the file. Lead with open product questions, then the "Mudanças no pacote de UI" list: the user approves those changes explicitly, because they reach every screen that uses the component. Tell the user how to browse the canvas live (`vite preview` on 127.0.0.1; offer a reachable URL only with permission).
7. **Log decisions** in the canvas README (`references/rounds-readme-template.md`): one table per round, cross-cutting decisions, open questions, limits. Iterate only on reopened screens.
8. **Hand off.** Give the approved canvas and decisions to a helper agent in a worktree to implement in the real app, with `references/handoff-brief.md` filled in. Rejected screens stay untouched; "only real improvements" screens get a diff-driven change against production. Reusable primitives belong in the shared UI package, not duplicated per app.
9. **Parity gate before the PR.** Capture the running app in the same theme, shell, widths and states as the canvas, run `node pairs.mjs`, and open every pair yourself. Every difference other than data is fixed or goes to the user as a deviation, with both images, before review and merge. Approval of the canvas is not approval of a substitution the implementer made. The PR's before/after evidence uses these pairs, never captures with a different theme or shell.

### Quality checklist

- Built against the up-to-date UI package, not a stale copy.
- One label per action; menu, header and page title use the same name; sentence case.
- Status once per row and always with text (never color alone); no nested cards or boxed empty states; a collection keeps the same idea at every width, with no separate mobile card design, and is a table only where the work is comparing records.
- Transient feedback is a toast; blocking states are a section with one sentence and the action that resolves it.
- Every declared state is reachable; every action does something visible.
- `shoot.mjs` reports 0 JS errors and 0 overflow at 1440 and 390, and you looked at the images.
- `check-fidelity.mjs` passes: the canvas shows only what the UI package can render; anything else is in "Mudanças no pacote de UI".
- The canvas imports the app's entry stylesheet and font links; the captures show the product's fonts, not a system fallback.
- Captures use the product's default theme (and the other theme, when there is one).
- After implementation, every `pairs.mjs` pair was opened and each non-data difference is fixed or approved by the user as a deviation.
- Fake data only: no secrets, no real people, no customer data.
- The README states the limits: the canvas proves composition and copy, not persistence, permissions, audit or transactions; Dialogs and Sheets are not in automatic captures.
- No watcher or preview left running; captures and builds stay out of Git.

## Repository adapters

Project-specific paths, recipes and governance live in the project, not here. Typical adapter content: where canvases live, the design recipe source, package names, which app's `node_modules` provide Vite, heavy-command wrappers, worktree and branch rules, and served-environment constraints. If no adapter exists and the area will be redesigned again, offer to write one next to the canvases.
