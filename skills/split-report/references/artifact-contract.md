# Artifact Contract

Artifacts live under the exact run staging directory until the final report is accepted.

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

Remote-only paths and URLs are not materialized artifacts. Transfer the file into the run directory first.

## Curation

- Include screenshots for decisive UI states and applicable viewports.
- Include short clips for interactions whose sequence matters.
- Include only high-signal log excerpts needed to prove a result or failure.
- Exclude raw transcripts, duplicate outputs, caches, dependencies, full builds, and secrets.
- Default the self-contained report limit to 50 MB.

## Cleanup

Cleanup is allowed only after the report renders successfully, the embedded ledger lists every required artifact, the user accepts the report, and the command names the exact run ID. Preserve the final HTML outside the run staging directory.
