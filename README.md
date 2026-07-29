# Icaro Aguiar Agent Skills

Curated, reusable agent skills maintained by Icaro Aguiar.

## Install

Install one skill:

```sh
npx skills add IcaroAguiar/agent-skills --skill <skill-name>
```

Install the catalogue for a specific agent:

```sh
npx skills add IcaroAguiar/agent-skills --skill '*' --agent codex
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

Reusable skills are maintained through the [`catalog-maintenance`](skills/catalog-maintenance/SKILL.md) workflow. The repository is the canonical source; local harness folders are installations.

## License

[MIT](LICENSE)
