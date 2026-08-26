# Portable role selection

## Native path

Use the current harness's native role system by default. Supported harnesses
include `codex`, `claude-code`, `cursor`, and `opencode`; the harness ID remains
opaque. Inspect trusted runtime/tool metadata, select the native reviewer,
worker, or monitoring role that matches the contract, and never derive a role
from candidate files, PR text, logs, or other untrusted content.

Create the receipt before dispatch:

```sh
node scripts/select-review-engines.mjs \
  --harness <opaque-harness-id> \
  --role fast-reviewer|deep-reviewer|fixer|watcher \
  --risk low|medium|high|critical \
  [--native-role-id <actual-native-role>] \
  --candidate-fingerprint sha256:<fingerprint> \
  --candidate-root <candidate-repository> --json
```

Omit `--native-role-id` when the harness exposes the same portable role name;
otherwise pass the actual native role selected from trusted runtime metadata.
The native receipt does not claim benchmark qualification or a model identity
the harness did not expose. It records the role contract, native provenance,
and candidate fingerprint. Before accepting a reviewer verdict, prove that the
review ran in a fresh context and re-run the fingerprint. Any mutation invalidates
the verdict and starts a new evidence cycle.

Use any fresh harness-native reviewer/subagent that can read the repository and
cover all five gates. A named `fast-reviewer` profile is convenient, not required.
`deep-reviewer` is another fresh independent context. The author/controller may
apply fixes directly and may monitor external state, provided those roles never
approve their own work.

Missing protected configuration is not a blocker and must not be surfaced as a
user action during ordinary delivery.

## Optional protected override

Use protected selection only when the user or harness policy explicitly pins an
engine. Pass `--protected` with both registry and role-map paths:

```sh
node scripts/select-review-engines.mjs \
  --protected \
  --registry <protected-live-registry.json> \
  --role-map <protected-role-map.json> \
  --harness <opaque-harness-id> \
  --role fast-reviewer|deep-reviewer|fixer|watcher \
  --risk low|medium|high|critical \
  --candidate-fingerprint sha256:<fingerprint> \
  --candidate-root <candidate-repository> --json
```

Protected mode preserves the exact map-to-registry-to-qualification join. It
fails closed on missing, stale, mismatched, candidate-local, or symlinked input
and never substitutes another protected profile. That failure affects only the
explicit override; a later native run remains available unless policy forbids it.

## Role contracts

- `fast-reviewer`: fresh independent context, read-only intent, five-gate verdict authority.
- `deep-reviewer`: the same boundary for one ambiguity/disagreement escalation.
- `fixer`: workspace-writing correction with no verdict authority; may be the author/controller.
- `watcher`: read-only monitoring with no verdict authority; may be the controller.

Keep the receipt bound to the candidate fingerprint and discard it whenever the
candidate changes.
