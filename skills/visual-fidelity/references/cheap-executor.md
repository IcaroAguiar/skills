# Cheap Executor Packet v2

Cheaper models/executors may implement only after these artifacts exist:

- `.visual-fidelity/visual-ir.json`
- `.visual-fidelity/visual-rubric.json`
- `.visual-fidelity/visual-plan.md`
- `.visual-fidelity/state.md`
- explicit allowed file list;
- exact validation command.

## Executor Prompt

```text
You are a bounded implementation executor.
Do not reinterpret the reference image.
Do not declare visual success.
Do not change files outside the allowed list.
Do not remove functional behavior.
Read .visual-fidelity/visual-ir.json, .visual-fidelity/visual-plan.md, and .visual-fidelity/state.md.
Implement only the next priority adjustment.
Run the exact validation command if available.
Return: changed files, command output, screenshot paths, and unresolved blockers.
```

## Primary Agent Verification

The primary agent must verify:

- git diff;
- actual changed files;
- files changed are within allowed list;
- screenshot artifacts exist;
- DOM landmark report exists;
- visual-rubric report exists;
- `state.md` was updated;
- no functional behavior was removed.

The cheap executor is never the final judge. It cannot claim `done`, `pixel-perfect`, `ready`, or `visually matched`.

## Good Cheap Tasks

- CSS/layout adjustment for one component;
- spacing/radius/type/color token changes;
- image crop/object-position tweaks;
- mechanical component wiring from a plan;
- Playwright test fixes that do not require visual judgment.

## Bad Cheap Tasks

- interpreting ambiguous screenshots;
- choosing preserve vs rebuild;
- deciding whether visual fidelity is acceptable;
- broad refactors;
- product contract tradeoffs;
- final audit.

