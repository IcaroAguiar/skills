---
name: split-report
description: Turn Split Engineering evidence into a native, user-visible review canvas with a concise outcome, screenshots, short demos, checks, risks, and the next user decision. Use only when explicitly invoked for a split report or by orchestrate-split at review gates.
---

# Split Report

Turn the ledger and materialized artifacts into a fast-to-scan review canvas. Prefer demos and behavioral proof over transcript dumps. The target experience is similar to a Cloud-agent completion: the user can understand the result before opening a diff.

Treat the canvas as evidence-first, not a prose status report. When visual, API, or code proof exists, display the proof directly in the canvas before explaining it. Never replace available proof with a sentence that merely says it exists.

Keep the default canvas minimal enough to review at a glance: name the requested behavior, show the proof, state whether it works, and disclose only material risk. Limit the initial summary to one outcome line and at most three verification bullets. Put background, process detail, and exhaustive diagnostics behind expandable detail or navigation.

Before presenting, create a requirement-to-proof map. Every material requested behavior must have an observable result, decisive visual or runtime/API evidence, the smallest implementation anchor (file and symbol or excerpt), and its proving check. An item may be not applicable only with a reason. Do not claim completion while a material request lacks mapped proof. Present the map as compact reviewer-facing groups: each group leads with proof, then shows the relevant code/API construction and rationale directly after it.

## Prepare evidence

1. Read [references/artifact-contract.md](references/artifact-contract.md).
2. Validate the ledger before rendering.
3. Require every mandatory artifact to exist locally. Block instead of claiming a broken or inaccessible artifact exists.
4. Curate screenshots, short clips, and high-signal log excerpts. Do not embed secrets, credentials, cookies, private keys, sensitive personal data, or unredacted production data.
5. Keep each artifact compact enough to open quickly. A screenshot is preferred over a video unless the interaction sequence itself is proof.

## Present the canvas

Present the canvas directly in the active harness. Do not generate a styled HTML page by default.

When the harness supports rich timeline content, use that surface. Attach or display local screenshots and short videos directly. When it does not, create one concise Markdown artifact with relative links to the local evidence. In either case, retain the ledger as the technical source of truth.

Choose the proof format from the changed behavior:

- **UI or user journey:** show a guided visual walkthrough, not a generic gallery. For every material requested surface or state, show its decisive screenshot inline (or a compact before/after pair), and add the natural-speed video when the interaction sequence matters. Caption each asset with the requested behavior, what changed there, and how the visible state proves it; retain enough surrounding context to judge the implementation.
- **API or integration:** show a compact, redacted request/result summary with status, key response fields, and the real command or journey that produced it. Follow it with a compact API design card: endpoint and method, resource/action semantics, meaningful statuses, field names, and why that vocabulary and contract fit the domain. Show the smallest relevant route, handler, or schema excerpt that proves construction. Do not paste full payloads or secrets, and do not make a response payload the only proof or explanation.
- **Code-only behavior:** show the smallest relevant diff or code excerpt plus the test that proves the behavior. Do not use a file list as proof.
- **Operational or infrastructure behavior:** show the bounded health, migration, deployment, or runtime evidence that demonstrates the promised state.

If a required proof cannot be displayed in the current surface, attach or link the local artifact and state that limitation. A text-only completion is acceptable only when no richer proof is applicable or available.

After presenting it, record the surface before moving the run to review:

```bash
node ../orchestrate-split/scripts/run-ledger.mjs present-canvas <ledger.json> --surface <active-harness>
```

Refresh the same canvas after gate, risk, replan, reopen, block, and milestone events. It must read like a current review surface, not like a static design mockup.

## Report in layers

Show, in this order:

1. **Proof** — inline media or compact live outputs appropriate to the behavior, with a one-line caption for each item.
2. **Outcome** — one line connecting the requested behavior to the observed result and current decision state.
3. **What was verified** — a short list of real journeys or commands with their result, source identity, and remaining risk.
4. **Work summary** — changed areas, the smallest useful diff or code excerpt, and navigation to the full change.
5. **Plan and exceptions** — compact mission status, blockers, replans, skipped obligations, and retry history.
6. **Next decision** — the single review choice currently required from the user.

Do not paste raw transcripts or full logs. Do not present a predesigned dashboard, a generic card grid, or a dense JSON audit as the primary user experience. Do not lead with a textual claim when proof can be displayed. Avoid implementation narration that does not help a reviewer decide whether the requested behavior works. Links to persistent tasks, commits, diffs, PRs, and local artifacts are navigation; they never replace the required visual and behavioral proof.

## Finalize

After the user accepts the canvas, retain the selected final screenshots, videos, curated logs, and ledger by default. Cleanup may remove only intermediate artifacts from the exact run directory:

```bash
node scripts/cleanup-run.mjs <ledger.json> --retain-dir <final-evidence-dir> --confirm-run <run-id>
```

The helper must preserve the selected final evidence, refuse broad or mismatched targets, and report every removed path. Remove retained final evidence only after the related merge has been verified.
