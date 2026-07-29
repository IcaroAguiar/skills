# Detector Limitations

## Scope
This policy treats AI-text/novelty detectors as **diagnostic signals**, not truth or intent validators.

## What detectors can and cannot do
- They can signal pattern-level anomalies, fluency artifacts, repetição estatística e similaridades estilísticas.
- They cannot reliably infer authorship intent.
- They cannot substitute source verification, peer review, or experimental reproducibility.
- They may flag genuine multilingual academic writing, translation-heavy writing, or formula-heavy sections as suspicious.

## Risk Types
1. **False positives**: legitimate manuscripts with tight formal style or templated methods language.
2. **False negatives**: texts generated or edited by advanced tools that still look human-like.
3. **Domain drift**: detector behavior differs by language, field, and document length.
4. **Context bias**: preprints, abstracts, and legal language often carry distinct signatures.

## Operational Guidance
- Never promise or attempt bypass behavior.
- Use results only as a quality hint for disclosure, variation of sentence structure, and clarity.
- Prioritize **substantive quality** (argument rigor, evidence, coherence, citations) over detector score tuning.
- If a draft is marked risky, apply human review + evidence re-check, not adversarial rewrites.

## Communication Standard
- Report detector outputs as:
  - indicators with confidence band,
  - affected sections,
  - likely cause (e.g., formula-heavy passage, repetitive sentence scaffolding),
  - concrete remediation (clarify claims, diversify syntax, strengthen transitions).
- Never report “pass/fail final” as proof of legitimacy.

## Tradeoffs
- Aggressive sanitização to reduce all detector flags can reduce clarity and distort methodological precision.
- Keeping strict academic style can increase false positives in some models.
- Balanced target: preserve semantic fidelity and citation quality first, then improve linguistic variation only where it helps readability and precision.
