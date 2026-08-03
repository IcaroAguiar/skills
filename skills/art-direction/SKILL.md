---
name: art-direction
description: Create or audit an executable, product-specific visual direction for web or mobile when a structurally sound interface still feels generic, under-authored, library-driven, visually interchangeable, or insufficiently specific to its domain and brand. Use after design-direction for authored composition, visual systems, contextual components, assets, motion, states, multi-screen coherence, reference translation, and evidence-bounded refined or premium claims.
---

# Art Direction

Turn a sound interface contract into a rendered experience that visibly belongs
to this product. Default to `execute`. Do not stop at a thesis, mood, palette,
or recommendations.

## Required relationship

Use `design-direction` before and after this skill.

1. Receive a passing functional contract from `design-direction`.
2. Apply art direction without silently changing tasks, data, permissions,
   lifecycle, or consequences.
3. Return the result to `design-direction` for revalidation.

If accessibility, semantics, navigation, hierarchy, responsiveness, state
logic, or task flow fails, stop and repair the foundation first. Read
[foundations-and-handoff.md](references/foundations-and-handoff.md).

## Select one mode

- **execute** — default. Make decisions and produce an implementable direction.
  Read [execute.md](workflows/execute.md).
- **explore** — compare at most two genuinely different directions, recommend
  one, then continue with `execute`. Read [explore.md](workflows/explore.md).
- **translate-reference** — extract function, proportion, rhythm, material,
  behavior, and asset roles without copying. Read
  [translate-reference.md](workflows/translate-reference.md) and
  [reference-translation.md](references/reference-translation.md).
- **audit** — distinguish authored direction from styling or generic polish.
  Read [audit.md](workflows/audit.md).

## Execute lock

Follow this sequence:

```text
context → posture → thesis → composition → visual system → components
→ assets → behavior → states → screens → platform adaptation → revalidation
```

Do not advance with unnamed phrases such as “modern components,” “premium
visuals,” “better hierarchy,” or “subtle animation.” Make each decision
observable and buildable.

### 1. Interpret context

Declare product, domain, users, dominant task, frequency, consequence of error,
density, trust requirement, brand posture, expression budget, platform,
physical context, and expected visual maturity. Read
[product-context.md](references/product-context.md) and the closest context:
[operational](contexts/operational-products.md),
[health and clinical](contexts/health-and-clinical.md),
[finance](contexts/finance.md), [education](contexts/education.md),
[content and editorial](contexts/content-and-editorial.md),
[consumer](contexts/consumer-products.md), or
[institutional](contexts/institutional-products.md).

### 2. Commit to a direction

Choose one concrete visual posture, one operational thesis, and one dominant
composition. State the attention path and the relationship between selection,
state, and action. Read [visual-postures.md](references/visual-postures.md) and
[composition-models.md](references/composition-models.md).

### 3. Synthesize the system

Define semantic roles for typography, color, form, imagery, surfaces, depth,
and density. Define where each role appears and when it disappears. Read
[visual-system-synthesis.md](references/visual-system-synthesis.md).

### 4. Specify implementation

For every material component, state its function, behavior, states,
justification, and rejected alternative. Produce an asset inventory with
function, placement, direction, variants, fallback, and genericity risk. Read
[contextual-components.md](references/contextual-components.md) and
[asset-direction.md](references/asset-direction.md).

### 5. Make behavior visible

Choose at most one primary signature and one supporting device. Specify motion,
feedback, reduced-motion behavior, focus, assistive response, and failure or
undo. Read [signature-elements.md](references/signature-elements.md) and
[motion-and-feedback.md](references/motion-and-feedback.md).

### 6. Prove a system, not one hero frame

Cover the real states and the minimum screen sequence needed to demonstrate
entry, selection, depth, action, response, and recovery. Preserve the system
without repeating one layout. Read
[multi-screen-coherence.md](references/multi-screen-coherence.md).

### 7. Adapt rather than scale

Preserve concept, posture, terminology, and signature. Adapt composition,
navigation, density, action geography, input, materials, and motion. Read
[web-art-direction.md](references/web-art-direction.md) and/or
[mobile-art-direction.md](references/mobile-art-direction.md).

### 8. Countercheck and revalidate

Run [art-direction-antipatterns.md](references/art-direction-antipatterns.md)
and [validation-gates.md](references/validation-gates.md). Re-run
`design-direction`. Reduce expression rather than weakening a higher-order
constraint.

## Required output

Use [executable-direction.md](templates/executable-direction.md). Include all
25 sections or mark a section `N/A` with a reason. For a journey, also use
[multi-screen-system.md](templates/multi-screen-system.md).
For reference work use
[reference-translation.md](templates/reference-translation.md); for audits use
[audit-report.md](templates/audit-report.md).

Never omit:

- exact experience structure;
- type, color, form, and surface roles;
- contextual component decisions;
- asset inventory and fallbacks;
- signature behavior;
- meaningful states;
- motion and feedback plan;
- web/mobile or platform adaptation;
- removal list and explicit “do not” list;
- renewed `design-direction` verdict;
- highest evidenced claim and remaining `N/V`.

## Non-negotiable gates

Reject the result as art-directed when the direction exists only in prose,
composition remains interchangeable, only tokens changed, assets are avoided,
all screens repeat one layout, components were not chosen by task, or the
signature is a decorative gimmick.

“Premium” is an earned evidence level, not a requested style. Static imagery
can prove composition and visual craft only. Mobile web does not prove native
behavior. Never convert `N/V` into presumed approval.

## Validation protocol

Use [blind-three-stage-protocol.md](references/blind-three-stage-protocol.md)
for formal comparison:

```text
A. no skill
B. design-direction
C. design-direction + art-direction
```

Keep authors isolated and freeze the brief, content, stack, tools, and budget.
Include a sober counterexample where restraint is the correct direction.
