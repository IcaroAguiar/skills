# Portable role selection

## Protected roles

The public contract names capabilities, not vendor choices. Configure one exact
mapping per harness outside the candidate for:

- `fast-reviewer`: the default fresh, read-only approval lane;
- `deep-reviewer`: one automatic escalation lane for high-risk ambiguity or disagreement;
- `fixer`: the workspace-writing correction lane, reused across local rounds;
- `watcher`: read-only external monitoring with no verdict authority.

The exact protected mapping contains `harness`, `profileId`, `modelId`, and
`reasoningMode`. It is a user/harness artifact, not candidate input. The
selector consumes its role receipt; it never ranks, substitutes, silently
falls back, or infers a profile from a vendor name. Supported harness IDs
include `codex`, `claude-code`, `cursor`, and `opencode`; they are opaque IDs.

## Protected join

Resolve the live registry and role map from protected paths:

```sh
node scripts/select-review-engines.mjs \
  --registry <protected-live-registry.json> \
  --role-map <protected-role-map.json> \
  --harness <opaque-harness-id> \
  --role fast-reviewer|deep-reviewer|fixer|watcher \
  --risk low|medium|high|critical --json
```

The selector joins the exact map entry to exactly one live candidate by the
four-part identity. The candidate must carry current qualification evidence
for the requested role and risk. A missing mapping, duplicate identity,
missing qualification, stale registry/map/evidence, mismatch, or unavailable
capability is `BLOCKED`; no other candidate may be chosen.

The map and registry must have protected trust metadata and current observation
times. Paths must resolve outside the candidate repository. Lexical paths,
canonical paths reached through links, and symbolic-link inputs are rejected.
Candidate files never supply the map, registry, qualification, or fallback.

## Qualification floor

`fast-reviewer` and `deep-reviewer` need read-only execution, fresh context,
repository/tool access, and evidence for all five gates. Their qualification
must show correctness, simplification, semantics, documentation, verification,
and no known critical/high escape. The selector does not remove a gate because
the reviewer is fast.

`fixer` needs workspace-write access, fresh context, focused verification,
documentation correctness, zero known critical regressions, and safe escalation
evidence for sensitive boundaries. It is the same configured role on every
local correction round.

`watcher` needs read-only monitoring capability, no workspace write, and an
explicit `verdictAuthority: false`. Its receipt can report availability and
external state only; it cannot approve or block a candidate.

## Receipts and freshness

Each receipt records only a sanitized role, harness, profile/model/reasoning
identity, qualification source/date, evidence hashes, capabilities, and the
exact mapping/registry trust source. Never copy arbitrary registry fields,
paths, secrets, provider metadata, or model-export payloads into a receipt.

The receipt says `fallback: false` and records any explicit escalation. A
missing role receipt is not permission to choose a nearby profile. Keep the
receipt bound to the candidate fingerprint and discard it when that identity
changes.
