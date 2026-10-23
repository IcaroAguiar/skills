# Implementation brief: approved canvas → product

Paste this into every implementer's prompt after approval, filled with the area's values. Write it in the user's language.

## The canvas is the spec, down to the detail

The user approved what the canvas shows: composition, copy, and also borders, dividers, fonts, sizes, spacing, colors, and the theme it was rendered in. Reproduce it. "Same structure" is not done; "indistinguishable side by side" is done.

- **Same component, same look.** Use the UI package piece the canvas used. If the product already has a different component for the same job, and it looks different (a bordered badge where the canvas shows a filled pill, a wider sidebar, another table header style), that is a **deviation**, not a free choice.
- **Deviations need the user.** When reproducing the canvas exactly is impossible or would break something, stop and report it with both screenshots. Do not substitute silently. The orchestrator decides with the user and records the outcome in the README.
- **The canvas's "Mudanças no pacote de UI" list is part of the scope.** Each item there (a divider weight, a header style, a font) is implemented in the UI package itself, so every consumer gets it, not only the redesigned screens.
- **Product labels that the canvas changed are approved changes.** Labels the canvas copied from production stay unless a decision says otherwise.

## Parity gate (before review and before the PR)

1. Capture the canvas and the running app **in the same conditions**: same theme (the product's default, plus the other theme when it exists), same shell variant, same widths (1440 and 390), same screen and state. Name the files identically in two folders (`<ID>-<width>.png`).
2. Run `node pairs.mjs` from the canvas folder with `CANVAS`, `APP`, `PAIRS` and `UI_ROOT` set. It renders one side-by-side image per pair.
3. Open **every** pair and list each difference: frames and borders, dividers, fonts and case, sizes and widths, spacing, colors, icons, copy. Data differences (fake versus real records) are not deviations; everything else is.
4. Fix each difference, or report it as a deviation with the reason. Repeat until the list is empty or every remaining item is approved by the user.

## Report

- Files changed, grouped by area.
- The pairs folder, and the difference list with the outcome for each: fixed, or deviation awaiting approval.
- Tests and checks run, with their summary lines.
