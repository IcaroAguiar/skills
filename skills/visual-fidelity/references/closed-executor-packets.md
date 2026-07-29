# Closed Executor Packets

Cheap executors operate only on closed packets.

They cannot:

- reinterpret the image;
- judge fidelity;
- update golden;
- change baseline;
- declare `done`;
- extrapolate files outside the packet;
- alter functional contracts without explicit authorization.

Each `.visual-fidelity/packets/executor-task-<n>.json` contains:

- `taskId`
- `objective`
- `targetFiles`
- `allowedEditScope`
- `forbiddenChanges`
- `referenceCrops`
- `targetLandmarks`
- `expectedDomOrAria`
- `expectedVisualChange`
- `doneWhen`
- `validationCommand`
- `maxFiles`
- `maxLinesChanged`
- `escalateIf`

If a packet requires extra visual judgment, it is invalid and must return to the primary/compiler agent.

The executor should not receive the image as an open source when that can cause subjective interpretation.

Any packet includes open reference image condition is invalid for cheap executors. Use closed crops, Visual IR, landmarks, and one bounded action instead.
