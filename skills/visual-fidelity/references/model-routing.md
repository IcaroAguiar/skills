# Model Routing

Use the smallest model that can safely execute the current phase.

## High-Capability Model Required

- first-pass image/Figma interpretation;
- creating or correcting `visual-ir.json`;
- resolving ambiguous design intent;
- deciding execution mode;
- final visual/rubric judgment;
- conflicts between fidelity and existing product behavior.

## Cheap Model Allowed

- one local CSS/layout action from `action-queue.jsonl`;
- className/token/radius/shadow/spacing tweaks;
- local markup restoration when target component and copy are explicit;
- running deterministic validation commands;
- updating artifacts mechanically.

## Cheap Model Forbidden

- creating the initial IR from an image;
- deciding if final quality passes;
- broad redesign;
- component architecture decisions;
- interpreting ambiguous screenshots;
- editing unlisted files.

Default budget:

- high-capability model: IR + plan + final gate;
- cheap model: implementation actions, one at a time;
- no subagents unless parallel exploration is cheaper than one main-thread pass and the work is bounded.

