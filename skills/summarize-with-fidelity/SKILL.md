---
name: summarize-with-fidelity
description: Fidelity-first concise summaries that preserve material decisions, status, evidence, blockers, risks, conditions, uncertainty, and next actions. Use when asked to summarize, shorten, condense, give a TL;DR, executive summary, brief update, or answer in a few lines, especially when omission could mislead.
---

# Summarize With Fidelity

Produce the shortest summary that preserves the reader's decisions, safety, expectations, timing, and confidence.

## Workflow

### 1. Bind the summary

- Identify the in-scope source, audience, purpose, language, and requested size.
- Treat an explicit word, line, or bullet limit as the target. When the user says only "brief" or "a few lines," default to one outcome line plus at most three short bullets.
- Infer clear context from the request and source. Ask one concise question only when competing scopes would materially change the result.

Complete this step when the source boundary and size target are explicit or safely inferred.

### 2. Build a materiality ledger

Before drafting, extract every fact whose omission could change a decision, safety judgment, expectation, responsibility, timing, or confidence:

- bottom line and current state;
- decisions, requirements, commitments, and rejected alternatives;
- blockers, failures, risks, exceptions, dependencies, and conditions;
- evidence, checks performed, evidence gaps, and source boundaries;
- uncertainty, disagreement, assumptions, and confidence;
- next action, owner, deadline, and irreversible consequence;
- exact numbers, dates, negations, and status distinctions that alter meaning.

Choose the relevant lens: status work emphasizes result, proof, blocker, and next step; decisions emphasize choice, reason, tradeoff, and uncertainty; policies emphasize obligation, threshold, and exception; incidents emphasize impact, cause confidence, mitigation, and current state.

Complete this step only when every in-scope material fact appears in the ledger.

### 3. Spend the loss budget safely

Compress in this order:

1. Remove greetings, filler, repetition, and process narration.
2. Collapse redundant examples, background, and raw detail that do not change the ledger.
3. Combine related facts with direct verbs and shared qualifiers.
4. Preserve every material fact, even when it makes the answer slightly longer.

Preserve distinctions such as planned versus completed, local versus production, draft versus merged, tested versus assumed, observed versus inferred, and current versus historical. Keep material caveats attached to their claims. Retain the nearest useful citation or evidence pointer when verifiability matters.

When the target cannot contain the ledger, exceed it by the smallest safe amount and say that the shorter limit would hide material information. Treat fidelity as the hard bound and brevity as the soft bound.

### 4. Deliver for one-pass reading

- Lead with the outcome, answer, or current state.
- Add only the material decision, blocker or risk, evidence boundary, and next action that exist.
- Use one idea per line or bullet and the fewest labels needed for scanning.
- Match the source's certainty and attribution. Label recommendations separately from source facts.
- Use one sentence when one sentence is materially complete; do not inflate a simple answer into a template.

Default shape for multi-point summaries:

```text
<bottom line>
- <material decision or change>
- <blocker, risk, condition, or evidence gap>
- <next action, owner, or deadline>
```

Omit empty lines rather than filling the shape mechanically.

## Fidelity gate

Before sending, verify all of the following:

- A reader can make the same immediate decision from the summary as from the source.
- No removed fact would reverse or materially qualify a retained claim.
- Status, numbers, dates, negations, conditions, attribution, and confidence remain accurate.
- Every summary claim is traceable to the in-scope source; new advice is labeled.
- The result meets the requested size, or explicitly explains the smallest necessary overrun.

The summary is complete when it passes every check and removing another sentence would reduce material fidelity.

## Example

```text
Implementação e testes concluídos; o PR ainda está aberto e produção não foi atualizada.
- Pendente: revisão, merge e validação após o deploy.
- Não há evidência de funcionamento em produção ainda.
```
