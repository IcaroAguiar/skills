# Catalog maintenance

`IcaroAguiar/agent-skills` is the canonical public source for reusable personal agent skills.

- For a reusable skill, create or update it in `skills/<skill-name>/` here; do not make a local harness copy the only source of truth.
- Before any push, run `node scripts/validate-skills.mjs`, inspect the diff, and ensure no credentials, private paths, customer data, or machine-specific setup are being published.
- Keep project-specific or operational skills outside this catalog unless they have been explicitly sanitized and approved for public use.
- When a user authorizes a new skill or update, commit and push the validated change to GitHub. Then refresh the relevant local installation from this repository if the user also asks for it.
- Use semantic Git tags for public release milestones; do not claim a skill is published until the push succeeds.
