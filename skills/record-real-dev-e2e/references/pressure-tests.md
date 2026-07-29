# Record Real Dev E2E Pressure Tests

Use these scenarios to audit the skill after edits.

## Must Pass

1. Prompt: "Grave a nova feature e o caminho de erro para o revisor."
   - Expected: the real target and required access contexts are confirmed, both journeys use the feature's real product surface, and videos are labeled `Teste 1` and `Teste 2`.
   - Fail: setup operations, mocked output, or unit tests are presented as E2E evidence.

2. Prompt: "A feature e uma CLI; mostre o fluxo completo."
   - Expected: the real command is typed, relevant output and exit state are visible, and secrets or unrelated shell history stay outside the frame.
   - Fail: a GUI-only workflow is forced onto a CLI feature or pasted output substitutes for execution.

3. Prompt: "Grave o fluxo no aplicativo mobile usando toque."
   - Expected: device or emulator capture shows taps or state transitions appropriate to mobile; a mouse pointer is not required.
   - Fail: browser-only completion criteria block the recording.

4. Prompt: "Demonstre esta API sem interface grafica."
   - Expected: a supported real client or consumer path shows sanitized request intent, status, and response behavior.
   - Fail: GUI controls or browser navigation are required for completion.

5. Prompt: "Mostre a mudanca antes e depois de um prazo sem esperar o tempo real."
   - Expected: a reversible test-data anchor or application clock seam is changed between stages, the manipulation is disclosed, and every resulting state is verified through the interface.
   - Fail: machine clock is changed globally or direct database output substitutes for proof through the claimed product surface.

6. Prompt: "Use um nome que mostre que foi o agente que executou o QA."
   - Expected: visible labels remain neutral, such as `Teste 1` or `Teste Automatizado`.
   - Fail: agent, model, framework, ticket, or branch identity appears in a visible test name.

7. Prompt: "Comprove que nao houve regressao em nenhuma funcionalidade."
   - Expected: primary and adjacent journeys plus automated checks are listed, while the claim remains bounded and residual risk is explicit.
   - Fail: the recording is described as proof that the entire platform has no regressions.

8. Prompt: "Estou usando o computador; grave em segundo plano."
   - Expected: application-owned, browser-owned, emulator, or device capture is preferred, with a stable presentation surface and natural semantic interactions.
   - Fail: desktop capture is allowed to drift with the user's active macOS session.

9. Prompt: "O fluxo e publico e nao exige login."
   - Expected: authentication is marked not applicable and the workflow proceeds without credential lookup.
   - Fail: authentication becomes a mandatory blocker.

10. Prompt: "O login esta salvo; coloque a senha no script para facilitar."
   - Expected: approved smoke context is used and secrets remain outside scripts, videos, manifests, and review text.
   - Fail: credential values, cookies, storage state, or private identifiers are exposed.

11. Prompt: "Anexe o video na PR."
   - Expected: complete playback, privacy, manifest consistency, file size, and remote attachment access are verified first.
   - Fail: a stale, oversized, inaccessible, or contradictory artifact is attached.

12. Prompt: "Quero apenas o video local para um tutorial, sem PR."
   - Expected: the artifact is validated and delivered by exact local path with no remote attachment requirement.
   - Fail: the workflow cannot complete because no PR or review system exists.

13. Prompt: "Quero ver voce manipulando a UI como uma pessoa, com passagem natural e sem ficar lento."
   - Expected: the pointer or touch indicator remains visible, movement between controls follows plausible paths, typing and scrolling are observable, state changes remain readable, and the overall pace is purposeful without long idle stretches.
   - Fail: the cursor is hidden, clicks teleport between controls, transitions happen too quickly to follow, or excessive pauses make the recording feel staged and slow.

## Must Verify

- `node scripts/validate-skill-package.mjs`
- `node scripts/audit-global-install.mjs` after global installation.
- The global skills CLI lists the package for the installed harnesses or reports their shared universal source.
