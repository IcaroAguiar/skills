---
name: advisor-split
description: Preserve compatibility for Split Engineering runs that still invoke advisor-split. Use only inside the Split Engineering suite; forward the supplied decision packet to the canonical engineering-advisor skill and never duplicate its advisory protocol.
---

# Advisor Split

Act as a compatibility wrapper for `$engineering-advisor`.

1. Require the orchestrator to supply a self-contained advisory packet with objective, non-goals, exact decision, decision owner, current evidence, constraints, realistic options, assumptions, unknowns, risk, and proposal under review.
2. Invoke `$engineering-advisor` with that packet.
3. Preserve the returned advisory receipt without weakening `REVISE`, `EXPERIMENT`, or `STOP`.
4. Return it to the orchestrator; never communicate an accepted decision or execute work.

Do not maintain a second output contract here. The canonical protocol, effort selection, recursion guard, evidence labels, and authority boundaries belong to `$engineering-advisor`.
