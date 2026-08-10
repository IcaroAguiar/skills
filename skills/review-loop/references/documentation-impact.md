# Documentation impact

## Required receipt

Every review must return one documentation state:

- `DOCUMENTATION: UPDATED` — affected sources are current in the candidate;
- `DOCUMENTATION: NOT_APPLICABLE` — inspected sources do not describe the
  changed behavior, contract, architecture, or operation;
- `DOCUMENTATION: BLOCKED` — required documentation is stale, missing, or owned
  somewhere unavailable.

List what was inspected. Do not accept a bare `N/A`.

## Discover documentation

Inspect applicable:

- repository instructions, README, contribution and setup guides;
- `docs/`, ADRs, architecture, domain, operations, and runbooks;
- OpenAPI, GraphQL, protobuf, schemas, generated reference sources, and examples;
- environment templates, configuration tables, ports, commands, dependencies,
  migrations, rollout, and rollback guidance;
- public comments, docstrings, JSDoc, help text, changelog, and PR metadata;
- diagrams and documents that reference renamed files, symbols, states, or
  workflows.

Use repository conventions and the request/spec to identify the source of truth.

## Blocking changes

Require same-change correction when existing documentation becomes false,
incomplete, ambiguous, or points to a removed name/path because the diff changes:

- public or user-visible behavior;
- API, schema, event, configuration, environment, or command contract;
- architecture, ownership, state model, lifecycle, migration, rollout, or
  operational recovery;
- installation, build, test, developer workflow, or supported version;
- security, permission, privacy, tenant, or data-retention behavior.

Update the generated source and regenerate rather than hand-editing generated
output. If documentation lives in another repository or requires a human owner,
mark `BLOCKED` or record an explicitly accepted linked delivery; never claim it
was updated.

## Precision controls

Internal refactoring with unchanged contracts may be `NOT_APPLICABLE`, but only
after inspecting the nearby documentation and symbol references. Do not demand a
new document for every private helper. Do not add prose that repeats code without
explaining a durable contract, decision, workflow, or operational fact.

The fixer must update documentation as part of the same correction batch and the
fresh reviewer must compare it against the final code, not the original intent.
