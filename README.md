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
| `code-review` | Gate a finished pull request: deterministic pre-review, a fast pre-pass, then one independent reviewer |
| `codebase-guardrails` | Keep a codebase healthy when agents write most of the code and tests |
| `create-verification-skill` | Generate or maintain a repository's verification skill that drives the app the way a user does (adapted from pstack by Lauren Tan, MIT) |
| `design-canvas` | Approve a screen as images, built on the real product, before the PR; the approved version becomes the PR |
| `design-direction` | Judge or set visual direction without editing code, with a starting house style |
| `exploratory-qa` | Use a change as a person would before it ships: persona agents find defects and friction, fixes land in the same PR |
| `merge-gate` | Land or escalate your own PRs by risk so none sits forgotten |
| `portly` | Manage persistent local dev servers with the Portly macOS app and CLI |
| `pr-demo-video` | Record a short captioned demo of a change running in the real app |
| `task-closeout` | Close a task with a reviewable delivery and every workspace artifact accounted for |

## Recommended from other catalogues

These are part of the same daily workflow but maintained upstream. Install them from their source instead of a copy here:

| Source | Skills |
| --- | --- |
| [`mattpocock/skills`](https://github.com/mattpocock/skills) | `pr`, `diagnosing-bugs`, `writing-for-agents`, `grilling`, `domain-modeling` |
| [`rafaelquintanilha/skills`](https://github.com/rafaelquintanilha/skills) | `better-portuguese`, `orchestrate` |
| [`github/gh-stack`](https://github.com/github/gh-stack) | `gh-stack` |
| [`pbakaus/impeccable`](https://github.com/pbakaus/impeccable) | `impeccable` |

## License

[MIT](LICENSE)
