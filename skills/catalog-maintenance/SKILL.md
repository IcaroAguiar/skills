---
name: catalog-maintenance
description: Use when creating, updating, publishing, or installing a reusable personal agent skill. Keeps IcaroAguiar/agent-skills as the canonical GitHub source, validates public safety, and synchronizes approved changes to GitHub.
metadata:
  internal: true
---

# Catalog Maintenance

## Canonical source

The public catalog is `IcaroAguiar/agent-skills`. Reusable skills belong in `skills/<skill-name>/` in that repository. A local harness copy is an installation, not the source of truth.

## Create or update a skill

1. Work from a current checkout of the catalog.
2. Add or update the skill under `skills/<skill-name>/`, with a valid `SKILL.md` frontmatter `name` and `description`.
3. Keep the skill portable. Do not publish credentials, private paths, customer information, machine-specific configuration, or private infrastructure instructions.
4. Run `node scripts/validate-skills.mjs` and inspect the diff.
5. When the user has authorized the change, commit and push it to GitHub. Treat a successful push as the publication record.
6. Refresh local installs only when requested, using the catalog as the source.

## Scope boundary

Keep a skill local or project-scoped when it is tied to a client, active infrastructure, private operational context, or unshareable data. Do not copy it into the public catalog merely for convenience.

## Install

```sh
npx skills add IcaroAguiar/agent-skills --skill <skill-name>
```
