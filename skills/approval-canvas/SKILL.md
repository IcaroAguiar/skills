---
name: approval-canvas
description: Rebuild the real screens of an app area as a static, interactive prototype ("canvas") that uses the project's real design-system components and fake data, so the user can approve or reject the redesign before product code changes; then hand the approved canvas to an implementer as the spec. Use when asked for "canvas de aprovação", "abra o canvas", "mockup de cada tela para eu aprovar", "redesign da área X", "reconstruir as telas reais no canvas", "aplicar o novo design em toda a área", or to redesign an old area screen by screen. Not for one-off screen tweaks.
---

# Approval canvas

The user approves **composition and copy** on real components before any product code changes. The canvas is a static Vite prototype that imports the repository's real design-system package, uses fake data and keeps all state in memory. Respond in the user's language.

You are the orchestrator: you own the design recipe, the redesign decision for every screen, the visual review and the decision log. Subagents inventory and build.

## Defaults the user has already set

- **Build the canvas in the repository by default.** A design tool (for example the Claude Design `/design` plugin) is fine when it actually works and the user wants it, but it is often unavailable (consent or login fails). Never block on it.
- Mock **every screen of the area**, including relevant states (empty, blocked, error, variants by role). Prose proposals are not a substitute.
- Give screens short stable IDs (`A1`, `P4`) so feedback can point at them. How the user approves is up to them: a message per screen, "tudo aprovado", or approve/reject controls inside the canvas. Typical outcomes: approved; rejected, keep the current screen; approved but **only real improvements** (the screen already follows the new design); approved with adjustments.
- Screens that are new and already in the target pattern get only pontual improvements.
- After approval, **implementation goes to a helper agent in an isolated worktree**, with the canvas and the decisions as the spec.

## Workflow

1. **Context.** Identify the current design pattern on the real default branch: design-system docs, the most recently redesigned area, any previous canvas README in the repo. If the repository has a canvas adapter (for example `docs/design/CANVAS.md`), read it first; it overrides the generic paths below. Make sure the UI source you build against is up to date: if the local checkout is behind the remote and is served or dirty, use a snapshot (`git archive origin/<default> | tar -x -C /tmp/<name>-snapshot`, then install dependencies there) instead of touching it.
2. **Inventory, in parallel.** Spawn read-only explorers: (a) screen by screen — route, purpose, data, actions with literal labels, components used, visible problems; for old screens also what each screen *meant* when it was built (commit history, docs, tests); (b) the real recipe and component APIs (what exists in the UI package, what is missing). Decide the redesign per screen yourself.
3. **Skeleton.** Copy `references/template/` into the repo's design folder (for example `docs/design/<area>-canvas/`). Set the package names in `vite.config.mjs`, the `@source` path in `src/canvas.css`, the navigation in `src/main.tsx` and the fake data in `src/data.ts`. Encode the recipe as primitives in `src/kit.tsx` (Page, Section, List, Toolbar, Status, RowAction, Empty, Field, Facts, DetailSheet). **Write one reference screen yourself** (pattern in `src/screens/example.tsx`) and capture it before delegating. States are reachable through the hash (`#P4~rascunho`); dark theme through `?tema=escuro`.
4. **Delegate screen groups** to parallel implementers with `references/implementer-brief.md`: one file per implementer, isolated `OUT`/`PORT`/`SHOTS`, the recipe and your per-screen decisions. Real components only, no new variants, no hard-coded colors, the project's icon set, fake data, Dialogs/Sheets/toasts working in memory.
5. **Capture and review.** `node shoot.mjs [IDs]` captures every screen and state at 1440 and 390 px and reports JS errors and horizontal overflow. A clean run is necessary, not sufficient: **open the images yourself** and fix truncation, duplication, weak hierarchy and inconsistency with the reference screen.
6. **Present.** Build a gallery from `references/gallery-template.html` with 1440 and 390 thumbnails per screen and 2–3 bullets on what changes and why; render it inline when the host offers an HTML render tool, otherwise share the file. Lead with open product questions. Tell the user how to browse the canvas live (`vite preview` on 127.0.0.1; offer a reachable URL only with permission).
7. **Log decisions** in the canvas README (`references/rounds-readme-template.md`): one table per round, cross-cutting decisions, open questions, limits. Iterate only on reopened screens.
8. **Hand off.** Give the approved canvas and decisions to a helper agent in a worktree to implement in the real app. Rejected screens stay untouched; "only real improvements" screens get a diff-driven change against production. Reusable primitives belong in the shared UI package, not duplicated per app.

## Quality checklist

- Built against the up-to-date UI package, not a stale copy.
- One label per action; menu, header and page title use the same name; sentence case.
- Status once per row and always with text (never color alone); no nested cards or boxed empty states; one table shape at every width (secondary columns move under the title on narrow screens).
- Transient feedback is a toast; blocking states are a section with one sentence and the action that resolves it.
- Every declared state is reachable; every action does something visible.
- `shoot.mjs` reports 0 JS errors and 0 overflow at 1440 and 390, and you looked at the images.
- Fake data only: no secrets, no real people, no customer data.
- The README states the limits: the canvas proves composition and copy, not persistence, permissions, audit or transactions; Dialogs and Sheets are not in automatic captures.
- No watcher or preview left running; captures and builds stay out of Git.

## Repository adapters

Project-specific paths, recipes and governance live in the project, not here. Typical adapter content: where canvases live, the design recipe source, package names, which app's `node_modules` provide Vite, heavy-command wrappers, worktree and branch rules, and served-environment constraints. If no adapter exists and the area will be redesigned again, offer to write one next to the canvases.
