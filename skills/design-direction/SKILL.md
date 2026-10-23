---
name: design-direction
description: Design, redesign, review, or art-direct web and mobile interfaces in the user's house style, disciplined structure plus a domain-specific expression for each screen. Use to create or redesign a screen, flow, or component; audit a screen, screenshot, or implementation; give an interface a visual direction or make it less generic; or capture a visual reference or stated preference.
---

# Design Direction

Shape every interface in two layers. **Discipline** is the floor: task, hierarchy, states, accessibility, and the user's "essential" rules. **Expression** is the choice that makes each screen belong to its domain: a composition picked for the work, a domain metaphor, named precedents, and one signature element. A screen that only passes discipline is generic, and the user rejects it. Respond in the user's language; keep this skill's internal terminology in English.

## 1. Load the taste profile

Read [taste-profile.md](references/taste-profile.md) on every run. It is the user's standing style and the verdicts behind it, so they never have to repeat it. A repository design document, an approved direction, or an explicit request overrides it for that scope. The verdict log is evidence of taste, not a catalog of answers: when it records an approved direction for the same screen, take the Refine branch from that direction; for any other screen, derive the expression from the work in step 4.

**Complete when:** the profile is read and any repository-level override is named.

## 2. Select one branch

- **Create**: a new interface, flow, or component.
- **Redesign**: replace an existing interface's structure or look.
- **Review**: audit evidence and issue a verdict without editing.
- **Implement**: apply an approved or authorized design and prove it.
- **Refine**: polish a sound interface (typography, spacing, surfaces, icons, motion, responsive behavior) without changing its product contract.
- **Explore**: compare at most two credible directions on equivalent prototypes before production changes. Follow [explore.md](workflows/explore.md).
- **Translate reference**: extract the functional relationships of a reference, then route to another branch. Follow [translate-reference.md](workflows/translate-reference.md).
- **Capture preference**: turn a reference or comment into a candidate rule. Follow [preference-capture.md](references/preference-capture.md).

Combine Review and Redesign when the request is to improve. Enter Implement only when editing is authorized or the user approves the proposal.

**Complete when:** the branch, the artifact, and the deliverable are explicit.

## 3. Establish the context lock

Reuse an approved context lock when its task, data, permissions, states, and platform still apply. Otherwise read [foundations.md](references/foundations.md) and [contexts.md](references/contexts.md), plus the closest domain context in `contexts/`. Read only the selected branch in [workflows.md](references/workflows.md).

Record the primary task, surface mode, usage frequency, navigation topology, minimum functional density, action geography, required data, and required states. Distinguish observation, inference, preference, requirement, and unverified behavior.

**Complete when:** the context lock and the evidence boundary are explicit, and every material ambiguity is resolved or declared.

## 4. Choose the expression

Required for Create, Redesign, Explore, and any request for a less generic or more authored result. For each screen, write down before drawing:

```text
Work:              what the person does here, in one sentence
Composition:       the model from composition-models.md that fits the work
Metaphor:          what this screen is in the user's world
Precedents:        three strong products, including domain tools, that solved this kind of work, and the relationship each contributes
Signature element: the one memorable form, born from the domain; everything else stays quiet
Existing assets:   signatures the product already has that this screen keeps or extends
```

Read [composition-models.md](references/composition-models.md), including its collection shapes. Name precedents for the transferable relationship they show; open [precedent-library.md](references/precedent-library.md) and [visual-references.md](references/visual-references.md) and inspect the live product only when a claim depends on how that product looks today. Read [signature-elements.md](references/signature-elements.md) for the signature. When the work also defines a visual system, components, assets, or behavior end to end, follow [direction-sequence.md](workflows/direction-sequence.md).

When two compositions remain credible, show both side by side instead of averaging them: as two wireframes in a proposal, or as equivalent prototypes through Explore before production changes.

**Complete when:** every screen has all six lines, each line traces to the task or domain, and no screen takes the framed-table fallback while its work is something other than comparing similar records.

## 5. Load the discipline modules

Load the modules for the elements you change or the problems you observe. For diagnosis, start with [antipattern-index.md](references/antipattern-index.md).

| Condition | Read |
|---|---|
| Full page, PageHeader, or content division | [hierarchy-and-layout.md](references/hierarchy-and-layout.md) |
| Surfaces, scale, elevation, component integration, or generic visual language | [visual-quality.md](references/visual-quality.md) |
| Expressive defaults to refuse | [expression-antipatterns.md](references/expression-antipatterns.md) |
| Interactive UI, forms, input, or responsive behavior | [accessibility-and-usability.md](references/accessibility-and-usability.md) |
| Native mobile app, phone or tablet flow, device runtime | [mobile-interfaces.md](references/mobile-interfaces.md) and [mobile-art-direction.md](references/mobile-art-direction.md) |
| Responsive web at phone widths | [mobile-art-direction.md](references/mobile-art-direction.md) |
| Mobile refinement or premium finish | [mobile-craft.md](references/mobile-craft.md) |
| Web direction, motion, or feedback | [web-art-direction.md](references/web-art-direction.md) and [motion-and-feedback.md](references/motion-and-feedback.md) |
| Status, feedback, alerts, metadata, or async behavior | [states-and-feedback.md](references/states-and-feedback.md) |
| Lists, tables, repeated actions, overflow, or lifecycle transitions | [operational-collections.md](references/operational-collections.md) |
| Several screens of one journey | [multi-screen-coherence.md](references/multi-screen-coherence.md) |

For a scored review, read [evaluation.md](references/evaluation.md) and, when authorship is judged, [authorship-evaluation.md](references/authorship-evaluation.md). Read [output-templates.md](references/output-templates.md) or the files in `templates/` when the deliverable needs that structure. Read [portability.md](references/portability.md) only when adapting the skill to another harness.

**Complete when:** every loaded module is relevant to an observed element, requirement, or branch output, and no required module remains unread.

## 6. Execute the branch

Follow the branch sequence in [workflows.md](references/workflows.md), or the workflow file named in step 2. Preserve content, behavior, states, and positive patterns unless a requirement changes them. Implementation evidence beats inference: a screenshot proves static composition, source code proves intent, and an unsupported claim is `N/V`.

**Complete when:** the branch's completion criterion passes and every change maps to an observed problem, a requirement, or the expression chosen in step 4.

## 7. Pass the anti-generic gate

Before delivering a design, a canvas, or an implementation, answer for each screen:

- Could this screen belong to any app? Name what makes it this product's.
- Is each table here because the work is comparison, or because it was the default?
- Does the signature element come from this domain, and is everything around it quiet?
- Does each item show only its identity, its state, and one supporting line? A signature drawn inside the item, such as a cycle or a count on a node, belongs to the state, not to the line count.
- Is there exactly one filled action in the page's base state? A sheet or dialog carries its own confirm; when the role's actions change with each record's state, the filled one is the role's most frequent decision and the rest are outline.

A "no" or an unnamed answer sends the screen back to step 4 or step 6.

**Complete when:** every screen passes all five questions with a named reason.

## 8. Prove and close

For user-visible work, validate the rendered interface at the relevant widths and input methods, and give a before/after pair whenever a trustworthy baseline exists, captured under the same state, viewport, theme, and data. Never present a reconstructed image as a factual "before".

For reviews, apply every limiter in [evaluation.md](references/evaluation.md); a verdict is not an average. For proposals, request authorization before editing. For implementations, ask the user to accept, refine, or revert. When the user approves or rejects a screen, offer a dated entry for the verdict log in [taste-profile.md](references/taste-profile.md); change the profile's rules only after the user approves the wording.

**Complete when:** all applicable checks pass, unsupported checks are `N/V` with their impact stated, no fundamental failure is hidden, and any new verdict is logged or offered.
