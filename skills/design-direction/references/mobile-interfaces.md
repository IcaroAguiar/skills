# Mobile Interfaces

Design a **platform-shaped** experience: preserve the product's identity while
matching the device's task topology, input model, navigation, adaptation, and
accessibility contract. Native quality is behavioral before it is visual.

## Contents

- [Platform lock](#platform-lock)
- [Task topology and navigation](#task-topology-and-navigation)
- [Task-first disclosure](#task-first-disclosure)
- [Adaptive composition](#adaptive-composition)
- [Content planes and surfaces](#content-planes-and-surfaces)
- [Scroll ownership](#scroll-ownership)
- [Persistent actions](#persistent-actions)
- [Input and virtual keyboard](#input-and-virtual-keyboard)
- [Search and discovery](#search-and-discovery)
- [Feedback escalation](#feedback-escalation)
- [Product continuity across platforms](#product-continuity-across-platforms)
- [Accessibility contract](#accessibility-contract)
- [Motion, material, and haptics](#motion-material-and-haptics)
- [Premium mobile quality](#premium-mobile-quality)
- [Anti-pattern catalog](#anti-pattern-catalog)
- [Preferred pattern catalog](#preferred-pattern-catalog)
- [Runtime verification](#runtime-verification)
- [Primary references](#primary-references)

## Platform lock

Record:

```text
Platform family: iOS, Android, cross-platform, mobile web, or unknown
Device classes: compact phone, large phone, foldable, tablet, desktop window
Primary task and surface mode:
Task topology: parent destination, child destination, scoped task, or immersive flow
Primary input: touch, keyboard, stylus, voice, switch, or mixed
Navigation model:
Primary scroll owner:
Persistent chrome and actions:
Interruption and restoration requirements:
System states and permissions:
Evidence devices, orientations, text sizes, and assistive technologies:
```

Do not infer native behavior from a phone-shaped screenshot. Mark the platform
and unverified behavior explicitly.

**Complete when:** the task topology, platform family, input model, scroll owner,
and evidence devices are known or marked `N/V`.

## Task topology and navigation

Choose navigation from the relationship:

| Relationship | Suitable mobile pattern |
|---|---|
| Top-level peer destinations | tab bar or navigation bar |
| Deeper content in one destination | navigation stack with predictable return |
| Sibling views inside one destination | tabs or content switcher |
| Short, scoped, reversible task | sheet |
| Complex or prolonged focused task | dedicated screen or full-screen flow |
| Secondary or rare actions | toolbar or contextual menu |
| Destructive confirmation | platform-appropriate confirmation surface |

Use navigation controls for destinations and action controls for operations.
Keep top-level destinations stable; unavailable content gets an explanatory
state rather than disappearing navigation. Distinguish hierarchical return,
history back, close, cancel, and completion.

On compact phones, prefer one focused pane. On expanded windows, preserve the
same topology while revealing list-detail, supporting panes, rail, or sidebar
when they improve continuity.

**Criterion:** a user can identify the current destination, predict return
behavior, distinguish navigation from action, and complete the task without
guessing which container is a screen.

## Task-first disclosure

Give each screen one dominant task, decision, or comprehension goal. Keep the
context needed to make that decision visible; move unrelated administration,
rare actions, and supporting detail to a later destination, disclosure, or
scoped task.

Progressive disclosure can defer complexity, but not obligation. Before hiding
content, expose:

- that more work or information exists;
- what remains required;
- the effect on completion;
- how to reveal, edit, or revisit it;
- a summary and state for completed sections.

Do not force a wizard when expert work is naturally non-linear. Do not flatten a
dependent, regulated, or irreversible sequence merely to reduce the number of
screens.

**Criterion:** the next meaningful action is apparent, and deferred content
cannot surprise the user with an undisclosed requirement.

## Adaptive composition

Use three adaptive operations:

1. **Reflow** — rearrange content and actions.
2. **Reveal** — show supporting context when space permits.
3. **Presentation change** — transform a bottom sheet into a side sheet, a
   navigation bar into a rail, or a one-pane list into list-detail.

Start from relationships and panes rather than one artboard per device. Constrain
reading and input width on expanded screens. Support compact height, landscape,
foldables, multitasking, text enlargement, and external input when relevant.

Avoid width-only responsiveness. Height, posture, keyboard, system bars, display
cutouts, and input method can change the correct composition.

**Criterion:** the interface preserves task, state, and navigation while its
presentation changes for the available window and input method.

## Content planes and surfaces

Treat the screen's content layer as the primary plane. Use a separate surface
for a real independent object, transient layer, selected item, secure preview,
media canvas, map, or bounded editor.

### Desktop card transplant

A **desktop card transplant**, **web-card transplant**, or **mobile megacard**
occurs when a desktop card composition is narrowed without architectural
recomposition.

Signals:

- one rounded surface consumes most of the usable viewport;
- page padding plus card padding materially reduces the task area;
- repeated cards replace navigation, grouping, or progressive disclosure;
- a desktop form becomes a narrow stack with unchanged hierarchy;
- the card shape forces long content into an internal scroll region;
- generic web controls remain inside a phone frame.

Prefer the content plane, platform navigation, grouped lists, section rhythm,
dedicated screens, sheets for scoped work, and containment with a named
function.

**Exception:** a document reader, map, canvas, media preview, editor, or secure
object can justify bounded containment. Test its proportion and behavior rather
than removing its boundary mechanically.

## Scroll ownership

Give each screen one obvious dominant scroll owner. Make secondary scroll
regions visually bounded, programmatically named, independently operable, and
functionally necessary.

### Nested-scroll task trap

A **nested-scroll task trap** or **bounded-scroll trap** occurs when essential
content sits inside an internal scroll region whose ownership, remaining
content, or completion effect is unclear.

For a justified internal reader:

- expose a meaningful accessible name and role;
- preserve standard gestures and external-input alternatives;
- communicate position or progress when it affects completion;
- announce reaching the end when it changes state;
- keep focus and reading order stable;
- test large text, screen reader, compact height, and keyboard interaction;
- prevent the outer and inner regions from competing for the same gesture.

Clipped content alone is not a sufficient progress or continuation cue.

## Persistent actions

Use a persistent bottom action when continued access materially reduces effort
or protects completion. Integrate it with system insets, keyboard, scroll
content, validation, and current availability.

### Detached prerequisite action

A **detached prerequisite action** or **detached sticky CTA** occurs when the
persistent action is separated from the requirement, validation, or state that
controls it.

The action area should contain or directly reference:

- the remaining requirement or current state;
- blocking validation or recovery;
- the primary action;
- safe-area and keyboard behavior.

Do not let sticky chrome obscure focused controls or materially reduce readable
space under text enlargement. A disabled control never replaces an explanation.

### Opaque completion gate

An **opaque completion gate** or **hidden scroll gate** occurs when action
availability depends on an invisible threshold.

Prefer a concrete prerequisite, progress with domain meaning, accessible state
change, and recovery. For a six-section document, “4 of 6 sections read” is
usually more actionable than an unexplained percentage.

## Input and virtual keyboard

- Use persistent labels and the input purpose, keyboard, capitalization,
  autofill, and validation appropriate to the data.
- Keep the edited field, instructions, errors, and next action visible when the
  keyboard appears.
- Make focus order match task order; provide predictable next and dismiss
  behavior.
- Preserve values and working position across validation, interruption,
  orientation, and presentation changes.
- Give drawing, drag, swipe, and spatial input an accessible alternative.
- Use a dedicated canvas for signatures or drawings; provide an equivalent
  method when the task permits it.

Do not compress multiple input methods into unlabeled text choices. Choose a
segmented control for short peer modes, a selection list when options need
explanation, or separate screens when each mode is a substantial task.

Avoid fixed-height shells around text, controls, readers, sheets, or persistent
actions. Content length, localization, text enlargement, keyboard, compact
height, and system chrome must be able to change the measured composition.

## Search and discovery

Place search according to its scope and frequency:

| Search role | Suitable placement |
|---|---|
| Primary product destination | stable top-level destination |
| Frequent tool for the current destination | navigation or toolbar action |
| Filter for the visible collection | inline with that collection |
| Rare contextual lookup | reveal on demand |

State whether search is global, destination-scoped, or collection-scoped.
Preserve the query and result context during drill-down when users are likely to
compare several results. Do not reserve permanent space for rare search, or mix
global search with local filters under one unlabeled field.

## Feedback escalation

Match feedback presentation to consequence and required action:

1. inline state for local validation, progress, or recovery;
2. transient confirmation for a completed reversible event;
3. persistent banner or status region for a condition that remains relevant;
4. interruptive alert only for critical risk, explicit decision, or
   irreversible consequence.

Keep corrective feedback beside the affected object. Pair color, sound, motion,
and haptics with text or semantics rather than making any one channel carry the
meaning alone.

Avoid **feedback over-escalation**: routine success alerts, persistent banners
for passive information, strong haptics on ordinary taps, or toasts for errors
that require correction.

## Product continuity across platforms

Keep the product coherent without erasing the host platform.

Share:

- information architecture and domain language;
- business rules and state meanings;
- brand voice, visual tokens, and content priority;
- accessibility and error-prevention outcomes.

Adapt:

- back, close, cancel, and completion behavior;
- top-level and hierarchical navigation;
- sheets, dialogs, pickers, toolbars, and menus;
- keyboard, pointer, stylus, and gesture behavior;
- system materials, motion, feedback, and permission flows.

**Platform erasure** occurs when one interaction model is copied across iOS,
Android, mobile web, tablet, and desktop windows despite conflicting platform
expectations. Product consistency does not require interaction uniformity.

## Accessibility contract

Every interactive element needs programmatic name, role, value or state,
activation, reading order, and an input-sized target. A visual button exposed as
static text is a foundation failure.

Verify:

- text enlargement and Dynamic Type or platform equivalent;
- bold text, increased contrast, reduced motion, and color independence;
- screen-reader headings, groups, values, and announcements;
- switch, voice, keyboard, pointer, and touch paths where relevant;
- gesture and drag alternatives;
- portrait, landscape, compact height, and reflow;
- focus not obscured by sticky bars, sheets, or keyboard;
- target size and spacing against the active platform standard.

Use platform targets for native apps. For web content, WCAG 2.2 requires at
least 24 by 24 CSS pixels or sufficient spacing under its defined exceptions;
important controls should exceed the minimum when practical.

**Limiter:** reject when an essential visual control lacks interactive semantics
or the primary task cannot be completed with the relevant assistive technology.

## Motion, material, and haptics

Use motion to preserve causality, spatial continuity, status, and feedback.
Keep frequent transitions brief and precise. Match entry and dismissal
directions to the interaction model. Respect reduced-motion preferences and
never make motion the only carrier of meaning.

Use materials to distinguish functional layers such as navigation, transient
controls, sheets, and content. Do not apply platform material effects across the
content plane merely to signal “premium.”

Use system haptics consistently for meaningful selection, impact, success,
warning, or error. Pair haptics with visual or auditory feedback and keep the
experience fully usable without them.

## Premium mobile quality

Treat **premium** as a precision stack:

1. task-shaped information architecture;
2. platform-shaped navigation and presentation;
3. intentional typography and content measure;
4. coherent design-system components;
5. complete pressed, selected, disabled, loading, error, success, and offline
   states;
6. safe-area, keyboard, interruption, and restoration quality;
7. concise microcopy and contextual validation;
8. causal motion and restrained material;
9. optional, meaningful haptics;
10. assistive-technology parity.

Simplicity passes when it communicates destination, hierarchy, state, and
behavior without decorative packaging. An **under-authored mobile hierarchy**
fails when app identity, task title, metadata, content, and action remain
undifferentiated and the composition collapses without a large card.

Use one context-appropriate expressive anchor when the product needs stronger
identity: typographic voice, domain illustration, data visualization, content
material, spatial composition, or motion. Keep transactional and legal flows
calm; do not convert them into promotional pages.

## Anti-pattern catalog

| Anti-pattern | Detect when | Positive target |
|---|---|---|
| Desktop card transplant | desktop containers are narrowed without recomposition | platform-shaped content plane and task topology |
| Nested-scroll task trap | essential completion depends on unclear internal scrolling | one scroll owner or named, tested reader |
| Opaque completion gate | a hidden threshold controls the action | explicit prerequisite and accessible progress |
| Detached prerequisite action | persistent CTA is separated from its controlling state | integrated action, validation, and safe-area region |
| Semantics-stripped custom control | visual control is exposed as text or lacks state | native or system-integrated semantic primitive |
| Under-authored mobile hierarchy | card and button carry nearly all hierarchy | typographic, spatial, state, and platform authorship |
| Redundant document framing | screen, document, version, and status repeat without scope | one task title and structured document identity |
| Gesture-only operation | swipe, drag, or motion is the only path | visible or assistive equivalent |
| Fixed-chrome obstruction | keyboard or persistent bars cover content or focus | inset-aware, dismissible, adaptive chrome |
| Phone-only adaptation | one portrait handset composition defines mobile | window-, posture-, orientation-, and input-aware layout |
| Modal overreach | a sheet or dialog contains prolonged, deep, or branching work | dedicated screen or full-screen flow |
| Fixed-height fragility | text, keyboard, localization, or chrome breaks a fixed shell | content-measured, reflowing composition |
| Platform erasure | identical interaction overrides host-platform expectations | shared product semantics with platform-shaped behavior |
| Feedback over-escalation | routine events trigger alerts, banners, or strong haptics | feedback proportional to consequence and action |
| Premature custom control | a system primitive is recreated without a product need | native or system-integrated primitive with complete states |

## Preferred pattern catalog

| Need | Preferred candidates |
|---|---|
| Top-level destinations | tab or navigation bar with stable labeled items |
| Drill-down | navigation stack with platform return behavior |
| Short contextual task | sheet with clear cancel and completion |
| Prolonged or multistep task | dedicated or full-screen flow |
| Long controlled reading | dedicated reader or justified named region with progress |
| Peer input modes | segmented control or selection list by explanation needs |
| Secondary action | toolbar or contextual menu |
| Destructive action | separated action plus proportional confirmation |
| Dense choice or metadata | grouped list, disclosure row, structured details |
| Global or primary discovery | stable, explicitly scoped search destination |
| Visible-collection filtering | inline scoped search plus filters |
| Compact-to-expanded adaptation | one pane to list-detail, nav bar to rail, sheet to side sheet |
| Persistent completion action | inset-aware action region with prerequisite and feedback |

These are candidates, not mandates. Choose by task topology, frequency, risk,
content, platform, and evidence.

## Runtime verification

For a native-mobile verdict, capture:

1. initial, loading, disabled, error, success, and restoration states;
2. compact portrait and another relevant size, orientation, or posture;
3. default and enlarged text;
4. screen-reader tree, focus order, names, roles, values, and announcements;
5. keyboard appearance, next/dismiss behavior, and field visibility;
6. system bars, cutouts, safe areas, and persistent chrome;
7. primary scrolling and every justified nested region;
8. back, close, cancel, and destructive flows;
9. gesture alternatives and external input when relevant;
10. reduced motion and increased contrast where supported.
11. search scope, query preservation, and return context when search is central;
12. feedback channels and escalation level for routine, recoverable, and
    irreversible outcomes.

A static screenshot proves composition only. Browser-sized mobile evidence does
not prove native semantics, system navigation, haptics, or keyboard behavior.

**Complete when:** every relevant runtime item is `PASS` or `N/V` with verdict
impact, and no essential control or task path fails the accessibility contract.

## Primary references

- Apple Human Interface Guidelines — https://developer.apple.com/design/human-interface-guidelines/
- Apple Accessibility — https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple Layout — https://developer.apple.com/design/human-interface-guidelines/layout
- Apple Scroll views — https://developer.apple.com/design/human-interface-guidelines/scroll-views
- Apple Tab bars — https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Apple Sheets — https://developer.apple.com/design/human-interface-guidelines/sheets
- Apple Motion — https://developer.apple.com/design/human-interface-guidelines/motion
- Apple Playing haptics — https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- Android Adapt layouts — https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout
- Android Layouts and navigation patterns — https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- Android System bars — https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
- Android Accessibility — https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- Android Adaptive app quality — https://developer.android.com/docs/quality-guidelines/adaptive-app-quality
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/
