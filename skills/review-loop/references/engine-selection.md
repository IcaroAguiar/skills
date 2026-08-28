# Optional engine override

Ordinary review uses one fresh harness-native reviewer and the author or native
fixer. Record the harness role and PR base/head in the handoff. Do not run engine
selection, registry, or qualification setup in the normal path.

Use the protected selector only when the user or harness policy explicitly pins
an engine. The override maps `fast-reviewer`, `deep-reviewer`, and `fixer` to
exact protected profiles. It must fail closed on missing, stale, mismatched,
candidate-local, or symlinked inputs and must never substitute another profile.

An override failure affects that override only. It does not turn engine setup
into a user task or prevent a later harness-native review unless policy forbids
the native path.

Role contracts:

- `fast-reviewer`: one independent full-diff review and same-session delta checks.
- `deep-reviewer`: a fresh reviewer for material expansion, disagreement, or sensitive corrections.
- `fixer`: workspace-writing correction with no verdict authority; may be the author.
