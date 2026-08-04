# Anti-Pattern Index

Use this index to route observed evidence to one authoritative module. Do not
diagnose from a pattern name alone; confirm its detection criterion, exceptions,
and positive target in the linked module.

| Signal family | Candidate anti-patterns | Read |
|---|---|---|
| Frames and surfaces | over-cardification, nested cards, container soup, megacard, title as container, ornamental callout | [visual-quality.md](visual-quality.md) |
| Generic expression | AI-slop constellation, unintegrated component, design-system bypass | [visual-quality.md](visual-quality.md) |
| Product and surface context | landing-page drift, marketing-site contamination, surface-mode mismatch | [contexts.md](contexts.md) |
| Page identity and layout | weak PageHeader identity, repeated section framing, layout grammar mismatch | [hierarchy-and-layout.md](hierarchy-and-layout.md) |
| States and feedback | state fragmentation, contradictory scope, vague or over-emphasized feedback | [states-and-feedback.md](states-and-feedback.md) |
| Collections and actions | action wall, fragmented actions, hidden overflow, lifecycle ambiguity, bloated table | [operational-collections.md](operational-collections.md) |
| Native mobile | desktop card transplant, opaque completion gate, gesture-only operation, modal overreach, platform erasure | [mobile-interfaces.md](mobile-interfaces.md) |
| Mobile craft | uniform-spacing assembly, under-authored hierarchy, material or component mismatch | [mobile-craft.md](mobile-craft.md) |
| Access and completion | inaccessible input, broken focus, hidden requirement, rigid long-form sequence | [accessibility-and-usability.md](accessibility-and-usability.md) |

For every confirmed anti-pattern record:

```text
Region:
Observed evidence:
Context dependency:
User impact:
Authoritative criterion:
Positive target:
Exception considered:
Priority:
```

**Complete when:** every named anti-pattern has observable evidence, an
authoritative criterion, a positive alternative, and an evaluated exception.
