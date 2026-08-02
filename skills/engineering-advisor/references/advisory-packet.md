# Advisory packet

Send a self-contained packet. Put `proposal_under_review` last so the advisor derives criteria before seeing the author's preference.

```yaml
audience: user | orchestrator
mode: decision | challenge | unblock | risk-check
requested_effort: xhigh | max
decision_statement: the exact choice to make
decision_owner: the person or role authorized to accept it
objective: the outcome that matters
non_goals:
  - explicit exclusions
hard_constraints:
  - constraints that cannot be traded away
authority_boundaries:
  - read-only or external-action limits
observed_facts:
  - fact plus source path, revision, environment, or runtime receipt
source_backed_evidence:
  - claim plus its primary source
criteria:
  - decision criteria, if already known
hard_gates:
  - conditions every acceptable option must satisfy
realistic_options:
  - status quo
  - option A
  - option B
assumptions:
  - unverified belief
unknowns:
  - material missing information
irreversibility: low | medium | high, with reason
deadline: none or exact deadline
proposal_under_review: author's current preference, or none
```

## Packet rules

- Include only decision-relevant context.
- Preserve exact repository, branch, head, environment, and command results when code or operations are involved.
- Attach raw artifacts or paths instead of summarizing away decisive details.
- Separate missing discoverable evidence from a missing user-owned choice.
- Do not include the expected verdict, planted flaw, test oracle, or another reviewer's conclusion unless that conclusion is the proposal being challenged.
- If a required field is unknown, write `unknown`; do not silently omit it.
