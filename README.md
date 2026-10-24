# Icaro Aguiar Agent Skills

Curated, reusable agent skills maintained by Icaro Aguiar.

## Install

Install one skill:

```sh
npx skills add IcaroAguiar/skills --skill <skill-name>
```

Install the catalogue for a specific agent:

```sh
npx skills add IcaroAguiar/skills --skill '*' --agent codex
```

The first public release will be tagged `v0.1.0`. Consumers who need repeatable installations should pin an explicit Git tag or commit.

## Catalogue policy

- `skills/` is the canonical source of every published skill.
- Each skill has its own `SKILL.md`; optional scripts, references, and assets stay within that skill's directory.
- A pull request and the validation workflow are required for a published update.
- Releases use semantic versioning and an annotated Git tag.
- Skills that require private infrastructure, credentials, or customer-specific context are excluded until they have a safe public form.

## Development

Run the local catalogue validation before committing:

```sh
node scripts/validate-skills.mjs
```

Repository instructions define catalogue maintenance. The repository is the canonical source; local harness folders are installations.

## Catalogue

| Skill | Use it to |
| --- | --- |
| `approval-canvas` | Approve a redesign on a static prototype built with the project's real components before product code changes |
| `code-review` | Gate a finished pull request: deterministic pre-review, a fast pre-pass, then one independent reviewer |
| `codebase-guardrails` | Keep a codebase healthy when agents write most of the code and tests |
| `codebase-health` | Run an evidence-based repository check-up that ends in a sequenced roadmap |
| `design-direction` | Art-direct and review interfaces: disciplined structure plus a domain-specific expression per screen |
| `exploratory-qa` | Test what shipped the way people use it, with parallel persona agents |
| `pr-demo-video` | Record a short captioned demo of a change running in the real app |
| `record-real-dev-e2e` | Record real application workflows when a video is part of the evidence |
| `task-closeout` | Close a task with a reviewable delivery and every workspace artifact accounted for |

## Recommended from other catalogues

These are part of the same daily workflow but maintained upstream. Install them from their source instead of a copy here:

| Source | Skills |
| --- | --- |
| [`mattpocock/skills`](https://github.com/mattpocock/skills) | `pr`, `tdd`, `diagnosing-bugs`, `writing-for-agents`, `grilling`, `prototype`, `domain-modeling`, `codebase-design` |
| [`humanlayer/skills`](https://github.com/humanlayer/skills) | `show-me` |
| [`rafaelquintanilha/skills`](https://github.com/rafaelquintanilha/skills) | `better-portuguese`, `orchestrate` |
| [`github/gh-stack`](https://github.com/github/gh-stack) | `gh-stack` |
| [`emilkowalski/skills`](https://github.com/emilkowalski/skills) | `improve-animations` |

## License

[MIT](LICENSE)
