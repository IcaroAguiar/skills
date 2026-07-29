#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function readJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const reportJson = readJson(".visual-fidelity/runs/report.json");
const now = new Date().toISOString();

const markdown = `# Visual Fidelity Audit

Generated at: ${now}

## Inputs

- Reference: .visual-fidelity/references/reference.png
- Actual: .visual-fidelity/runs/actual.png
- Diff: .visual-fidelity/runs/diff.png
- Route: see .visual-fidelity/config.json
- Viewport: see .visual-fidelity/config.json

## Pixel Comparison

${
  reportJson
    ? `- Passed: ${reportJson.passed}
- Diff ratio: ${reportJson.diffRatio}
- Max diff ratio: ${reportJson.maxDiffRatio}
- Diff pixels: ${reportJson.diffPixels}
- Compared size: ${reportJson.compared?.width}x${reportJson.compared?.height}`
    : "- No pixel comparison report was available."
}

## Manual Browser Validation

Fill during Codex Browser Use review:

- Browser tool used:
- Route opened:
- Viewport used:
- Screenshot captured:
- Major divergences found:
- Divergences fixed:

## Landmark Inventory

Fill before coding and update after Browser Use review:

| Section | Required anchors | Output status | Notes |
|---|---|---|---|
| Header |  |  |  |
| Hero |  |  |  |
| Benefits |  |  |  |
| Cards/modules |  |  |  |
| Method/process |  |  |  |
| Structure/proof |  |  |  |
| CTA/footer |  |  |  |

## Scroll-Stop Audit

Fill during Browser Use review:

| Stop | Expected anchors | Divergences found | Patch applied | Remaining divergences |
|---|---|---|---|---|
| Hero |  |  |  |  |
| Benefits/cards |  |  |  |  |
| Method/process |  |  |  |  |
| Structure/proof |  |  |  |  |
| Final CTA |  |  |  |  |
| Footer |  |  |  |  |

## Blocking Closeout

Do not claim completion unless each item is checked or explicitly blocked:

- [ ] No empty panels, unfinished columns, or blank media areas
- [ ] No sticky/fixed header clipping anchors or section starts
- [ ] No wrong dominant image, repeated wrong image, or bad focal crop
- [ ] Method/process has complete timeline and intended split composition
- [ ] Structure/proof has required labels, chips, overlays, and filled side content
- [ ] Final CTA includes intended image/mockup/brand moment
- [ ] Footer is complete and not simplified
- [ ] Cards, CTA bands, and key anchors are not hidden by animation or initial state
- [ ] Lower-page sections remain as intentional as the hero

## Structural Correction Gate

- Failed scroll-stops count:
- If count is 2 or more, final status must be structural correction still required.
- Ordered repair list:
  1. Sticky/anchor clipping:
  2. Missing/truncated sections:
  3. Wrong images/crops:
  4. Incomplete split compositions:
  5. Empty panels/unfinished columns:
  6. Missing chips/overlays/visual anchors:
  7. CTA/footer composition:
- Taste/polish deferred until structural failures are resolved:

## Proportion Calibration

Fill before final acceptance:

- Reference source type:
- Scale limitations detected:
- Header height/logo/nav decision:
- Hero height and first-viewport impact:
- Fold budget:
- Section separation decisions:
- Generated/compressed reference adaptations:

## Surface Audit

Fill after running audit-surface-overuse:

- Audit command run:
- Findings:
- Justified surfaces:
- Removed surfaces:

## Taste Calibration

Fill after the structural fidelity pass:

- Components made thinner or more delicate:
- Transparency/materiality decisions:
- Motion added:
- Shine/light accents added:
- Effects intentionally skipped:
- prefers-reduced-motion considered:

## Remaining Differences

List honest remaining differences:

1.
2.
3.

## Missing Assets Or Blockers

List missing fonts, logos, images, icons, unavailable viewport controls, or repo constraints:

1.
2.
3.

## Final Status

- [ ] Accepted
- [ ] Needs another visual pass
- [ ] Blocked by missing asset/constraint
`;

const out = ".visual-fidelity/runs/visual-audit.md";
ensureDir(out);
fs.writeFileSync(out, markdown);

console.log(`Wrote ${out}`);
