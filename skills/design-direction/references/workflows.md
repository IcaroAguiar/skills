# Branch Workflows

## Create

1. Define the objective, users, primary task, constraints, product profile, and surface mode.
2. Establish the context lock.
3. Map content, actions, states, scopes, collections, dependencies, and priorities.
4. Define information architecture and flow. Use sequence only where dependency is real.
5. Choose PageHeader, layout grammar, surfaces, representation, and table mode by function.
6. Plan accessibility, responsive behavior, and applicable states.
   For native mobile, also define task topology, navigation, scroll ownership,
   persistent chrome, keyboard behavior, adaptation, interruption recovery,
   search scope, feedback escalation, and platform-specific behavior.
   When refinement or premium quality is requested, define the dominant
   composition, rhythm map, type roles, material roles, component rationale,
   and motion/feedback plan before styling.
7. Produce the requested structure, visual, or implementation.
8. Inventory every rendered frame and remove, merge, or justify each one.
9. Run the full evaluation against rendered evidence when available.

Mark assumptions and placeholders. Preserve the user's language and domain vocabulary.

**Complete when:** every applicable evaluation criterion passes, every unsupported check is `N/V`, each visual choice has a functional or contextual rationale, and no premium claim exceeds the available craft or runtime evidence.

## Review

1. Record the artifact and evidence boundary.
2. Inspect static evidence at legible resolution; inventory regions, content, controls, states, and surfaces.
3. Establish the context lock.
4. Apply every loaded topic module and preserve positive patterns.
   For native mobile, compare the visual artifact with the runtime accessibility
   tree and platform behavior whenever those evidence sources are available;
   distinguish shared product semantics from platform-shaped interaction.
   When premium or refinement is in scope, score functional quality and mobile
   craft separately; do not let a passing foundation score imply premium craft.
5. Separate defects, risks, preferences, and opportunities.
6. Prioritize findings by user impact.
7. Score only observable categories and apply verdict limiters.
8. Deliver evidence, verdict, findings, recommendations, and residual risk.

Each finding must name the region, evidence, impact, recommendation, and priority.

**Complete when:** every observable property was assessed, unsupported behavior is `N/V`, every finding has an alternative, and the verdict obeys all limiters.

If the primary artifact cannot be inspected, return `No verdict — evidence blocked`, the technical cause, and the evidence needed.

## Redesign

1. Freeze the context lock, requirements, content, actions, and states.
2. Define the composition or interaction problem.
3. Remove functionless framing, scale, and decoration.
4. Restore PageHeader identity, content grouping, action geography, and state hierarchy.
5. Choose a layout grammar that matches relationships and surface mode.
6. Describe behavior, states, and responsive reorganization.
   On mobile, describe presentation changes across compact and expanded windows
   instead of scaling one handset artboard.
7. For mobile refinement, replace component stacking with a dominant
   composition and specify rhythm, typography, material, component, motion,
   and feedback decisions.
8. Produce a complete structure and an ASCII wireframe only when spatial relationships need it.
9. Map each change to the finding it resolves.
10. Apply the same evaluation used in review.

**Complete when:** every proposed change resolves a finding, every preserved
function remains available, the proposed surface passes the same criteria that
diagnosed it, and authorization status is explicit.

## Implement

1. Complete the diagnosis before editing.
2. Inspect the stack, design system, shared components, and user-owned changes.
3. Map every changed control to an existing product primitive or a justified new variant.
4. Make the smallest coherent implementation of the redesign.
5. Run project checks.
6. Validate the rendered interface at relevant widths and input methods.
7. Exercise the primary action, state transitions, collection continuity, focus, keyboard flow, and custom controls.
   If an ARIA composite role such as `listbox`, `tablist`, `grid`, or
   `combobox` is introduced, verify its complete keyboard and focus contract;
   otherwise use simpler native semantics.
8. Capture decisive visual evidence.
9. Report changed, verified, unverified, and residual-risk surfaces.
10. When the workflow is interactive, ask whether to accept, refine, or revert
    the implemented direction; do not convert that decision into a universal
    skill rule.

Inventory every element that combines background, border, radius, or shadow;
name its function and report the total by region. A cosmetic class rename does
not count as a rendered change.

**Complete when:** checks pass, rendered evidence confirms the task and context lock, every remaining frame has a named function, and limitations are explicit.

## Capture preference

Follow [preference-capture.md](preference-capture.md). Do not mutate the skill before explicit approval.

**Complete when:** the candidate rule has evidence, classification, scope, exceptions, verifiable criteria, conflict analysis, and approval status.
