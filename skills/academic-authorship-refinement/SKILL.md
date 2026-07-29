---
name: academic-authorship-refinement
description: Use for academic authorship refinement, research-grounded revision, citation integrity checks, detector-aware style diagnostics, manuscript/proposal/report polishing, and author-in-the-loop scholarly editing. Do not use for detector bypass, citation fabrication, plagiarism, or hiding authorship.
---

# Academic Authorship Refinement

## Purpose

Improve academic writing while preserving factual grounding, citation integrity,
author intent, and institutional ethics. Treat detector-like signals as style
diagnostics only; never promise detector bypass or use them as proof of human
authorship.

## First Principles

- Preserve authorship: refine the author's argument, evidence, and voice instead
  of replacing them with generic model prose.
- Separate truth from style: retrieval and citation checks happen before final
  polish.
- Mark uncertainty explicitly: unsupported claims, partial support, missing
  metadata, and policy constraints must remain visible.
- Prefer reproducible sources and deterministic checks over opaque commercial
  humanizer APIs.
- Do not edit references, claims, or methods silently.

## Required Workflow

1. **Intake**
   - Identify genre, field, target venue/institution, audience, citation style,
     draft stage, author stance, and allowed AI-assistance policy.
   - If the user's thesis, contribution, constraints, or intended claims are
     unclear, ask targeted questions before substantial rewriting.

2. **Claim extraction**
   - Split the draft into atomic factual, interpretive, methodological, and
     normative claims.
   - Label each claim as `sourced`, `needs_source`, `author_reasoning`, or
     `unsupported`.
   - Use `prompts/claim-extraction.md` for the output contract when the task is
     complex or citation-sensitive.

3. **Retrieval and grounding**
   - Prefer a provided local bibliography, Zotero export, BibTeX, RIS, DOI list,
     or source pack before external discovery.
   - Otherwise use approved scholarly sources from `references/source-policy.md`.
   - Never invent a source. If retrieval is unavailable, mark claims for manual
     verification.

4. **Citation integrity**
   - Verify identifier, title, authors, year, venue, and claim-source relevance.
   - Classify support as `supported`, `partially_supported`, `unsupported`, or
     `uncertain`.
   - Use `references/citation-integrity.md` before changing references.

5. **Refinement passes**
   - Improve argument structure, paragraph function, evidence placement,
     hedging, transitions, academic tone, and reader burden.
   - Reduce formulaic model artifacts only when doing so improves clarity,
     authorial reasoning, or rhetorical fit.
   - Do not rely on synonym swapping, random errors, or detector-specific tricks.

6. **Detector-aware diagnostic**
   - Report regularity signals: repeated transitions, paragraph symmetry,
     uniform cadence, generic abstractions, excessive smoothing, and unsupported
     certainty.
   - Do not claim a text will pass any detector.
   - Use `references/detector-limitations.md` and `prompts/detector-audit.md`
     when producing a formal diagnostic.

7. **Final QC**
   - Return revised text plus a concise audit: changed claims, unsupported
     claims, citation issues, style risks, skipped checks, and residual human
     review needs.

## When To Load References

- `references/source-policy.md`: source priority, API tradeoffs, legal and
  reproducibility constraints.
- `references/citation-integrity.md`: reference verification, semantic citation
  support, and bibliography safety.
- `references/detector-limitations.md`: detector behavior, false positives, and
  ethical constraints.
- `references/academic-style-rubrics.md`: academic style, genre, and revision
  rubrics.
- `references/venue-profiles.md`: discipline and venue conventions.

## Prompt Modules

- `prompts/intake.md`: use when the user provides a broad writing task or an
  under-specified academic draft.
- `prompts/claim-extraction.md`: use before citation-sensitive refinement.
- `prompts/evidence-synthesis.md`: use after retrieval to summarize source
  support without overclaiming.
- `prompts/refinement-pass.md`: use for controlled multi-pass revision.
- `prompts/detector-audit.md`: use for detector-aware quality diagnostics.
- `prompts/final-qc.md`: use before claiming the draft is ready for submission
  or review.

## Deterministic Helpers

Use scripts when available instead of re-creating checks in prose:

- `scripts/claim_source_matrix.py`: produce a claim-source matrix from structured
  claims and source metadata.
- `scripts/verify_references.py`: validate reference metadata and identifier
  consistency without network access unless explicitly configured.
- `scripts/style_metrics.py`: compute rough cadence and regularity metrics.
- `scripts/audit_report.py`: combine check outputs into a reviewable report.
- `scripts/normalize_metadata.py`: normalize records from adapters or local
  exports.
- `scripts/retrieve_sources.py`: orchestrate deterministic local fixture
  adapters. Real network retrieval requires future provider adapters with
  explicit rate limits, timeouts, caching, and credential handling.

## Real Skill Test Protocol

Use this protocol before treating an installed copy as operational:

1. Run the deterministic tests from the skill root:
   `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_*.py'`.
2. Run a CLI audit smoke using `tests/fixtures/claims.json` and
   `tests/fixtures/sources.json`; confirm `claim_support_ratio` and reference
   validation appear in the JSON output.
3. In a fresh Codex/OpenCode session, ask for
   `academic-authorship-refinement` explicitly on a short academic draft with two
   factual claims and one unsupported claim.
4. Accept the result only if the agent loads this skill, preserves unsupported
   claims as visible risk, does not invent citations, and returns the output
   contract.

If the skill does not trigger automatically, invoke it by name once and verify
the installed path is present in the runtime skill registry.

## Output Contract

For material academic refinement, return:

- revised text or a patch-style revision
- change summary
- claim-source matrix or explanation why it was skipped
- citation audit or explanation why it was skipped
- detector-aware style diagnostic
- unsupported claims and required human review
- residual risks

## Hard Prohibitions

- Do not promise detector bypass, invisibility, or guaranteed human
  classification.
- Do not fabricate citations, quotes, page numbers, DOIs, PMIDs, arXiv IDs,
  venues, authors, or findings.
- Do not hide AI assistance or advise policy evasion.
- Do not rewrite unsupported claims into more persuasive language without marking
  them.
- Do not mutate `.bib`, RIS, CSL JSON, or bibliography records unless metadata
  has been verified.
- Do not scrape sources whose terms prohibit automated access.
