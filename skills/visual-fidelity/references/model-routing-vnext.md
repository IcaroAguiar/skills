# Model Routing vNext

Use a strong model as compiler and judge. Use a cheap model only as a local packet executor.

For browser validation, use browser-use first when the task is a web UI flow and a browser-use session is available or can be bootstrapped. Use computer-use only for native/desktop/browser-shell surfaces or after a documented browser-use blocker.

Strong model required for:

- visual source interpretation;
- Visual IR v2;
- ambiguity resolution;
- component-map and selector-map decisions;
- conflicts between fidelity and current behavior;
- final fraud-proof gate review.

Use high reasoning for dense pages, premium landing pages, editorial layouts, many images/overlays/textures, missing Figma, or previous shallow-analysis failure.

Cheap model allowed for:

- one packet from `packets/executor-task-<n>.json`;
- CSS/layout/token/radius/shadow/font-size changes;
- local markup restoration when target and copy are explicit;
- running validation;
- reporting blockers.

Cheap model forbidden from:

- seeing the image as open-ended source;
- creating initial IR;
- deciding pass/fail;
- broad redesign;
- component architecture decisions;
- editing unlisted files.
