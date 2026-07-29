# Artifact Contract

This file defines the stable artifacts produced by the skill's deterministic and
agentic passes. It is for implementers and tests, not required reading for every
skill invocation.

## Core Artifacts

- `claim-source-matrix.md`: table of claim ID, claim text, claim type, source
  IDs, support status, and notes.
- `citation-audit.json`: machine-readable reference verification results.
- `style-audit.json`: machine-readable style metrics and detector-style signals.
- `revision-notes.md`: user-facing explanation of substantive changes.
- `evidence-ledger.json`: normalized source records and retrieval provenance.

## Status Vocabulary

- `supported`: source directly supports the claim.
- `partially_supported`: source supports part of the claim or requires narrower
  wording.
- `unsupported`: no provided or retrieved source supports the claim.
- `uncertain`: metadata or full-text access is insufficient for a confident
  decision.

## Quality Gate

A final academic refinement is not complete until unsupported claims and citation
uncertainties are visible in the final response or artifacts.
