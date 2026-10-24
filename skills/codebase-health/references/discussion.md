# Discussion: from diagnosis to roadmap

Write in the user's language. Lead with what they need to decide, not with method.

## Shape

1. **Headline numbers** (three to five): the ones that explain the pain, each with its source. Example: "PR takes 23 min wall: 15 compute + 6.5 queue on one runner (60 runs); 40% of PR runs fail, half for infrastructure."
2. **Findings per dimension**, worst first. Each: what, evidence, cost (time, failures, lines, risk), and the simplest fix.
3. **Decisions for the user.** Only what changes scope, product, architecture or risk. For each: the question, two or three options with trade-offs, and your recommendation first. Examples: which app owns a duplicated screen; whether browser tests leave the PR gate; whether to authorize cutting tests.
4. **Roadmap**: small PRs in dependency order, each with its done-when and the instrument that will prove the gain.

Use a visual where it carries the point: a pipeline diagram for delivery, a dependency sketch for architecture, a table for counts.

## Ordering the roadmap

1. **Stability:** infrastructure failures out of CI.
2. **Guardrails:** hooks and checks that stop new debt (dead-code check, size budget, boundaries) before cleaning old debt.
3. **Speed without changing assertions:** module loading, isolation settings, parallelism, change detection.
4. **Removals:** dead code, near-copies, low-value tests; each block proven covered elsewhere before deletion.
5. **Refactors:** abstraction and architecture changes, after the decisions, coordinated with whoever is changing the same areas.

## Recording

After the user decides: an epic issue with the diagnosis and one issue per front, linked; the full reports stay in the task folder and are summarized, never pasted wholesale, into the issues. Revisit the headline numbers after each merged front with the same instrument, so progress is measured, not asserted.
