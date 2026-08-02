# Modes and advisory receipt

## Mode checklists

### Decision

- Compare the status quo and realistic alternatives against derived criteria and hard gates.
- Identify the decisive trade-off and any sensitivity point that would change the recommendation.
- Recommend one option.

### Challenge

- Test the proposal's strongest claim, boundary assumptions, failure modes, and verification posture.
- Distinguish a material defect from an acceptable residual risk.
- Return `PROCEED` when no material issue is found; do not invent a correction.

### Unblock

- Rank competing hypotheses using current evidence.
- Return the smallest read-only or reversible experiment that distinguishes the leading hypotheses.
- State hypothesis, observation, interpretation, and stop condition.

### Risk check

- Map each material requirement to observable evidence and a proving check.
- Identify skipped checks, stale evidence, irreversibility, and residual risk.
- Do not convert missing optional evidence into a blocker.

## Required receipt

Return concise Markdown with these headings in order:

```markdown
## Advisory receipt

**Mode:** decision | challenge | unblock | risk-check
**Verdict:** PROCEED | REVISE | EXPERIMENT | STOP
**Decision owner:** ...
**Confidence:** high | medium | low — reason

### Recommendation
One recommendation, experiment, or stop signal.

### Decisive evidence
- [observed] ...
- [source-backed] ...
- [inference] ...

### Options and trade-offs
Status quo and realistic alternatives, including the sensitivity point.

### Failure modes and mitigations
Only material failure modes.

### Assumptions and unknowns
Explicit assumptions, unknowns, and what would change the verdict.

### Next action
Exactly one action owned by the decision owner or orchestrator.
```

For `EXPERIMENT`, include the hypothesis, expected observation, interpretation, and stop condition under Recommendation. For `STOP`, identify exactly one missing authority, choice, or evidence gap.
