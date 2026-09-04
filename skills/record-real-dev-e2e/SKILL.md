---
name: record-real-dev-e2e
description: Record credible E2E video evidence for any feature or repository when the user asks for real-environment testing, natural user interaction, a product tutorial, state-transition proof, regression evidence, or reviewer-ready video attachments across GUI, mobile, CLI, or API surfaces.
---

# Record Real Dev E2E

Produce audience-facing video proof from the real application surface, independent of product domain, repository layout, framework, feature type, interaction medium, or delivery channel. The proof must distinguish what was exercised through the claimed surface, what was prepared outside it, and what remains unverified.

## Reference Router

- Read `references/pressure-tests.md` when creating, reviewing, or changing this skill.
- Use an approved authentication-context skill before authenticated work when one is available.
- Use the active harness browser, emulator, device, or computer-control skill for supported interaction and recording mechanics.

## Proof Standard

A credible recording has five properties:

1. **Real environment**: identify the exact local, dev, or approved test target, source revision or build identity, and reused or started dependencies.
2. **Real interaction**: exercise the actual GUI, mobile, CLI, or API surface used by the feature.
3. **Visible causality**: show the action, wait for the response, and show the resulting state in the same continuous sequence.
4. **Disclosed setup**: describe fixture, API, database, feature-flag, or isolated time-anchor change used only to prepare a state.
5. **Bounded claims**: name the journeys covered and the residual risk; a video never proves the absence of every platform regression.

## Neutral Naming

Use short neutral labels for visible test data, overlays, chapters, filenames, and reviewer text:

- `Teste 1`, `Teste 2`, `Teste 3`
- `Teste Manual`, `Teste Automatizado`
- `Superficie A`, `Superficie B`, `Antes`, `Depois`
- `teste-1-dev.mp4`, `teste-2-dev.mp4`

Keep agent identity, automation framework identity, internal ticket IDs, branch names, and elaborate scenario descriptions out of visible test names. A reviewer should see the product workflow, not the machinery that drove it.

## Workflow

### 1. Establish the runtime

Read repository instructions and inspect the current runtime before starting another process, simulator, emulator, container, or server. Reuse a compatible running instance. Record the target, application identifier or URL, source revision or build identity, and dependency status in a private evidence manifest.

Done when every application and dependency needed by the journey has a confirmed target and runtime state.

### 2. Define the evidence matrix

Write a compact matrix before recording:

| Teste | Surface | Initial state | Action | Expected result |
| --- | --- | --- | --- | --- |
| Teste 1 | Superficie A | Existing record | Perform primary action | Expected state and feedback |
| Teste 2 | Superficie B | Secondary or edge state | Perform relevant action | Expected boundary behavior |

Include the primary feature, a negative or edge path when meaningful, persistence after restart or refresh when relevant, and adjacent critical behavior justified by the requested evidence. Automated tests belong in a separate `Teste Automatizado` row or section.

Derive coverage from acceptance criteria, the requested demonstration, observed risk, and public contracts. Use a code diff only when one exists and is relevant.

Done when every claim intended for the final handoff maps to an observable row.

### 3. Prepare reversible data

Prefer dedicated test data or a test-only control. Use the claimed product surface for creation when it is part of the feature under review. API, command, fixture, or database preparation is acceptable for setup that would make the recording slow or non-deterministic, provided it is reversible, limited to non-production data, and disclosed in the manifest.

Use neutral entity names such as `Teste 1`. Capture the original value before mutation and define the restoration or intentional final state.

Done when test state is isolated, reproducible, reversible, and contains no production data.

### 4. Handle authentication when required

For authenticated journeys, resolve approved credentials through the repository or harness authentication workflow. If that workflow is unavailable, reuse an approved authenticated session or follow documented repository setup. When neither exists, pause and ask the user to authenticate in the selected application outside the capture. Never expose passwords, tokens, cookies, storage state, credential files, or private identifiers. Never place credential values in scripts or logs.

Use dedicated non-personal test accounts. Always mask or crop email addresses, names, avatars, organization identifiers, and other personal or credential-adjacent identity unless they are synthetic test values created for the scenario. Confirm each required role or permission level separately when the workflow crosses authorization boundaries.

For public journeys, record that authentication is not applicable. Done when the required access context is confirmed and no secret-bearing surface is visible.

### 5. Record natural interaction

Prefer application-owned, browser-owned, emulator, or device capture when desktop movement could disturb operating-system screen recording. Keep the selected session, viewport or device profile, zoom, orientation, and resolution stable throughout a journey.

For GUI and browser recordings:
- **Resolution and DPI standards**:
  - Viewport: minimum **1920x1080** (Full HD) for desktop surfaces. Never record desktop UI at 720p.
  - Scale factor: set `deviceScaleFactor: 2` (Retina 2x) in the browser context so fine typography (`text-xs`, 12px), subtle borders, badges, and vector icons render with razor sharpness without raster blur.
  - Video encoding: encode MP4 using high-fidelity parameters (`-c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -movflags +faststart`) to eliminate compression artifacts and macroblocking.
- **Interaction and pacing**:
  - Keep the cursor visible via an interaction pointer, move it along plausible paths between controls instead of teleporting it, and let each state transition remain on screen long enough to be understood.
  - Use a natural, purposeful pace: briefly settle before a click or tap, pause after state-changing actions until feedback is readable, type at a human-observable speed, and scroll in controlled increments.
  - Avoid both rapid automation that a reviewer cannot follow and long idle pauses that make the recording feel staged or slow.
  - If the chosen capture path cannot render the pointer or another clear interaction indicator, change the capture path or re-record; do not deliver an interaction video whose manipulation is invisible.

Match the interaction to the feature surface:

- GUI or mobile: use semantic controls, visible cursor or touch movement, deliberate but concise pauses, controlled scrolling, observable typing, clicks or taps, and feedback states. Favor stable labels and roles over coordinates.
- CLI: visibly type the real command, show the relevant output and exit state, and keep unrelated shell history or secrets outside the frame.
- API: use the real supported client, API explorer, or consumer path; show sanitized request intent, status, and response behavior without exposing credentials or private payloads.

Avoid instant route injection, DOM evaluation, hidden state changes, or direct setup calls for the action the video claims to demonstrate.

Use direct setup operations only between clearly separated test states. After each setup change, return to the claimed product surface and prove the resulting behavior through its real interaction path.

Done when a reviewer can follow every action without knowing the automation implementation, see how the interface was manipulated, read every text and UI element clearly without blurriness, and evaluate the result without replaying the video at reduced speed.

### 6. Handle time-dependent features when required

For time-based features, use a test-only anchor change on isolated data or an application-provided clock seam. Never change the global clock of the machine, runtime host, shared server, container, or database. Label the stages simply as `Antes` and `Depois`, or `Teste 1`, `Teste 2`, and `Teste 3`.

For each stage:

1. capture the current observable state;
2. apply the isolated time-anchor change outside the claimed product path;
3. refresh, restart, rerun, or navigate through the claimed product surface;
4. show the expected transition, side effect, expiration, schedule, or unchanged boundary;
5. exercise the resulting state when that is part of the acceptance criteria.

Disclose the category of anchor changed, such as an entity start timestamp, without showing sensitive values or presenting the setup operation as a product feature.

For features without time-dependent behavior, record that this branch is not applicable. Otherwise, done when the video demonstrates the relevant before-and-after transition through the claimed product surface.

### 7. Cover adjacent regression risk

Exercise only meaningful neighboring journeys derived from the requested behavior, acceptance criteria, observed risk, public contracts, and a code diff when available: state persistence, loading and error states, authorization boundaries, alternate entry points, restart or refresh behavior, and one adjacent critical workflow when justified.

Run focused automated tests, static checks, and build separately when applicable. Present their result as `Teste Automatizado`; do not imply they happened through the product surface or inside the video unless they are actually shown.

Done when each relevant boundary has either product-surface evidence, automated evidence, or an explicit unverified status.

### 8. Verify the artifact

Inspect the final video from start to finish. Verify:

- nonblank frames, stable presentation, readable content, and an interaction indicator appropriate to the surface, such as pointer, touch marker, typed command, request status, or response transition;
- for GUI or browser journeys, a visible pointer or touch indicator, plausible movement between controls, readable state-transition pauses, and no unexplained idle stretches or automation-speed jumps;
- no secrets, personal data, unrelated terminal history, operating-system or application chrome accidents, or notifications;
- no contradictory subtitles or stale manifest statements;
- duration, resolution, audio status, file size, and playback compatibility;
- delivery constraints when applicable, compressing a delivery copy only when the target channel requires it while preserving the original;
- final test-data state and restoration decision.

Done when the video plays completely, the manifest matches it, and the artifact satisfies the target delivery channel.

### 9. Deliver evidence

Deliver the relevant videos through the channel requested by the user: pull request, issue, document, chat attachment, shared storage, or local artifact. Use the same neutral names in links and descriptions. State environment, journeys demonstrated, automated checks, setup disclosures, skipped checks, and residual risk.

For remote delivery, confirm that the intended audience can open the artifact without local filesystem access. For explicitly local delivery, provide the exact artifact path. Done when the intended audience can access the evidence through the requested channel and every claim is traceable to product-surface or automated evidence.

## Evidence Manifest

Keep a concise manifest beside the original videos:

```markdown
# Evidencia

- Alvo: <ambiente, dispositivo ou runtime>
- Teste 1: <caminho principal pela superficie real>
- Teste 2: <caminho secundario, negativo ou N/A>
- Teste Automatizado: <checks aplicaveis ou N/A>
- Preparacao: <estado reversivel, setup aplicavel ou N/A>
- Entrega: <canal solicitado e status de acesso>
- Limites: <escopo nao exercitado e risco residual>
- Arquivos: <nome, duracao, resolucao e tamanho quando aplicavel>
```

Refresh the manifest after the final edit or compression. Remove statements contradicted by newer recordings.

## Closeout

Report the target environment, application identifiers or URLs without secrets, test-data label, videos, interaction journeys, automated checks, setup operations, final test-data state, delivery status, skipped validation, and residual risk. Keep audience-facing labels neutral.
