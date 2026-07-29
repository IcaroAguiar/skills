# Citation Integrity

## Core Rule
Every factual statement in the authored output must map to a verifiable source lineage. If no reliable mapping exists, the claim is flagged or downgraded, not “filled” with weak references.

## Claim-to-Evidence Workflow
1. **Extract claim unit**
   - Identify every sentence containing a factual, statistical, methodological, or normative assertion.
2. **Attach evidence anchor**
   - Prefer direct source pages: DOI landing page, publisher PDF, accepted manuscript, or authoritative registry entry.
3. **Normalize identifiers**
   - Validate DOI/PMID/ISBN/URL consistency.
4. **Cross-check metadata**
   - Confirm title, authorship, year, venue, and edition/volume/issue when available.
5. **Assess quality fit**
   - Apply source-policy tiering before final insertion.
6. **Render citation format**
   - Keep style consistent across the document (APA 7, ABNT, Vancouver, etc.).
7. **Final consistency pass**
   - Verify every in-text marker has a bibliography match and reverse.

## Integrity Controls
- **No invented citations**: if a record is not recoverable, do not create it.
- **No reference laundering**: avoid replacing a weak source with another weak source that says the same phrase.
- **No anchor drift**: don’t cite a source that supports a nearby topic but not the actual claim.
- **No title drift**: if title/author mismatches appear, remove and re-verify before proceeding.
- **No overclaiming confidence**: include “evidência limitada/preliminar” when only preprint or abstract-level support is available.

## Detector-Aware Guardrails
- Do not optimize wording to mimic “human-like randomness” or “AI-like style.”
- Keep citation density tied to factual load, not style camouflage.
- If writing sounds formulaic, simplify prose and keep structure transparent; readability is preferred over opacity.

## Failure Handling
- If verification fails after retries:
  - mark confidence as low,
  - expose what was verified vs. what is unavailable,
  - avoid hallucinating compensatory references.

## Output Template for Uncertain Support
- “Ainda não confirmado por texto integral disponível; evidência disponível em [fonte] cobre apenas o escopo X.”
