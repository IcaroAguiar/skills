# Source Policy

## Objective
Prioritize verifiable, low-friction scholarly sources and keep every substantive claim grounded in retrievable evidence. The skill must optimize for trust and reproducibility, not volume of citations.

## Source Hierarchy
1. **Primary publication artifacts (highest)**
   - Published journal/conference papers, books, official reports, standards, and registry records.
   - Prefer stable identifiers (DOI, ISBN, ISBN-A, PMCID, legal docket ID).
2. **Primary indexing/metadata providers**
   - Crossref, OpenAlex, PubMed/PubMed Central, Europe PMC, DataCite.
   - Use these to verify title, authors, year, venue, and publication type.
3. **Author-supplied or institutional copies**
   - University repositories, publisher pages, and open repositories when the official publisher metadata is inaccessible.
4. **Secondary aggregators (lowest)**
   - Wikipedia, blogs, and social summaries only as contextual hints; never as the main evidence for a claim.

## Platform Prioritization (real platforms)
- **Crossref / DOI ecosystem**: canonical identifier backbone.
- **OpenAlex**: coverage mapping, field/venue context, institution links.
- **PubMed / Europe PMC**: life-sciences and medical grounding.
- **Google Scholar**: discovery aid only; verify matches via primary/source metadata.
- **arXiv / bioRxiv / medRxiv / SSRN**: preprint sources with explicit “preprint” labeling.
- **IEEE Xplore / ACL Anthology / ACM Digital Library / Springer / Wiley / Elsevier**: venue-specific checks when accessible.
- **Scopus / Web of Science**: optional paid-access metadata check if credentials are available.

## Acceptance Rules
- A claim in synthesis must include at least one **primary source**; if only preprint or secondary evidence exists, mark confidence as limited.
- Metadata conflicts (title/year/authors/DOI) must be resolved before accepting.
- Never fabricate bibliographic fields. If the title/identifier cannot be confirmed, the citation is omitted until confirmed.
- Do not infer unavailable methods/results from abstracts alone.
- If embargoed/paying sources are unavailable, cite the blocker explicitly and suggest equivalent accessible alternatives.

## Language and Ethics
- Prefer original language for legal and technical quotes, with translated paraphrase in the target language.
- Preserve exact terms for taxonomic names, scales, and equations unless explicitly rephrased with equivalence notes.
- Avoid over-citation of low-reliability sources for high-impact claims.

## Output Discipline
- Cite by source intent: **empirical claim**, **method claim**, **definition claim**, or **contextual claim**.
- If a statement depends on multiple pieces of evidence, use grouped, non-redundant citation packs (max 3 core sources unless justified).
