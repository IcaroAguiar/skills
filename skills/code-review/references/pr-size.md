# PR size

A large diff takes longer to review, and its findings come back in one
batch at the end. A small PR with no stated purpose is lost when someone later
gathers what was delivered. Plan each task as one purpose, delivered as one PR
or as one stack of layers.

The rule applies to every implementation task, whoever does it: one agent
working alone, or an orchestrator delegating units. Size the work when you plan
it, before writing code. Splitting a finished branch costs far more.

## Limits

T0 counts **reviewable lines**: added plus deleted lines, without lockfiles,
generated or vendored files, snapshots or pure renames. It prints a `SIZE` line
when a change passes either mark below. The line is advice and never blocks.

| Mark | Reviewable size | What to do |
| --- | --- | --- |
| Layer target | about 400 lines | Fine as one PR. The next change on the branch goes into a new stack layer. |
| Limit | over 800 lines or 30 files | Split into a stack, or keep it whole and say why in the PR's merge-danger section. |

Reasons to keep a change whole: a mechanical change checked by the script that
made it (a codemod, a rename across the codebase), a migration that must land
atomically, or generated output with its generator. "It was easier" is not a
reason.

## Stacks

Use the `gh-stack` skill. Plan the layers before writing code. Each layer is one
dependent concern, builds and passes its tests on its own, and stays within the
layer target. Review each layer when it is ready: run T0 with `--base` set to
the layer below, so the reviewer reads only that layer.

## Purpose

Every PR names the delivery it belongs to.

- Small work that belongs to an ongoing task becomes a layer of that task's stack. It never becomes a loose PR.
- A small fix that is really separate gets its own PR, and its summary says what it serves: the issue, the bug or the delivery.
- The layers of a stack share a topic in their branch names and titles. The bottom PR's summary states the whole stack's goal, so the delivery reads as one unit later.

## Measuring

Every review call records the change's reviewable size in the ledger. For
calls made outside the scripts, `review-ledger record` takes `--lines` and
`--files`. The weekly calibration compares review time and findings by size
with `review-ledger stats --by size`. Adjust the marks when the numbers show
a different breaking point.
