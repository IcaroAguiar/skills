# Executor Contract

## First response: reconstruct before writing

Return:

1. objective and observable delivery;
2. owned and forbidden surfaces;
3. dependencies and source state;
4. planned implementation steps;
5. credible failure modes and scope-drift risks;
6. proportional local checks and expected receipts;
7. questions or assumptions requiring orchestrator guidance.

Do not edit until the orchestrator accepts this reconstruction.

## During work

- Preserve unrelated user and peer changes.
- Stay within ownership and approved authority.
- Report a meaningful milestone, false assumption, contract change, scope expansion, risk, or blocker immediately.
- Stop for replan instead of silently widening a material contract field.
- Make the smallest coherent implementation. Do not add speculative abstractions or tests that prove trivialities.

## Completion receipt

Return structured fields:

- `nodeId`, `graphVersion`, `threadId` or agent ID;
- repository, host, checkout, branch, base, and final source SHA or diff identity;
- delivery summary and why it satisfies acceptance;
- changed files and local commits;
- exact commands and behavior covered by each check;
- result, environment, relevant configuration, and artifact paths;
- baseline failures distinguished from regressions with evidence;
- skipped obligations, blockers, residual risk, and prohibited actions not taken.

Completion is a claim until the orchestrator admits the receipt.
