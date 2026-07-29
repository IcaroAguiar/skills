---
name: visual-fidelity
description: Use when implementing or correcting frontend UI from screenshots, Figma frames, visual mockups, current-vs-target comparisons, or requests for close visual fidelity, reference matching, image-to-code, redesign adaptation, or UI parity.
---

# Visual Fidelity

Use this skill as a Visual Fidelity Harness, not as an open-ended prompt. The reference is interpreted once into structured artifacts, implementation is bounded, and closeout is controlled by screenshots, DOM landmarks, rubric score, and explicit residual differences.

## Source-Type Router

Before editing code, classify the source and write it to `.visual-fidelity/state.md`.

- `figma-mcp`: Figma URL/node/selection is available. Fetch design context, screenshot, tokens, component structure, assets, and Code Connect mappings where available. Read `references/figma-mcp.md`.
- `screenshot-only`: PNG/JPG/WebP/PDF screenshot is the source. Extract Visual IR before code and use semantic rubric because pixel diff alone is insufficient. Read `references/screenshot-only.md`.
- `existing-ui-redesign`: Existing route/component must move toward a reference. Default mode is `maximum-fidelity-preserve-structure`. Read `references/preserve-structure.md`.
- `disposable-rebuild`: User explicitly permits full rebuild/replacement/refazer. Required product contracts still survive. Read `references/redesign-rebuild.md`.

Never implement until source type, route/component target, viewport, execution mode, reference confidence, and iteration budget are in `state.md`.

## Execution Modes

Choose exactly one mode:

- `maximum-reference-fidelity`: reference dominates; use for static recreation, new screens, demos, or explicit image-priority tasks.
- `maximum-fidelity-preserve-structure`: default for existing products; maximize fidelity while preserving route/component structure, real content, forms, links, state, accessibility, and domain behavior.
- `redesign-rebuild`: ignore the current visual implementation and rebuild from the reference while preserving only the required product contracts.

If ambiguous, use `maximum-fidelity-preserve-structure`.

## Mandatory Artifacts

Create these before implementation for material visual work:

- `.visual-fidelity/state.md`
- `.visual-fidelity/visual-spec.md`
- `.visual-fidelity/visual-ir.json`
- `.visual-fidelity/visual-plan.md`
- `.visual-fidelity/visual-rubric.json`
- `.visual-fidelity/component-map.json`
- `.visual-fidelity/selector-map.json`
- `.visual-fidelity/config.json`
- `.visual-fidelity/references/`
- `.visual-fidelity/runs/`
- `.visual-fidelity/references/manifest.json`
- `.visual-fidelity/references/atlas/`
- `.visual-fidelity/analysis/visual-ir.v2.json`
- `.visual-fidelity/analysis/visual-checklist.json`
- `.visual-fidelity/contracts/landmark-contract.json`
- `.visual-fidelity/contracts/golden-integrity.json`
- `.visual-fidelity/contracts/reference-integrity.json`
- `.visual-fidelity/packets/`

Before every edit pass, read `state.md`, latest `runs/<run-id>/run.json`, `visual-ir.json`, `visual-rubric.json`, and only the target files listed in `visual-plan.md`. Do not depend on conversation history for visual requirements.

## vNext Hardening Phase

Before any implementation, complete these gates:

1. `Golden Reference Integrity`: golden references must never originate from the runtime currently under test. Valid sources are user-provided screenshot/mockup, approved Figma export, approved PDF crop, approved historical golden from a known-good revision, or explicitly approved design artifact.
2. `Exhaustive Visual Compiler`: no code starts until `analysis/visual-ir.v2.json`, `analysis/visual-checklist.json`, `contracts/landmark-contract.json`, and reference atlas coverage represent every relevant visible detail or document an allowed deviation.
3. `Closed Executor Packets`: cheap executors receive only `packets/executor-task-<n>.json` and listed files. They cannot see the image as an open source, update golden references, judge fidelity, or declare success.
4. `Fraud-proof Closeout Gate`: `diffRatio` is only a detector. Passing requires valid provenance, actual-vs-approved-source comparison, complete landmarks, regional rubric, DOM/ARIA evidence, and `fraud-proof-closeout.json`.
5. `State Compression Rules`: never use chat history as visual source of truth. Resume from manifest, IR/checklist/contracts, packets, run reports, unresolved ambiguities, `state.md`, and `run-capsule.md`.
6. `Visual Benchmark Requirement`: benchmark hardening must prove self-reference, missing provenance, incomplete IR, missing landmark, invalid packet, baseline update, regional rubric, and multi-turn preservation blockers.

If reference provenance is absent or suspect, stop before implementation. A perfect or near-perfect diff is suspicious when provenance is not perfect.

## Required Workflow

1. Run the reference quality gate and document confidence: `high`, `medium`, or `low`.
2. Validate `references/manifest.json` and `contracts/reference-integrity.json`.
3. Write `visual-spec.md` as concise prose: structure, hierarchy, grid, landmarks, tokens, adaptation notes, and omissions that are forbidden.
4. Write `analysis/visual-ir.v2.json`, `analysis/visual-checklist.json`, and `contracts/landmark-contract.json`.
5. Write `visual-ir.json` as the v3 compatibility artifact when needed.
6. Write `visual-plan.md` mapping each visual block/landmark to real files/components, preserved behavior, risks, and validation command.
7. Write `visual-rubric.json` with category weights, passing score, critical caps, and regional thresholds.
8. Write `component-map.json` and `selector-map.json` so landmarks map to owned files and stable locators.
9. Implement one bounded region batch or one closed executor packet.
10. Capture screenshot artifacts, DOM landmarks, ARIA snapshot, image diff when possible, rubric reports, and `runs/<run-id>/run.json`.
11. Run IR/DOM comparison, derive the action queue, create closed packets, and repair by one compiled action only.
12. Run 2 to 3 screenshot + DOM + rubric cycles unless explicitly scoped smaller.
13. Close only with `fraud-proof-closeout.json` and the gate status.

## V4 Compiler Loop

Do not send the original reference directly to a cheap executor. Compile the reference into constraints first.

Required sequence:

1. Produce or update `visual-ir.json`.
2. Produce or update `component-map.json` and `selector-map.json`.
3. Run the screenshot/DOM/ARIA capture matrix.
4. Run `compare-ir-to-dom.mjs`.
5. Run or update `rubric-report.json`.
6. Run `derive-next-actions.mjs`.
7. If using a cheaper executor, send exactly one action packet from `create-cheap-executor-packet.mjs`.
8. Primary agent verifies real diff, run artifacts, and `closeout-gate.json` before final response.

Cheap executors are implementation workers, not visual judges.

## Visual IR Contract

`visual-ir.json` must represent every visible section and required element. Every CTA, form, logo, nav item, image, chart, pricing card, and footer block must be a landmark. Required landmarks cannot be omitted, even if pixel diff is low.

Cheap executors must not reinterpret the original image. They receive the IR, plan, state, allowed file list, and one next adjustment. Read `references/cheap-executor.md` before delegating.

## Harness Requirements

For each validation run, produce:

- screenshots under `.visual-fidelity/runs/<run-id>/`;
- `.visual-fidelity/runs/<run-id>/dom-landmarks.json`;
- `.visual-fidelity/runs/<run-id>/aria-snapshot.yml`;
- `.visual-fidelity/runs/<run-id>/ir-dom-report.json`;
- `.visual-fidelity/runs/<run-id>/action-queue.jsonl`;
- `.visual-fidelity/runs/<run-id>/closeout-gate.json`;
- `.visual-fidelity/runs/<run-id>/run.json`;
- image diff/report when same-viewport reference exists;
- rubric report with category scores and critical caps.

Landing pages and long screens require viewport + scroll-stop validation. The hero cannot be the only validated section unless the task is explicitly hero-only.

Use existing repo Playwright visual tests first. If absent, use:

```bash
node ~/.agents/skills/visual-fidelity/scripts/generate-playwright-visual-test.mjs --route / --out e2e/visual-fidelity.spec.ts
```

or the skill matrix runner:

```bash
VISUAL_FIDELITY_BASE_URL=http://127.0.0.1:45231 \
  node ~/.agents/skills/visual-fidelity/scripts/run-visual-fidelity-matrix.mjs \
  --config .visual-fidelity/config.json \
  --max-diff-ratio 0.03
```

After editing this skill package, run:

```bash
node ~/.agents/skills/visual-fidelity/scripts/validate-skill-package.mjs
node ~/.agents/skills/visual-fidelity/scripts/benchmark-visual-fidelity-hardening.mjs
```

The package validator protects frontmatter, reference routing, required scripts, public-corpus size budgets, local-path hygiene, and benchmark coverage.

## Critical Rules

- Do not create an inspired variation.
- Do not add cards, badges, borders, shadows, wrappers, icons, or text that do not exist in the reference or current product requirements.
- Do not remove or fake functional behavior to improve pixels.
- Pixel diff is evidence, not final judgment.
- DOM landmark failure overrides visual similarity.
- Missing required landmarks cap the score and block `done`.
- If two or more scroll-stops have blocking divergences, status is `structural correction still required`.
- Expensive models own source interpretation, Visual IR, rubric, preservation/rebuild decisions, and final audit.
- Cheaper models may do only bounded CSS/layout/token edits from the artifacts.
- Before final response, run or manually satisfy `validate-closeout-gate.mjs`. The final answer must use the gate status. Do not use `done`, `complete`, `ready`, or equivalent language when `canSayDone=false`.

## References To Load On Demand

- `references/screenshot-only.md`: screenshot/PDF/image-only grounding and IR extraction.
- `references/figma-mcp.md`: Figma MCP and Code Connect workflow.
- `references/preserve-structure.md`: adapting existing UI without breaking behavior.
- `references/redesign-rebuild.md`: full rebuild with survival contracts.
- `references/cheap-executor.md`: bounded executor packet v2.
- `references/cheap-executor-v2.md`: one-action packet protocol for smaller models.
- `references/figma-mcp-v2.md`: Figma MCP source precedence and Code Connect routing.
- `references/model-routing.md`: high-capability vs cheap model routing.
- `references/golden-reference-integrity.md`: approved reference provenance and self-reference defense.
- `references/exhaustive-visual-compiler.md`: Visual IR v2, checklist, atlas, and landmark contracts.
- `references/closed-executor-packets.md`: closed packet schema and validation.
- `references/fraud-proof-closeout.md`: false-positive blockers and final gate.
- `references/model-routing-vnext.md`: compiler/judge vs packet executor routing.
- `references/figma-mcp-vnext.md`: Figma MCP source order and metadata requirements.
- `references/screenshot-only-vnext.md`: screenshot-only exhaustive analysis rules.
- `references/benchmark-vnext.md`: minimum benchmark fixture/protocol.
- `references/visual-rubric.md`: rubric schema, scoring, critical caps.
- `references/closeout.md`: statuses, final response, and forbidden language.
