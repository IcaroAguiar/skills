#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key.startsWith("--")) {
      args[key.slice(2)] = value && !value.startsWith("--") ? value : true;
      if (value && !value.startsWith("--")) i++;
    }
  }
  return args;
}

function writeIfMissing(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

const args = parseArgs(process.argv);
const root = path.resolve(args.root || process.cwd());
const route = args.route || "/";
const sourceType = args.sourceType || "screenshot-only";
const mode = args.mode || "maximum-fidelity-preserve-structure";
const viewport = {
  width: Number(args.width || 1440),
  height: Number(args.height || 900),
  deviceScaleFactor: Number(args.deviceScaleFactor || 1)
};
const base = path.join(root, ".visual-fidelity");

fs.mkdirSync(path.join(base, "references"), { recursive: true });
fs.mkdirSync(path.join(base, "references", "atlas"), { recursive: true });
fs.mkdirSync(path.join(base, "runs"), { recursive: true });
fs.mkdirSync(path.join(base, "lessons"), { recursive: true });
fs.mkdirSync(path.join(base, "analysis"), { recursive: true });
fs.mkdirSync(path.join(base, "contracts"), { recursive: true });
fs.mkdirSync(path.join(base, "packets"), { recursive: true });

const created = [];

if (writeIfMissing(path.join(base, "state.md"), `# Visual Fidelity State

- objective visual: TODO
- source type: ${sourceType}
- reference confidence: medium
- execution mode: ${mode}
- route/component target: ${route}
- viewport: ${viewport.width}x${viewport.height}@${viewport.deviceScaleFactor}
- iteration budget: 3
- current iteration: 0
- files altered: none
- elements already corrected: none
- elements still divergent: TODO
- functional constraints that must not break: TODO
- latest run: none
- latest screenshot artifact: none
- latest diff/report artifact: none
- next priority adjustment: create visual spec, IR, plan, and rubric
`)) created.push(".visual-fidelity/state.md");

if (writeIfMissing(path.join(base, "visual-spec.md"), `# Visual Spec

## Source

- source type: ${sourceType}
- confidence: medium
- viewport: ${viewport.width}x${viewport.height}@${viewport.deviceScaleFactor}

## Structure

TODO

## Landmark Inventory

TODO

## Tokens

TODO

## Allowed Deviations And Unknowns

TODO
`)) created.push(".visual-fidelity/visual-spec.md");

if (writeIfMissing(path.join(base, "visual-ir.json"), `${JSON.stringify({
  source_type: sourceType,
  viewport,
  page: {
    background: "TODO",
    maxWidth: "TODO",
    layoutModel: "mixed",
    scrollStops: [{ id: "hero", yStart: 0, yEnd: viewport.height, status: "pending" }]
  },
  tokens: { colors: [], typography: [], spacing: [], radius: [], shadow: [] },
  landmarks: [],
  mustNotOmit: [],
  allowedDeviations: [],
  unknowns: []
}, null, 2)}\n`)) created.push(".visual-fidelity/visual-ir.json");

if (writeIfMissing(path.join(base, "analysis", "visual-ir.v2.json"), `${JSON.stringify({
  version: 2,
  sourceContext: { sourceType, referenceConfidence: "medium", approvedReferenceId: "TODO" },
  viewport,
  cropBoundaries: [],
  browserOrPresentationFrame: "unknown",
  sectionTree: [],
  layoutGeometry: [],
  relativePositions: [],
  typographyInventory: [],
  colorInventory: [],
  spacingInventory: [],
  imageInventory: [],
  decorativeInventory: [],
  ctaInventory: [],
  forbiddenOmissions: [],
  ambiguities: [],
  implementationTargetHints: []
}, null, 2)}\n`)) created.push(".visual-fidelity/analysis/visual-ir.v2.json");

if (writeIfMissing(path.join(base, "analysis", "visual-checklist.json"), `${JSON.stringify({
  version: 1,
  items: []
}, null, 2)}\n`)) created.push(".visual-fidelity/analysis/visual-checklist.json");

if (writeIfMissing(path.join(base, "visual-plan.md"), `# Visual Plan

- route/component target: ${route}
- execution mode: ${mode}
- validation command: TODO

## Target Files

TODO

## Visual Block Mapping

TODO

## Preserved Behavior / Survival Map

TODO

## Risks

TODO
`)) created.push(".visual-fidelity/visual-plan.md");

if (writeIfMissing(path.join(base, "visual-rubric.json"), `${JSON.stringify({
  scale: "0_to_5",
  passingScore: 4.3,
  categories: [
    { id: "core_completeness", weight: 0.25, description: "Required sections, elements, CTAs, text, and assets are present." },
    { id: "structure_layout", weight: 0.30, description: "Spatial layout, hierarchy, grid, alignment, proportions, and scroll rhythm match." },
    { id: "text_content", weight: 0.15, description: "Visible text, labels, nav items, numbers, and form text match." },
    { id: "visual_tokens", weight: 0.15, description: "Color, typography, radius, borders, shadows, and backgrounds match." },
    { id: "interaction_preservation", weight: 0.10, description: "Links, forms, states, route behavior, and accessibility contracts remain intact." },
    { id: "render_cleanliness", weight: 0.05, description: "No broken assets, layout overflow, unintended placeholders, or rendering artifacts." }
  ],
  criticalCaps: [
    { condition: "any required landmark missing", maxScore: 3.0, status: "structural correction still required" },
    { condition: "primary hero/form/navigation structurally wrong", maxScore: 3.4, status: "structural correction still required" },
    { condition: "two or more scroll-stops have blocking divergences", maxScore: 3.8, status: "structural correction still required" },
    { condition: "form, route, link, auth, data state, or critical interaction broken", maxScore: 3.5, status: "not ready" },
    { condition: "pixel diff passes but semantic landmark audit fails", maxScore: 3.8, status: "not ready" }
  ]
}, null, 2)}\n`)) created.push(".visual-fidelity/visual-rubric.json");

if (writeIfMissing(path.join(base, "component-map.json"), `${JSON.stringify({
  version: 1,
  route,
  entries: []
}, null, 2)}\n`)) created.push(".visual-fidelity/component-map.json");

if (writeIfMissing(path.join(base, "selector-map.json"), `${JSON.stringify({
  version: 1,
  entries: []
}, null, 2)}\n`)) created.push(".visual-fidelity/selector-map.json");

if (writeIfMissing(path.join(base, "references", "manifest.json"), `${JSON.stringify({
  version: 1,
  references: []
}, null, 2)}\n`)) created.push(".visual-fidelity/references/manifest.json");

if (writeIfMissing(path.join(base, "contracts", "landmark-contract.json"), `${JSON.stringify({
  version: 1,
  criticalLandmarks: [],
  requiredLandmarks: [],
  forbiddenOmissions: []
}, null, 2)}\n`)) created.push(".visual-fidelity/contracts/landmark-contract.json");

if (writeIfMissing(path.join(base, "contracts", "golden-integrity.json"), `${JSON.stringify({
  version: 1,
  valid: false,
  blockers: ["reference manifest not validated yet"]
}, null, 2)}\n`)) created.push(".visual-fidelity/contracts/golden-integrity.json");

if (writeIfMissing(path.join(base, "contracts", "reference-integrity.json"), `${JSON.stringify({
  version: 1,
  valid: false,
  blockers: ["reference integrity not validated yet"]
}, null, 2)}\n`)) created.push(".visual-fidelity/contracts/reference-integrity.json");

if (writeIfMissing(path.join(base, "config.json"), `${JSON.stringify({
  route,
  viewports: [
    { name: "desktop", width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor },
    { name: "mobile", width: 390, height: 844, deviceScaleFactor: 1 }
  ],
  scrollStops: [
    { id: "hero", y: 0 }
  ],
  stabilization: {
    disableAnimations: true,
    hideCaret: true,
    waitForFonts: true,
    waitForImages: true,
    networkIdle: true,
    stylePath: ".visual-fidelity/screenshot.css"
  },
  thresholds: {
    maxDiffRatio: 0.03,
    maxBlockingScrollStops: 0,
    minRubricScore: 4.3
  }
}, null, 2)}\n`)) created.push(".visual-fidelity/config.json");

console.log(JSON.stringify({ root, created }, null, 2));
