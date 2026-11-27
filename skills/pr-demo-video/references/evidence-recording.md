# Evidence recording

The branch for a recording asked for as proof of a flow, not as a PR walkthrough: "grave o fluxo", a journey for a reviewer, a tutorial, a CLI or API run, a before/after across a deadline. Any product surface (web, mobile, CLI, API) and any delivery channel. Browser flows reuse the harness in `scripts/` (`demo.sh new/login/scene/record/post`) with the rules below layered on; ordinary verification without a video does not need this file.

## Proof standard

A credible recording has all five:

1. **Real environment:** the exact local, dev or approved test target, its revision or build, and which dependencies were reused or started.
2. **Real interaction:** the actual GUI, mobile, CLI or API surface the feature uses.
3. **Visible causality:** action, wait, resulting state, in one continuous sequence.
4. **Disclosed setup:** every fixture, API, database, feature-flag or time-anchor change made only to prepare a state.
5. **Bounded claims:** the journeys covered and the residual risk. A video never proves the absence of regressions.

## Neutral labels

Visible test data, overlays, chapters, filenames and reviewer text use `Teste 1`, `Teste 2`, `Teste Manual`, `Teste Automatizado`, `Superficie A`, `Antes`, `Depois`, `teste-1-dev.mp4`. Agent, model, framework, ticket and branch names stay out of anything visible, even when the user asks for them.

## Steps

1. **Runtime.** Reuse a compatible running instance before starting anything; record target, app id or URL, revision and dependency status in the manifest. Done when every app and dependency of the journey has a confirmed target.
2. **Evidence matrix.** Before recording, one row per claim: `Teste | Surface | Initial state | Action | Expected result`. Include the primary path, a negative or edge path when meaningful, persistence after refresh or restart when relevant. Automated checks get their own `Teste Automatizado` row. Done when every claim of the handoff maps to a row.
3. **Reversible data.** Dedicated test data with neutral names, non-production only. Create through the product when creation is part of the feature; API, fixture or database setup is allowed for the rest, disclosed. Capture the original value and decide the final state before mutating.
4. **Access.** Credentials from the project's secret store or an approved session; with neither, the user authenticates outside the capture. Test accounts only; mask or crop emails, names, avatars and org identifiers that are not synthetic. Check each role separately when the flow crosses permissions. Public flows: mark access not applicable.
5. **Record.** Prefer app-, browser-, emulator- or device-owned capture over desktop capture, so the user's own session cannot disturb it. Keep viewport, device, zoom and orientation fixed per journey.
   - GUI and mobile: semantic controls, a visible pointer or touch marker moving along plausible paths, a brief settle before each click, a pause after each state change until feedback is readable, human-speed typing, controlled scrolling. A capture that cannot show the pointer is re-recorded another way.
   - CLI: type the real command, show the relevant output and exit status, keep unrelated history and secrets out of frame.
   - API: a real supported client, showing sanitized request intent, status and response.
   - The action the video claims is never done by route injection, DOM evaluation or a hidden call; setup calls happen only between clearly separated states, then the product surface proves the result.
6. **Time-dependent features.** Change a test-only anchor on isolated data or use the app's clock seam; never the global clock of a machine, host, container or database. Per stage: capture the state, apply the anchor change off camera, refresh or rerun through the product, show the transition, exercise the resulting state. Label stages `Antes` / `Depois`.
7. **Adjacent risk.** Only neighbours the request or diff justifies (persistence, loading and error states, permission boundaries, alternate entry points). Tests, typecheck and build run separately and are reported as `Teste Automatizado`, never implied to be in the video.
8. **Verify the artifact** end to end: nonblank readable frames, a visible interaction indicator, no idle stretches or automation-speed jumps, no secrets, personal data, notifications or stray chrome, captions consistent with the manifest, duration, resolution and size fit the channel. Compress only a delivery copy and keep the original.
9. **Deliver** through the channel the user named (PR, issue, document, chat, shared storage or a local path) with the same neutral names, and confirm the audience can open it without local file access.

## Capture settings

| Recording | Viewport | `deviceScaleFactor` | Encoding |
|---|---|---|---|
| Long evidence or tutorial, desktop | 1920×1080 minimum, never 720p | 2 | `-c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -movflags +faststart` |
| PR demo (SKILL.md) | 1280×800 | 1 | `post.py` at `-crf 24`, ≤10 MB |

The harness records at `project.viewport` with scale 1 and `demo.sh post` encodes at CRF 24. For a long evidence recording, set the viewport in `project.ts` and re-encode the raw `report.video` with the long-recording line; the harness has no `deviceScaleFactor` option, so 2× needs another capture path, or the manifest states 1×.

## Evidence manifest

Kept beside the original videos and refreshed after the last edit or compression:

```markdown
# Evidencia

- Alvo: <ambiente, dispositivo ou runtime>
- Teste 1: <caminho principal pela superficie real>
- Teste 2: <caminho secundario, negativo ou N/A>
- Teste Automatizado: <checks aplicaveis ou N/A>
- Preparacao: <estado reversivel, setup aplicavel ou N/A>
- Entrega: <canal solicitado e status de acesso>
- Limites: <escopo nao exercitado e risco residual>
- Arquivos: <nome, duracao, resolucao e tamanho>
```

The closing report repeats the manifest's facts plus the final test-data state and any skipped validation.
