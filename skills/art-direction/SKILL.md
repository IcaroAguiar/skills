---
name: art-direction
description: Art-direct structurally sound web or mobile interfaces. Use to collaboratively explore and approve a product-specific direction; refine a partially approved direction; translate a visual reference into contextual rules; execute an approved direction; audit authorship and taste; or continue a passing design-direction result that still feels generic.
---

# Art Direction

Turn a passing interface contract into an executable experience that visibly
belongs to its product. Explore with the user when the governing direction is
unclear; execute directly when the direction is already explicit or approved.

## 1. Establish the handoff

Receive a passing context lock from `design-direction`, then read
[foundations-and-handoff.md](references/foundations-and-handoff.md). Preserve
the inherited task, data, permissions, lifecycle, consequences, accessibility,
and platform constraints while changing their presentation.

**Complete when:** the inherited contract and every open `N/V` item are
explicit, with no fundamental design-direction failure entering art direction.

## 2. Select one mode

- **explore** — calibrate intent, compare at most two governing directions on
  equivalent prototypes, guide critique, and freeze the decision before
  production changes. Read [explore.md](workflows/explore.md).
- **refine** — preserve a partially approved thesis while correcting limited
  inconsistency or under-execution. Read [refine.md](workflows/refine.md).
- **translate-reference** — extract functional relationships from a reference,
  then route to `explore`, `refine`, or `execute`. Read
  [translate-reference.md](workflows/translate-reference.md) and
  [reference-translation.md](references/reference-translation.md).
- **execute** — render or implement one approved or sufficiently specified
  direction. Read [execute.md](workflows/execute.md).
- **audit** — classify the rendered result and its evidence. Read
  [audit.md](workflows/audit.md).

**Complete when:** one mode, its inspected artifact, and its deliverable are
named. For `audit` and `explore`, follow the selected workflow and stop at its
completion criterion. `translate-reference` must name the next mode. The
remaining numbered steps are the `refine` and `execute` path.

## Execute lock

Follow this sequence:

```text
context -> posture -> thesis -> composition -> visual system -> components
-> assets -> behavior -> states -> screens -> platform adaptation -> revalidation
```

Use concrete, buildable terms. Each decision names what changes in the rendered
result and why it fits this product, task, and platform.

## 3. Interpret context

Declare product, domain, users, dominant task, frequency, error consequence,
density, trust requirement, brand posture, expression budget, platform,
physical context, and expected visual maturity. Read
[product-context.md](references/product-context.md) and the closest context:
[operational](contexts/operational-products.md),
[health and clinical](contexts/health-and-clinical.md),
[finance](contexts/finance.md), [education](contexts/education.md),
[content and editorial](contexts/content-and-editorial.md),
[consumer](contexts/consumer-products.md), or
[institutional](contexts/institutional-products.md).

**Complete when:** every context axis is explicit, the expression budget is
bounded, and exactly one closest context module has been applied.

## 4. Commit to a direction

Choose one visual posture, one operational thesis, and one dominant
composition. Map the attention path and the relationship between selection,
state, and action. Read [visual-postures.md](references/visual-postures.md),
[composition-models.md](references/composition-models.md), and the recorded
[direction decision](templates/direction-decision.md). When using precedent,
also read [precedent-library.md](references/precedent-library.md).

**Complete when:** posture, thesis, composition, and attention path describe
one coherent direction whose rendered consequences are observable; its status
is approved, user-authorized for direct execution, or explicitly awaiting a
decision before production changes.

## 5. Synthesize the visual system

Define semantic roles for typography, color, form, imagery, surfaces, depth,
and density. Define where each role appears, what it communicates, and when it
recedes. Read
[visual-system-synthesis.md](references/visual-system-synthesis.md).

**Complete when:** every visual medium has a named semantic role and the roles
form one hierarchy rather than a collection of effects.

## 6. Specify components and assets

For every material component, state its function, behavior, states, rationale,
and strongest rejected alternative. Inventory critical assets with function,
placement, direction, variants, fallback, and genericity risk. Read
[contextual-components.md](references/contextual-components.md) and
[asset-direction.md](references/asset-direction.md).

**Complete when:** every material component is justified by the task and every
critical asset has an executable direction and fallback.

## 7. Carry the system through behavior

Choose at most one primary signature and one supporting device. Specify motion,
feedback, reduced motion, focus, assistive response, failure, and recovery.
Cover the minimum screen sequence that proves entry, selection, depth, action,
response, and recovery. Adapt composition, navigation, density, action
geography, input, materials, and motion for each requested platform. Read
[signature-elements.md](references/signature-elements.md),
[motion-and-feedback.md](references/motion-and-feedback.md),
[multi-screen-coherence.md](references/multi-screen-coherence.md), and the
applicable [web](references/web-art-direction.md) or
[mobile](references/mobile-art-direction.md) module.

**Complete when:** signature, behavior, critical states, screen sequence, and
each requested platform express the same direction through platform-appropriate
composition.

## 8. Countercheck, revalidate, and deliver

Run [art-direction-antipatterns.md](references/art-direction-antipatterns.md),
then execute every applicable hard gate in
[behavioral-revalidation.md](references/behavioral-revalidation.md) before the
authorship score in [authorship-evaluation.md](references/authorship-evaluation.md)
and visual classification in [validation-gates.md](references/validation-gates.md).
Return the recorded result to `design-direction` for final revalidation.

For user-visible implementation, provide a before/after pair whenever a
trustworthy baseline is available. Keep state, viewport, theme, data, content,
and interaction conditions equivalent. Label a non-integrated render as a
proposal, not as factual implementation evidence. When the workflow remains
interactive, ask the user to accept, refine, or reject the direction; scope any
recorded preference before persisting it.

Use [executable-direction.md](templates/executable-direction.md); for a journey,
also use [multi-screen-system.md](templates/multi-screen-system.md). Use the
branch template for reference translation or audit.

Read [portability.md](references/portability.md) only when adapting the skill to
another harness.

**Complete when:** every applicable hard gate passes, each unsupported check is
`N/V` with its effect on the claim, the authorship score and classification are
evidence-bounded, the branch template is exhaustive, and the renewed
`design-direction` verdict accepts the inherited contract.
