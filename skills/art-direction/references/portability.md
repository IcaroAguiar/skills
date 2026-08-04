# Portability

Keep the conceptual core independent of model, editor, framework, and tool
availability. Store workflows, rubrics, references, and templates as portable
Markdown. Adapt implementation only after discovering the repository stack and
available capabilities.

## Universal invariants

Every adapter must preserve:

- the passing `design-direction` context lock;
- mode routing among `explore`, `refine`, `translate-reference`, `execute`, and
  `audit`;
- equivalent comparison conditions;
- explicit approval before production execution of an explored direction;
- authorship axes, hard gates, quality classifications, and `N/V` semantics;
- before/after evidence boundaries;
- user-language output and scoped preference capture.

## Harness adapters

- **Codex:** keep `SKILL.md`, `agents/openai.yaml`, references, workflows, and
  templates; discover code, browser, image, and design tools per task.
- **Claude Code:** use a thin trigger and reference loader; preserve mode,
  approval, scoring, and completion semantics.
- **Cursor:** expose the same trigger, reference paths, and output contracts;
  treat editor and browser capabilities as discovered tools.
- **Generic agent:** provide the description, handoff, mode workflow, relevant
  references, template, and evidence boundary.

## Parity test

Run the same artifact and request through at least two harnesses. Compare mode,
context lock, chosen precedents, governing thesis, authorship scores, hard-gate
result, classification, and approval status. Wording may vary; divergence in
those fields requires adapter correction.
