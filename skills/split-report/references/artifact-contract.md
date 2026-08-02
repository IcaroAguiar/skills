# Artifact Contract

Artifacts live under the exact run staging directory until the final canvas is accepted.

## Ledger artifact fields

Each artifact uses:

- `id`: stable unique identifier;
- `nodeId`: producing node;
- `label`: human-readable title;
- `kind`: `image`, `video`, `log`, or `text`;
- `path`: absolute or ledger-relative local path;
- `mime`: explicit MIME type when it cannot be inferred;
- `required`: whether report rendering must block when unavailable;
- `summary`: what the artifact proves;
- `redacted`: confirmation that sensitive data was removed.
- `retain`: whether the accepted final canvas must preserve this artifact outside the run directory; default to `true` for final screenshots, videos, curated logs, and the ledger.

Remote-only paths and URLs are not materialized artifacts. Transfer the file into the run directory first.

## Curation

- Include screenshots for decisive UI states and applicable viewports.
- Include short clips for interactions whose sequence matters.
- Include only high-signal log excerpts needed to prove a result or failure.
- Exclude raw transcripts, duplicate outputs, caches, dependencies, full builds, and secrets.
- Prefer a small number of decisive assets that can be displayed directly in the active harness.
- Use video only when a sequence of interaction is the proof; otherwise use screenshots with clear captions.
- Do not turn the evidence into a static HTML dashboard by default.

## Cleanup

Cleanup is allowed only after the required evidence is present locally, the user accepts the canvas, and the command names the exact run ID. The cleanup helper copies only artifacts marked `retain: true` to an explicit final-evidence directory before removing the run directory. Retain that final evidence until the related merge is verified; only then may it be removed.
