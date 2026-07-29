# Redesign Rebuild Workflow

Use only when the user explicitly permits a full rebuild, replacement, total redesign, or says the current visual implementation can be ignored.

Execution mode: `redesign-rebuild`.

## Survival Map

Before replacing markup, list product contracts that must survive:

- routes and route params;
- props and public component API;
- data loading and mutations;
- forms and validation;
- auth/permission behavior;
- links and conversion targets;
- analytics/tracking;
- accessibility requirements;
- localization/content source of truth;
- tests that cover existing behavior.

## Rebuild Rules

- The current visual structure can be replaced.
- Product contracts cannot be silently removed.
- Keep the rebuild bounded to the requested route/component.
- If a contract is impossible to preserve, stop and report the conflict.
- The final audit still uses Visual IR, DOM landmarks, screenshots, rubric, and closeout statuses.

## What To Preserve By Default

Even in rebuild mode, preserve:

- real copy when it is product/legal/conversion critical;
- actual submit handlers and hrefs;
- accessible names and labels;
- responsive support expected by the product;
- SEO/meta semantics when touching public pages.

