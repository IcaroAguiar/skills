# Scene worker brief

Fill one per scene. Send it to a cheap model running in parallel with the others.

```markdown
You write ONE scene of a demo video recorded with Playwright in the real app. Work only in <run>/scenes/<id>.ts.

## Your scene
<paste the scene block from the storyboard: promise, start state, actions, captions verbatim, end state, notes>

## Shared rules
<paste the "Shared" block of the storyboard>

## How
1. Read these source files first, to get exact accessible names and labels: <paths>. Use role/label locators (`getByRole`, `getByLabel`); avoid CSS classes and text that can change.
2. Copy <run>/scenes/_template.ts to <run>/scenes/<id>.ts and export `scene`. The individual runner imports this file directly; only the orchestrator assembles `scenes/index.ts`. Do not edit the index.
   - `prepare` reaches the START STATE from a fresh logged-in page. It runs only when the scene is tested alone.
   - `play` performs the actions, with the captions verbatim, and ends exactly at the END STATE.
   - Use the helpers:
     - `caption(text, holdMs?)`: show a caption and hold;
     - `show(locator, holdMs?)`: scroll, outline and hold;
     - `hold(ms)`;
     - `note(msg)`: record what the screen said, never personal data.
3. Test it alone with `<skill>/scripts/demo.sh scene <run> <id>`, then look at <run>/shots/<id>-end.png (Read the image). Iterate until it passes and the screenshot matches the end state.
4. Time box: about 15 minutes. If you are blocked, stop and report what blocks you.

## Hard rules
- Never read, print or copy <run>/.auth.json, credential files or tokens. Never log e-mails or personal data.
- Never click: <forbidden list>. Never write to the server unless the shared rules allow it.
- Do not edit the index, the application's source, the harness files, or other scenes.
- Do not work around app behavior. If something looks wrong, such as a console error, a failed request, an unexpected warning or count, or an element that does not respond, record it with `note(...)` and report it exactly. Do not guess the cause.
- Do not claim the app does something unless your end screenshot or report shows it.

## Report (short)
- Scene file path and status of the last `demo.sh scene` run.
- What the end screenshot shows (one line) and its path.
- Anomalies seen, verbatim from the report: notes, console, HTTP.
- Anything in the storyboard you could not do, and why.
```
