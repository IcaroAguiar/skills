# Maintainability Pressure

Use this reference when code is being created or reviewed and the change risks structural debt, not just a localized bug.

## Approval Bar

Passing tests are not enough when the diff clearly makes future behavior harder to reason about. Treat maintainability as part of correctness when it affects contracts, ownership, regression risk, operational safety, or repeated future edits.

Default to objective blockers. Keep subjective design preferences as checkpoints unless the risk is concrete.

## Pressure Checks

- Simplify before spreading complexity. Ask whether the same behavior can be preserved by deleting branches, modes, adapters, helpers, or special cases instead of adding more.
- Untangle spaghetti growth. New ad-hoc conditionals, feature flags in unrelated flows, scattered nullable branches, or mode checks in busy paths are findings when they obscure the main invariant.
- Decompose large-file growth. If a change pushes a source file from under 1000 lines to over 1000 lines, require a decomposition plan or a specific structural reason it remains cohesive.
- Make abstractions earn their keep. Thin wrappers, identity helpers, pass-through layers, magical generics, and refactors that move complexity without reducing concepts should be deleted, inlined, or justified.
- Clarify types and boundaries. Avoid `any`, unsafe casts, optional contracts, silent fallbacks, and ad-hoc object shapes when they hide invariants or external contracts.
- Reuse canonical ownership. Put feature logic in the layer/package/module that owns the concept; prefer existing domain helpers, schemas, ports, and adapters over near-duplicates.
- Make orchestration atomic enough. Flag sequential async work, partial updates, missing rollback, and inconsistent state only when they create brittleness or operational risk.

## Creation-Time Use

Before coding, identify likely files/layers, existing helpers, decomposition seams, and large-file risk. During coding, keep the pressure check active whenever the implementation adds branching, wrappers, casts, cross-layer imports, duplicated helper logic, or orchestration.

If a pressure check triggers, fix it during creation when the correction is small and local. If fixing it would broaden scope, record it as a reviewer checkpoint or explicit follow-up with residual risk.

## Reviewer Finding Language

Use direct verbs in findings:

- Simplify the control path.
- Untangle the branching.
- Decompose the oversized file.
- Delete or inline the wrapper.
- Clarify the boundary type.
- Move logic to the canonical owner.
- Make the state update atomic.

Avoid importing the harsher tone of specialized code-quality reviews into the default auto-invoked gate. The default gate blocks concrete structural risk; it does not authorize broad refactors by taste.
