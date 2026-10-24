---
name: pr-demo-video
description: Record a short captioned video of a change running in the real app, so a reviewer or stakeholder sees every improvement of a PR (or stack) in two minutes. A team of cheap parallel workers writes one scene each; you storyboard, judge every frame, and fix defects the recording exposes. Use when asked for a "demo", "vídeo demo", "grave uma demo", "mostrar as melhorias", "vídeo do PR", or to attach a walkthrough video to a PR.
---

# PR demo video

Goal: a 1–3 minute video of the **real app** where each improvement of the change is visible, captioned in the user's language, with no personal data on screen. A mock, a slideshow or a screenshot collage is not this skill.

Quality comes from your decisions, cost from the workers. You decide what to show and with which data, and you judge the result. Workers (the cheapest capable model, parallel when supported) write and debug one scene each. Keep scene authorship separate from orchestration: a lone worker took 2h17 and shipped a weak video with a false claim.

Harness: `scripts/demo.sh` and `scripts/harness/` (Playwright, run with the project's own Playwright). Everything lives in a run directory outside the repository, for example `/tmp/pr-demo/<slug>`.

## 1. Inventory the promises (you)

- Read each PR body, its linked issue and the diff summary. List the **visible promises**: "X opens as a page", "the sum updates while typing", "copying moves dates one year". A refactor with no visible change gets no scene.
- Group promises into **scenes**: one scene = one improvement, 8–20 seconds. Order them as a person would meet them in one journey.
- Note what each scene needs to be convincing. Empty forms show nothing, so you need real-looking data on screen.

## 2. Choose environment, account and data (you)

These are the decisions a worker cannot make. Get them right before any scene is written.

- **Environment:** the local stack running the change's code (top of the stack for stacked PRs). Follow the project's rules for servers, database and ports. Production only read-only and only when the user asks.
- **Account:** a test account only. Check it is not a personal one without printing it: compare a hash with the user's known e-mail. The login happens **once, off camera** (`demo.sh login`); scenes reuse the stored session.
- **Data:** find, read-only, the organization or records that make the feature visible. For example, choose the org that already has published items so a "copy from previous" control appears. Prefer filling screens **through the product itself**: copy features, local-draft recovery, imports. Seeding directly is a last resort. Writes to the server are allowed only in non-production, with clearly labeled test data, and only when the storyboard says so. Never click publish, delete or anything irreversible on camera.
- **Look:** light theme, a 1280×800 viewport (capture settings follow the demo-video row in `record-real-dev-e2e`), the user's locale and timezone. Mask e-mails by default (built in) and add `extraMasks` for other personal data.

## 3. Storyboard (you)

Write `<run>/storyboard.md` from `references/storyboard.md`. For each scene, give:
- id;
- promise;
- **start state** (exact screen and data);
- the actions;
- captions, verbatim;
- **end state**;
- forbidden actions.

The end state of scene N is the start state of scene N+1. Captions say what the viewer should notice, in plain language, no jargon, one idea per caption, ≤ 90 characters.

Before briefing anyone, check that every label in the actions exists in the code being served: `git grep -n "<label>" HEAD -- <app>`. A storyboard once relied on a feature from a later PR in the stack while the checkout was on an earlier one. The worker rightly stopped instead of faking it, but the round was lost.

Then fill `<run>/project.ts` from `project.template.ts`:
- base URL;
- viewport;
- login, which reads only the named keys from the credential file;
- `beforeScenes`, for example the start route and the light theme.

Then run:

```bash
S=<skill-dir>/scripts/demo.sh
$S new /tmp/pr-demo/<slug> --cwd <repo> --playwright "pnpm --filter <app> exec playwright"
$S login /tmp/pr-demo/<slug>
```

## 4. Scene team (cheap parallel workers)

Use the harness's native capabilities, on the cheapest capable model:
- Claude Code: background `Agent` workers with `model: haiku`; return corrections with `SendMessage` to the same worker.
- Codex: parallel `codex exec` processes; save session ids and resume each session for corrections.
- Cursor, OpenCode and Antigravity: use the workers/tasks and session continuation the installed harness exposes. Do not assume tool names or model ids.
- Without parallel workers, run scenes sequentially. Without session continuation, give a replacement worker the original brief, scene and requested correction. In either case, the orchestrator remains the judge.

Brief each one with `references/scene-brief.md`, filled in for that scene. Each worker:
- reads only the source files you name, to get exact accessible labels;
- writes `<run>/scenes/<id>.ts` from `_template.ts`, exporting `scene`; never edits `scenes/index.ts`;
- tests the scene alone with `demo.sh scene <run> <id>`. This imports `scenes/<id>.ts` directly, without the index, runs `prepare` then `play` without video, and writes `shots/<id>-end.png` and `report-<id>.json`;
- iterates until the scene passes and the end screenshot matches the end state, within about 15 minutes;
- reports any anomaly it saw: console errors, failed requests, an unexpected warning or count. It never "fixes" the app and never works around an anomaly.

While they work, you do the rest of the task. Do not wait idle.

## 5. Assemble, record, judge (you)

1. Only you assemble the index. List the scenes in `scenes/index.ts` in storyboard order and run `demo.sh record <run> --fast` once. Fast mode checks the chain in seconds, because each scene must start where the previous one ended.
2. Run `demo.sh record <run>` and then `demo.sh post <run>`. This produces the mp4, `out/sheet.png`, and one mid frame and one end frame per scene.
3. **Look at the frames yourself.** This is the step that makes the video good. Check that:
   - each caption matches what is on screen;
   - each promise is actually visible, not just announced;
   - the theme is right and the text is legible;
   - **no personal data is on screen**, including the account menu and fields;
   - no stray popover or error is left open;
   - nothing reads as broken.
4. Read `report.json`: notes, console errors, failed requests. Request diagnostics keep only origin, pathname and query parameter names with omitted values (`?access_token=…&page=…`). Diagnostics also mask e-mails, `extraMasks` and common tokens before persistence/output. Every anomaly is either explained or treated as a defect. A failure returns nonzero and writes a fresh report; the chain stops and remaining scenes are `skipped`. `post` uses `report.video` and requires every expected frame.
5. Return each fix to **the same worker** using section 4’s continuation method, with the frame path and what is wrong; use the sequential/replacement fallback when needed. Re-record only after all fixes are in. Expect at most two rounds.

## 6. Defects the recording exposes

The recording is also a test: it plays the product the way a person does.
- **Verify every worker claim yourself** before believing it. A worker once reported "the editor closes"; it did not.
- A confirmed defect in the change, or one that the change makes easier to hit, gets **fixed**: TDD, the project's review gate, then re-record the scene. Do not edit the storyboard to hide it.
- A defect clearly outside the change gets an issue, unless the user has said to fix such defects too.

## 7. Deliver

- Save the mp4 outside `/tmp`, for example `~/Movies/<slug>.mp4`, because `/tmp` is wiped on reboot. Keep it at or under 10 MB; raise the CRF in `demo.sh post` if needed.
- If the user wants it on the PR, attach it with the official `gh` (`gh pr comment <n> --attach './demo.mp4'`; videos take no `#alt text`, which `gh` rejects, so describe the video in the comment body). Only attach after the frame check has confirmed no personal data is visible.
- Report:
  - each promise and the scene that shows it;
  - what was **not** shown and why;
  - defects found and their fixes;
  - what was written anywhere (test data, sessions).
- Clean up:
  - delete `<run>/.auth.json`;
  - clear the local drafts the scenes left;
  - stop servers started only for this run.

## Anti-patterns

- Handing the whole video to one worker; treating scene authorship as a substitute for orchestrator judgment.
- Empty screens: a form with no data does not show the improvement.
- Captions that announce something the frame does not show.
- Trusting a worker's "it passed" or "the app does X" without a frame or a reproduction.
- Logging in on camera; any credential, e-mail or token on screen or in logs.
- Toggling a control back and forth just to fill time. It can trigger side effects; do it only when the toggle is the promise.

## 8. Harness self-test

Run `DEMO_TEST_CWD=<repo-or-app-dir> DEMO_TEST_PLAYWRIGHT="<project Playwright command>" bash scripts/selftest.sh` after harness changes (no server or credentials). Both variables are required; put ffmpeg/ffprobe on `PATH`. `demo.sh` resolves the project's `@playwright/test` for every Playwright invocation; the selftest uses that same path without inherited `NODE_PATH`. Keep project-specific values (app directory, Playwright command, login profile) in the project or in a local profile file next to your installation, never in this skill.
