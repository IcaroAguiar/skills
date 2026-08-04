# Evaluation

Localize labels to the user's language while preserving these semantics.

## Contents

- [Evidence states](#evidence-states)
- [Score](#score)
- [Finding priority](#finding-priority)
- [Verdict](#verdict)
- [Composition rules](#composition-rules)
- [Verdict limiters](#verdict-limiters)
- [Final matrix](#final-matrix)

## Evidence states

- `PASS` — the available evidence satisfies the criterion.
- `FAIL` — the evidence shows a violation.
- `N/V` — the evidence cannot verify the criterion.

`N/V` is not a pass and must limit claims.

## Score

Score observable categories from 0 to 5:

- **0:** absent, unusable, or critically harmful;
- **1:** severe recurring failure;
- **2:** below acceptable;
- **3:** functional with moderate problems;
- **4:** solid with minor refinements;
- **5:** excellent and contextually justified.

Categories:

- safety and error prevention;
- accessibility;
- usability;
- form completion and cognitive load;
- structural clarity;
- visual hierarchy;
- PageHeader identity and layout grammar;
- proportion, density, and rhythm;
- frames and surfaces;
- component-system integration;
- domain specificity and visual cliches;
- interaction consistency;
- state hierarchy and feedback;
- collections, actions, and lifecycle;
- tables and operational density;
- responsive ergonomics;
- native-mobile task topology and platform fit;
- mobile composition and first-viewport utility;
- mobile visual rhythm and typography;
- mobile material roles and component fit;
- mobile motion, feedback, and finish;
- contextual fit;
- surface-mode fidelity;
- authorial direction.

Score only categories supported by evidence.

## Finding priority

1. **Critical:** blocks the task, causes harm, deceives, or excludes essential access.
2. **High:** causes frequent error or major loss of comprehension.
3. **Medium:** increases effort or fragments the experience.
4. **Low:** localized inconsistency.
5. **Refinement:** improves polish without resolving meaningful harm.

## Verdict

- **No verdict — evidence blocked:** the primary artifact could not be inspected.
- **Approved:** no open critical, high, or fundamental failure.
- **Approved with reservations:** no critical blocker, but moderate problems or incomplete evidence prevent final approval.
- **Rejected:** a critical failure, a combination of high findings, structural incomprehension, or severe departure from foundations.

The verdict is not an average. Preserve positive patterns explicitly.

## Composition rules

- Evaluate rendered combinations rather than class or component names.
- Evaluate the whole composition; absence of nested cards does not approve scale, frames, or visual language.
- Judge titles by block function, PageHeaders by identity and auxiliaries, and layout grammar by semantic coherence.
- Judge product profile and surface mode separately.
- Judge long forms by task, progression, review, and dependency rather than field count.
- Judge states by object, scope, action requirement, and duration.
- Judge collections by location, continuity, comparison, selection, and action safety.
- Judge action groups by decision, object, order, emphasis, risk, and reversibility.
- Judge tables by comparable records and task, not mechanical compactness.
- Accept both open and low-contrast contained tables when their boundary has a functional role.
- Judge components by integration with product tokens, states, semantics, behavior, and responsive rules, not by library name or use of native HTML.
- Judge native mobile by task topology, platform behavior, scroll ownership,
  input, system insets, adaptive presentation, interruption, and assistive
  access; a phone-shaped viewport alone is insufficient evidence.
- Judge mobile craft separately from foundations. A usable, accessible,
  responsive interface may still be generic, over-framed, or under-authored.
- Judge premium claims against rendered composition and interaction evidence,
  not adjectives, component-library provenance, gradients, blur, or mockup polish.

## Verdict limiters

- Unreadable primary artifact → `No verdict — evidence blocked`.
- Critical access or operation failure → `Rejected`.
- Essential task unverified in a running interface → at most `Approved with reservations`.
- Long form without hierarchy, progress, or essential/optional distinction → usability at most `2/5`.
- Simultaneous states with unclear scope or apparent contradiction → clarity and states at most `2/5`.
- Collection hides items without evident access, or a transition has unpredictable outcome → usability at most `2/5`.
- One decision's actions are fragmented, or destructive operations mix with another scope → clarity and error prevention at most `2/5`.
- Table is dominated by actions and metadata and resists comparison → operational density at most `2/5`.
- Uncorrected megacard, title-container, ornamental callout, or generic cliche constellation → visual direction at most `2/5`.
- A primary or repeated control visibly bypasses the product system or loses required states and semantics → component-system integration at most `2/5`; reject when the bypass blocks essential access.
- Only one width is evidenced → responsiveness `N/V`.
- Correct but generic or disproportionate interface → not `Approved`.
- PageHeader is indistinguishable from section headings, or the page collapses into repeated dividers → visual hierarchy at most `3/5`.
- Operational surface becomes a hero, promotional narrative, or acquisition layout without a requirement change → contextual fit and usability at most `2/5`.
- Native mobile is only a narrowed desktop/card composition, or one portrait
  handset defines the entire adaptation → mobile platform fit at most `2/5`.
- Native mobile copies one interaction model across platforms despite conflicting
  return, navigation, presentation, input, or permission conventions → mobile
  platform fit at most `2/5`.
- A prolonged or branching task is trapped in a sheet/dialog, or fixed-height
  composition loses required content under text enlargement, keyboard, or
  localization → usability and responsive ergonomics at most `2/5`.
- Essential mobile completion depends on an opaque scroll gate, gesture-only
  operation, obscured focus, or semantics-stripped control → `Rejected`.
- Routine feedback is escalated into repeated alerts, persistent banners, or
  strong haptics → state hierarchy and feedback at most `2/5`.
- Native behavior lacks runtime evidence for semantics, keyboard, system insets,
  or the primary navigation path → mobile platform fit `N/V` and at most
  `Approved with reservations`.
- Mobile composition is a stack of header, summary, panel, repeated framed
  rows/cards, detail panel, and CTA without a dominant plane → mobile
  composition and frames at most `2/5`; do not label the result premium.
- A mobile create or redesign omits a rendered frame inventory → frames and
  surfaces `N/V`; do not label the result premium.
- ARIA composite roles are announced without their required keyboard, focus,
  selection, and state behavior → accessibility at most `2/5`; reject when the
  mismatch blocks the essential task.
- Motion, haptics, safe areas, platform materials, or assistive parity lack
  device/runtime evidence → those categories remain `N/V`; never upgrade a
  mobile-web result to native premium by inference.
- Any applicable mobile-craft category below `4/5`, or any craft category
  `N/V`, prevents a `Premium` classification even when the interface is
  otherwise approved.

## Final matrix

Mark every applicable item:

- primary task and action remain clear;
- product profile and surface mode are distinct;
- context lock remains intact;
- PageHeader establishes identity without decorative packaging;
- layout grammar matches content relationships;
- scale, density, and rhythm fit the task;
- every frame has a named function;
- rendered frame inventory reports the count and role of each mobile frame;
- equivalent components share the product's visual, behavioral, state, and accessibility contract;
- titles introduce rather than contain sections;
- warnings communicate severity, scope, and next action;
- domain specificity replaces generic visual language;
- long forms preserve progress, review, and requirements;
- global, local, transient, and historical states remain distinguishable;
- collections expose continuity and prioritize data;
- actions preserve decision grouping, scope, semantic order, and risk;
- lifecycle transitions are predictable and reversible where promised;
- table mode supports scanning, comparison, and selection;
- applicable accessibility and input methods were verified;
- relevant desktop and mobile widths were verified;
- native-mobile task topology, scroll ownership, system insets, keyboard,
  text enlargement, assistive semantics, and adaptation were verified when applicable;
- search scope and return context remain explicit when discovery is central;
- feedback intensity matches consequence and required action;
- cross-platform behavior preserves product semantics without erasing platform conventions;
- mobile craft distinguishes functional, well-designed, native, refined, and premium claims;
- dominant composition, rhythm, type roles, material roles, component rationale, and motion/feedback are explicit when refinement is requested;
- required content, actions, and states remain present;
- running evidence confirms visible and interactive claims.

**Complete when:** every applicable item is `PASS`, or `N/V` is disclosed with its effect on the verdict; no fundamental `FAIL` remains.
