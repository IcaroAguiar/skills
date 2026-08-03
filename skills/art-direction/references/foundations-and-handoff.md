# Foundations and Handoff

`art-direction` is complementary to `design-direction`. It is not a replacement,
style preset, or final decoration pass.

## Required handoff

Receive or establish:

```text
Primary task:
Surface mode:
Product context:
Navigation topology:
Required content and states:
Action geography:
Minimum functional density:
Accessibility and platform constraints:
Design-direction verdict:
Open N/V items:
```

Treat this as the inherited functional contract. Art direction may change
composition, sequencing, disclosure, components, material, typography, and
motion, but may not silently change the task, data, state model, permissions,
or consequence of actions.

## Precedence

1. safety and legal consequence;
2. accessibility and assistive completion;
3. usability and task clarity;
4. platform and input conventions;
5. product continuity and real content;
6. art direction and brand expression;
7. local aesthetic preference.

Higher levels limit lower ones.

## Evidence boundary

- A screenshot proves static composition only.
- Source code proves implementation intent only.
- A responsive browser proves mobile web, not native mobile.
- A component library does not prove platform fit.
- Animation specifications do not prove runtime quality.

Mark unsupported claims `N/V`.

## Valid entry conditions

Proceed when the base is:

- **Well designed** and needs authored refinement;
- concept-only, with the design-direction contract already established;
- intentionally experimental, while preserving an explicit safe fallback.

Return to `design-direction` when the base has a fundamental failure.

## Final handoff

Return:

- inherited contract;
- design thesis;
- direction and rationale;
- state and motion plan;
- platform adaptations;
- implementation risks;
- design-direction revalidation result;
- highest evidence-supported quality claim.
