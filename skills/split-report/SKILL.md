---
name: split-report
description: Render a Split Engineering ledger into a readable, live, self-contained HTML evidence canvas with graph state, gate history, per-thread implementation and test receipts, diffs, screenshots, videos, logs, risks, and the next user decision. Use only when explicitly invoked for a split report or by orchestrate-split at graph gates.
---

# Split Report

Turn the ledger and materialized artifacts into a fast-to-scan canvas. Prefer demos and behavioral proof over transcript dumps.

## Prepare evidence

1. Read [references/artifact-contract.md](references/artifact-contract.md).
2. Validate the ledger before rendering.
3. Require every mandatory artifact to exist locally. Block instead of emitting a broken remote path or inaccessible URL.
4. Curate screenshots, short clips, and high-signal log excerpts. Do not embed secrets, credentials, cookies, private keys, sensitive personal data, or unredacted production data.
5. Default the final report ceiling to 50 MB. Fail loudly if the self-contained output exceeds it.

## Render

Run:

```bash
node scripts/render-report.mjs <ledger.json> <report.html>
```

Regenerate the same canvas after gate, risk, replan, reopen, block, and milestone events. The renderer must remain dependency-free and offline-safe.

## Report in layers

Show:

1. Outcome, lifecycle state, graph version, progress, critical path, risks, blockers, and next decision.
2. The dependency graph and gate states.
3. One card per execution, integration, or test node: intent, ownership, implementation, reason, source identity, checks, receipts, thread, and residual risk.
4. A gallery of materialized screenshots, short videos, and selected logs.
5. Replans, invalidations, rejected evidence, skipped obligations, and retry history.
6. The embedded final ledger for audit without requiring separate files.

Do not paste raw transcripts or full logs. Link to persistent threads or PRs as navigation only; they never replace embedded mandatory proof.

## Finalize

After the user accepts the report, cleanup may remove intermediate artifacts only from the exact run directory:

```bash
node scripts/cleanup-run.mjs <ledger.json> <report.html> --confirm-run <run-id>
```

The helper must preserve the HTML, refuse broad or mismatched targets, and report every removed path.
