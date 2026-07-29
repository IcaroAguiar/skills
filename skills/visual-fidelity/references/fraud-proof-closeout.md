# Fraud-Proof Closeout

`passed: true` is invalid when:

- rubric report is null or incomplete;
- `reference-integrity.json` is absent or invalid;
- `closeout-gate.json` is absent;
- `fraud-proof-closeout.json` is absent;
- any critical landmark is absent;
- any forbidden omission is present;
- reference is self-generated or unverified;
- comparison is only against screenshots from the current runtime;
- primary agent did not compare actual vs approved source directly;
- global diff is acceptable but a critical region fails threshold;
- screenshots exist but golden manifest does not;
- baseline updated during same execution, including any attempt to refresh a golden while validating the same run.

Pixel diff is a detector, not a judge.

Visually wrong implementations fail even with low global diff. Visually correct implementations pass only when provenance, landmarks, semantic structure, regional rubric, and actual-vs-approved-source evidence pass.

Allowed hard statuses:

- `ready`
- `minor residual differences`
- `structural correction still required`
- `functional correction still required`
- `screenshot validation blocked`
- `source insufficient`

When `canSayDone=false`, final response must not use success language.
