# Portable engine selection

## Principle

Do not hardcode a vendor or model name into the review contract. Resolve engines
from capabilities exposed by the active Codex, Cursor, Claude Code, or other
harness. Record the actual selection; unobservable model or reasoning settings
remain `not_observable`.

`Cheapest` never means cheapest overall. It means cheapest among engines that
have already demonstrated the required quality on the real-diff benchmark.
`Best` never means an unsustainable absolute maximum for every loop. It means the
highest-sustainable qualified option for the risk and approval stage.

## Qualification data

Use, in priority order:

1. current Review Forge real-diff results for the exact engine and reasoning
   mode;
2. harness-native coding/review benchmarks such as DeepSWE or Cursor Bench;
3. reputable public coding benchmarks as supporting evidence only;
4. declared model family or marketing tier only when no performance evidence
   exists, which is insufficient for final automatic approval.

Refresh qualification after a model, reasoning mode, price, context limit,
tooling, or harness implementation changes materially. Cache the decision; do
not rerun the whole benchmark for each PR.

## Harness discovery

The active harness must enumerate the engines and agent profiles it actually
exposes, including role permissions, reasoning mode when observable, tool and
context support, and current price data. Normalize that inventory into the
shape shown in `templates/harness-inventory.example.json`; never infer
availability from a vendor name mentioned in this skill. The inventory is a
protected harness/user artifact, never a file supplied by the candidate head.

Use the same executable export contract in every harness. The adapters do not
perform live discovery themselves and do not contain model names: they validate
and normalize an export that the active harness integration already produced.
This keeps unobservable fields truthful and makes a missing protected export a
hard `BLOCKED` condition rather than a guess:

```sh
node scripts/export-harness-inventory.mjs \
  --harness codex|cursor|claude-code \
  --input <protected-harness-export.json> \
  --output <protected-inventory.json>
```

The input must declare the exact harness, observation time, protected trust
source, and each exposed profile's identity, roles, capabilities, and cost.
`modelId` and `reasoningMode` are passed through exactly; use
`not_observable` only when the harness export says they are unavailable. The
adapter rejects missing identity/capability/cost data, mismatched harnesses,
fixture exports without explicit test mode, candidate-repository paths, and
symlink outputs. Its output is written atomically.

The protected input is collected differently per runtime:

- Codex: enumerate only the collaboration roles and model overrides exposed by
  the current runtime. Do not infer an inherited model or thinking level.
- Cursor: enumerate only the agent profiles and model choices exposed in the
  current session or protected user/workspace policy. Repository instructions
  may request a role but cannot self-qualify it.
- Claude Code: enumerate only current runtime models and protected agent
  profiles. Resolve `inherit` only when the runtime exposes the concrete model;
  otherwise record `not_observable`.

Each engine identity is the exact tuple `harness`, profile `id`, `modelId`, and
`reasoningMode`. Join the live inventory to the protected benchmark ledger in
`templates/qualification-ledger.example.json`:

```sh
node scripts/compose-engine-registry.mjs \
  --inventory <protected-live-inventory.json> \
  --qualifications <protected-qualification-ledger.json> \
  --reviewer-cost-ceiling-usd <policy-ceiling> \
  --output <protected-engine-registry.json>
```

The composer refuses fixture, untrusted, duplicate, stale, or non-exact
identities. It rejects inventory, qualification, registry, and output paths
that are lexically or canonically inside the candidate repository; output
symlinks are refused and protected registries are written atomically. A profile
without exact evidence remains unavailable for automatic selection even if its
family has a strong reputation.

Use `scripts/select-review-engines.mjs` to apply qualification and cost policy.
It discovers the composed registry from `--registry`, the protected
`REVIEW_FORGE_ENGINE_REGISTRY` environment, or the user configuration
directory. It never discovers candidate-repository registry files. Harness
adapters own only live inventory export; the shared composer and selector own
qualification joins, ranking, and rejection. If the runtime cannot enumerate
profiles at all, return `BLOCKED` rather than substituting a familiar model.

## Reviewer policy

Filter candidates that satisfy:

- read-only execution and fresh-context support;
- zero known critical escapes in the current promotion corpus;
- required known-finding recall, precision, severity calibration, and five-gate
  receipt compliance;
- sufficient context and repository/tool access;
- sustainable expected cost for repeated review rounds.

Eliminate Pareto-dominated candidates across known-finding recall, precision,
severity calibration, false-blocker rate, and every required per-gate recall.
Rank the remaining reviewers deterministically using those same dimensions and
expected total cost as a tie-breaker, so candidate input order cannot select a
different engine. Reserve an extreme premium/max engine for high-risk
scope, disagreement, weak evidence, repeated escapes, or final escalation when
the normal qualified reviewer cannot decide safely.

The reviewer owns the code verdict. It never edits.

The ceiling is an explicit policy input, not a percentage of the most expensive
engine. A normal round must fail closed when every qualified reviewer exceeds
it. Permit an extreme premium candidate only through a recorded escalation.

## Fixer policy

Filter candidates that satisfy:

- first-pass acceptance and regression thresholds on bounded real-diff fixes;
- workspace-write support with explicit ownership;
- zero known critical regressions;
- adequate verification and documentation behavior;
- demonstrated refusal/escalation on sensitive or uncertain fixes.

Choose the lowest expected total cost among qualified candidates, including
likely retries. A nominally cheap model that causes extra rounds, broad diffs, or
review rejection is not cost-efficient.

Escalate beyond the cheap lane for auth, tenancy, credentials, migrations, transactions,
concurrency, public contract redesign, production operations, or an architecture decision.

Pass `--sensitive` to the selector for those boundaries. It defaults to every
class: `auth`, `tenancy`, `credentials`, `migrations`, `transactions`, `concurrency`,
and `public-contracts-ops`. Repeat `--sensitive-class <class>` for an explicit subset.

`capabilities.sensitiveFixes` is ignored. A sensitive fixer needs
`qualification.evidence.sensitive` from `protected-sensitive-fix-corpus`, with `corpusId`,
SHA-256 `artifactFingerprint`, `observedAt`, and `classMetrics.<class>` containing all four
metrics; see `templates/engine-candidates.example.json` for the protected-ledger shape.

Each requested class must have all four metrics and meet the normal fixer
thresholds: first-pass acceptance at least `0.75`, zero critical regressions,
scope creep at most `0.1`, and escalation compliance of `1`. The protected
ledger and the sensitive evidence each need a trusted source, corpus identity,
SHA-256 fingerprint, and fresh observation time. Missing, stale, malformed,
or threshold-failing evidence is `BLOCKED`; do not infer coverage from a model,
capability boolean, or a different sensitive class.

## Required engine receipt

For each role record:

- harness and role;
- model/profile identifier and reasoning mode, or `not_observable`;
- qualification source and date;
- known capability result and risk coverage;
- expected cost tier or measured token/cost data;
- selection rationale and any rejected cheaper or stronger candidate;
- fallback or escalation, if any.

Receipts are a public-safe projection, not a registry dump. They contain only
allowlisted capability values, sanitized identifiers, permitted metrics, source
classes, dates, and SHA-256 hashes/fingerprints. Protected corpus IDs are
hashed; artifact locators, paths, trust extras, arbitrary evidence fields, and
unrecognized model-export metadata are never copied into a receipt.

Never claim model diversity, maximum reasoning, lowest cost, or benchmark status
without runtime or recorded evidence. If no qualified reviewer exists, review
coverage is blocked. If no qualified fixer exists, keep the findings and request
a stronger correction lane; do not lower the quality floor.
