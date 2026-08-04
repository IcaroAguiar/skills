# Operational Collections, Actions, and Tables

> Data leads the composition. States explain the flow. Actions receive emphasis proportional to the decision.

Optimize for current-state comprehension, record location, comparison, safe action, and progressive detail.

## Contents

- [Action wall](#action-wall)
- [Fragmented action group](#fragmented-action-group)
- [Hidden collection overflow](#hidden-collection-overflow)
- [Lifecycle semantic ambiguity](#lifecycle-semantic-ambiguity)
- [Bloated data table](#bloated-data-table)
- [Table visual mode](#table-visual-mode)
- [Choose the representation](#choose-the-representation)
- [Operational checklist](#operational-checklist)

## Action wall

An **action wall** occurs when high-emphasis controls repeat across rows or cards until controls dominate data.

Target one primary action per context, restrained frequent controls, context menus for secondary actions, actions after selection, batch operations, and risk-proportional confirmation.

**Criterion:** users can scan the data before controls capture attention; action emphasis matches importance, frequency, urgency, and risk.

## Fragmented action group

A **fragmented action group** or **scattered actions** occurs when controls for one decision appear across unrelated rows or alignments, while different scopes appear to form one group.

An action wall concerns repetition and prominence. Fragmentation concerns relationship, order, scope, and consequence even when only a few buttons exist.

> Proximity communicates relationship. Emphasis communicates priority. Separation communicates scope.

Classify each action:

```text
Affected object:
Frequency:
Consequence:
Reversibility:
Priority:
```

Actions with materially different classifications usually belong to different groups.

### Target composition

- one group per decision with one dominant alignment axis;
- at most one primary action per decision;
- alternatives ordered by the decision flow and platform convention;
- rare, administrative, or destructive operations in a named separate region or menu;
- identical semantic order across visual layout, DOM, reading, and focus;
- responsive reflow that preserves proximity, priority, and sequence.

### Failure signals

- related actions occupy arbitrary rows or alignments;
- multiple primary actions compete;
- visual, logical, and focus order disagree;
- a destructive action interrupts neutral or positive alternatives;
- operations on different objects share one group;
- breakpoint changes relationship or sequence.

**Criterion:** users can immediately identify which action completes the decision, which alternatives belong to it, and which operations affect another scope.

## Hidden collection overflow

**Hidden collection overflow** occurs when more items exist than are visibly available and continuity lacks an operable affordance.

Use a list or table for extensive operational collections, explicit pagination or “View all,” visible navigation controls, honest count such as “4 of 12,” and search or filters when volume requires them. A partially visible item is useful only when it clearly signals continuity.

**Criterion:** displayed count matches the interface, and users know both that more items exist and how to reach them by relevant input methods.

## Lifecycle semantic ambiguity

Lifecycle ambiguity occurs when titles, filters, states, and actions use incompatible models.

Use consistent terminology and outcome-named actions:

```text
Current state → action → next state

Approved → Start execution → In progress
In progress → Suspend → Suspended
Suspended → Resume → In progress
```

Every transition must reveal current state, consequence, next state, reversibility, and additional effects. Distinguish state, category, permission, and pending work.

**Criterion:** users can predict the next state without internal system knowledge.

## Bloated data table

A **bloated data table** or **row obesity** turns rows into horizontal cards filled with repeated metadata, badges, long identifiers, and dominant actions.

Failure signals:

- most cells use multiple lines;
- auxiliary copy repeats across rows;
- nearly every record has a badge or filled button;
- few records fit in the viewport;
- secondary metadata truncates the primary differentiator.

Target one concept per column, compact legible rows, comparable values, details on demand, context menus for infrequent actions, selection and batch operations, and more space for differentiating data.

**Criterion:** users can scan and compare multiple records; detail and actions remain available without dominating every row.

## Table visual mode

Both modes are valid.

### Open or flush

Use when the table dominates the page, already has a clear grid boundary, needs maximum width, or continues an existing data plane.

### Low-contrast contained

Use when title, filters, toolbar, pagination, scrolling, or selection form one operational unit; when several collections coexist; or when a boundary improves orientation.

Containment is not elevation. Use a subtle outline, small or moderate radius, no resting shadow, a header tone close to the plane, discreet dividers, visible focus/selection/error, and frequency-appropriate density.

### Table-mode criterion

1. The selected mode has a functional rationale.
2. Data outranks boundary and idle controls.
3. Focus, selection, and error retain functional contrast.
4. Removing shadow does not reduce comprehension.
5. Toolbar, title, and pagination remain associated without forming a megacard.

## Choose the representation

Use cards for a small number of independent, heterogeneous, discoverable or selectable entities where visual comparison matters. Use lists or tables for numerous homogeneous records that users sort, filter, compare, select, or operate repeatedly.

Different representations of one entity require genuinely different tasks.

## Operational checklist

### Actions

- Is one primary action evident per decision?
- Do related actions share proximity, axis, and semantic order?
- Are different scopes, risks, or frequencies separated?
- Can repeated work move to batch?
- Does destructive emphasis match risk?

### Collections

- Does the displayed quantity match the stated quantity?
- Is continuity visible and operable?
- Would a list or table outperform cards or a carousel?

### Lifecycle

- Are current state, action consequence, next state, and reversibility explicit?
- Do titles, filters, states, and actions use one vocabulary?

### Tables

- Can users compare several rows without excessive scrolling?
- Does each column represent one clear concept?
- Are repeated information and permanent secondary actions reduced?
- Are primary values preserved from truncation?
- Is detail available on demand?
- Does open or contained mode match the table's operational role?

**Complete when:** every applicable checklist item passes and data remains more prominent than framing or controls.
