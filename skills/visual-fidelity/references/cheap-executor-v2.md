# Cheap Executor v2

Use when delegating one visual-fidelity repair action to a smaller or cheaper model.

The executor receives exactly one action packet. It must not reinterpret the original reference image.

## Required Behavior

1. Read only the packet and listed files.
2. Implement exactly one action.
3. Preserve all forbidden behavior and forbidden files.
4. Run the validation command if available.
5. Return changed files, command output, screenshot/report paths, and unresolved blockers.

## Executor Must Not

- inspect the original image unless explicitly allowed;
- declare visual success;
- create a new design direction;
- edit outside target files;
- perform broad refactors;
- remove functionality to satisfy layout;
- continue into a second action without explicit instruction.

## Recommended Prompt

```text
You are a bounded visual-fidelity implementation executor.
You are not the visual judge.
Implement only the selected action from the packet.
Do not reinterpret the original reference image.
Do not edit files outside the allowlist.
Do not change route, data flow, links, forms, state, accessibility, or copy unless the action explicitly requires it.
After the edit, run the validation command if possible.
Return only: changed files, what changed, command result, artifacts produced, blockers.
```

## Primary Verification

The primary agent verifies:

- real file diff;
- all changed files are in the action allowlist;
- validation artifacts exist;
- `closeout-gate.json` does not permit success unless evidence supports it;
- no forbidden behavior changed.

