# Browser And Visual Evidence

Use this reference for UI, page, component, route, responsive, accessibility,
theme, branding, tenant, personalization, and visual changes.

## Required Browser Evidence

At minimum, collect:

- Changed route or component rendered in a real browser or project-native
  browser test.
- Primary success path.
- Relevant loading, empty, error, fallback, permission, and tenant/theme states.
- Desktop and mobile viewports when responsive behavior can be affected.
- Console errors, failed network requests, broken images, and obvious asset
  failures checked when a browser is available.
- Screenshots or traces for changed visual surfaces.

## Locator And Assertion Standard

Prefer semantic, user-facing selectors:

- roles and accessible names;
- labels and placeholder text;
- visible text when stable;
- test IDs only when the UI has no stable semantic handle.

Avoid long CSS/XPath chains except as a temporary diagnostic.

Prefer auto-waiting/web-first assertions over sleeps. Assert behavior, state, and
accessibility-relevant output, not only element existence.

## Visual Evidence Standard

For visual changes, use the strongest available path:

1. Project-native visual regression snapshots.
2. Playwright/Vitest browser screenshots with deterministic viewport, fonts,
   seeded data, and dynamic regions masked or styled out.
3. Browser-use or Chrome screenshots with a structured route/state checklist.
4. Static inspection only as a blocker fallback, never final proof.

Screenshots should be named or stored so a reviewer can identify route, viewport,
state, and timestamp/run.

## Accessibility Basics

When UI changed, check what is proportionate to risk:

- Keyboard path for interactive flows.
- Focus visibility and focus order for forms/dialogs/navigation.
- Accessible names for buttons, links, inputs, and icon-only controls.
- Error messages associated with fields when forms changed.
- Color contrast when visual styling changed.

Use axe or project-native accessibility tooling when already present. Do not add
new tooling inside unrelated work unless the user asked for gate hardening.

## Browser Task Template

```text
Apply gating-testability browser validation.

App/base URL:
Changed surfaces:
Required states:
Required viewports:
Auth/session/tenant requirements:

Steps:
1. Visit every changed route/surface.
2. Exercise the primary flow as a user.
3. Check loading, empty, error, fallback, and permission states when relevant.
4. Capture screenshots/traces for each required state and viewport.
5. Report console errors, failed requests, broken images, layout overlap,
   missing assets, accessibility blockers, and any nondeterminism.
6. Promote stable findings into deterministic tests when practical.
```

## Real-Browser Caveat

jsdom, happy-dom, and component-only simulation can be useful for fast feedback,
but they do not replace rendered browser proof for visual correctness or
browser-specific behavior.
