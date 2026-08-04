---
name: design-direction
description: Design context-aware web or mobile interfaces. Use to create an interface; audit an existing screen, flow, component, screenshot, or implementation; propose or implement a redesign; or capture a visual reference or stated preference as a candidate design rule.
---

# Design Direction

Shape the interface around its task, product context, and users. Apply the same standards when creating and reviewing. Respond in the user's language; keep the skill's internal terminology in English.

## 1. Select one branch

- **Create** — define a new interface, flow, or component.
- **Review** — audit evidence, score observable categories, and issue a verdict without editing.
- **Redesign** — diagnose an existing interface and propose a complete replacement without editing production.
- **Implement** — apply an authorized redesign, validate it, and prove the result.
- **Capture preference** — convert a reference or comment into a candidate rule.

Combine review and redesign when the request is to improve or refactor. Enter
`Implement` only when the request already authorizes editing or the user
approves the proposed redesign.

**Complete when:** the branch, artifact, and expected deliverable are explicit.

When a passing result is structurally sound but the user asks for a more
authored, differentiated, expressive, or art-directed result, finish this
skill's gate first and then hand the approved context lock to `art-direction`
when that complementary skill is available. Reapply this skill after the art
direction pass.

## 2. Establish the context lock

Read:

- [foundations.md](references/foundations.md) for precedence and evidence limits;
- [contexts.md](references/contexts.md) to classify the product profile and surface mode;
- [workflows.md](references/workflows.md) for the selected branch.

Record the primary task, surface mode, usage frequency, navigation topology, minimum functional density, action geography, required data, and required states. Treat these as the **context lock**: visual refinement may reorganize them, but may not silently change their purpose.

Distinguish observation, inference, preference, requirement, and unverified behavior. Use the user's language in deliverables.

**Complete when:** the context lock and evidence boundary are explicit, and every material ambiguity is either resolved or declared.

## 3. Load only relevant reference

For create, review, redesign, or implement, read [design-direction.md](references/design-direction.md), then load the modules that match the artifact. Read [antipattern-index.md](references/antipattern-index.md) when diagnosing an existing interface, then open only the authoritative modules that match observed signals:

| Condition | Read |
|---|---|
| Full page, PageHeader, or content division | [hierarchy-and-layout.md](references/hierarchy-and-layout.md) |
| Surface treatment, scale, elevation, component integration, or generic visual language | [visual-quality.md](references/visual-quality.md) |
| Interactive UI, forms, input methods, or responsive behavior | [accessibility-and-usability.md](references/accessibility-and-usability.md) |
| Native mobile application, phone/tablet screen, mobile flow, or device runtime | [mobile-interfaces.md](references/mobile-interfaces.md) |
| Mobile visual refinement, premium finish, craft critique, or a result that is correct but still generic | [mobile-craft.md](references/mobile-craft.md) |
| Status, feedback, alerts, metadata, or async behavior | [states-and-feedback.md](references/states-and-feedback.md) |
| Lists, tables, repeated actions, overflow, or lifecycle transitions | [operational-collections.md](references/operational-collections.md) |

For review or self-evaluation, also read [evaluation.md](references/evaluation.md). Before writing a structured deliverable, read [output-templates.md](references/output-templates.md).

For preference capture, read [preference-capture.md](references/preference-capture.md) and the single authoritative module the candidate would change. Read [visual-references.md](references/visual-references.md) when researching precedent. Read [portability.md](references/portability.md) only when adapting the skill to another harness.

**Complete when:** every loaded module is relevant to an observed element, requirement, or branch output; no required module remains unread.

## 4. Execute the branch

Follow the matching sequence in [workflows.md](references/workflows.md). Preserve content, behavior, states, and positive patterns unless a requirement explicitly changes them.

Use implementation evidence when available. A screenshot proves static composition, not interaction. Source code proves intent, not the rendered experience. Mark unsupported claims `N/V` rather than inferring success.

**Complete when:** the branch's completion criterion passes and every proposed change maps to an observed problem or explicit requirement.

## 5. Prove the result

For user-visible implementation, validate the rendered interface at relevant widths and input methods. For every completed redesign surface, provide a before/after pair whenever trustworthy baseline evidence is available. Capture both at the same state, viewport, theme, data condition, and relevant interaction state whenever those conditions can be reproduced. Label each image and identify the requested behavior or visual rule it proves. If a comparable baseline cannot be obtained, state why; never reconstruct or present an approximate image as factual “before” evidence.

For reviews, apply every relevant limiter in [evaluation.md](references/evaluation.md); a verdict is not an average. For redesign proposals, map each finding to a change and request authorization before editing. For implemented redesigns, show the evidence and ask whether to accept, refine, or revert when the workflow remains interactive. For captured preferences, wait for explicit approval before changing the skill.

**Complete when:** all applicable checks are `PASS`, unsupported checks are `N/V` with stated impact, and no fundamental `FAIL` remains hidden.
