# Closeout Protocol

Final status must be exactly one of:

## `done`

Allowed only when:

- no blocking divergences remain;
- rubric score is at or above threshold;
- required screenshots exist;
- DOM landmark audit passes;
- functional validation passes;
- build/lint/typecheck or repo-equivalent checks ran when available.

## `acceptable with documented residual differences`

Allowed when:

- no blocking divergences remain;
- residual differences are cosmetic or constrained by product/codebase requirements;
- final screenshot artifacts exist for review;
- residual differences and constraints are listed.

## `structural correction still required`

Required when:

- any required landmark is missing;
- two or more scroll-stops are blocked;
- macro layout remains materially different;
- required section composition is missing or collapsed.

## `not ready`

Required when:

- build/test fails;
- critical interaction is broken;
- screenshot evidence is missing without a documented blocker;
- DOM landmark report is missing without a documented blocker;
- rubric critical cap marks the run as not ready.

## Forbidden Language Unless Status Is `done`

- complete;
- ready;
- finished;
- pixel-perfect;
- close enough;
- final polish only.

## Final Response Must Include

- final status;
- execution mode;
- source type and reference confidence;
- files changed;
- artifacts created: spec, IR, plan, rubric, screenshots, DOM landmarks, run ledgers;
- validation commands and result;
- rubric score and critical caps;
- scroll-stop status;
- remaining differences;
- missing assets/constraints;
- next exact adjustment when not `done`.

