---
name: qa-crew
description: Use the product as a person before a change ships — cheap parallel agents acting as personas hunt defects and form or flow friction, the fixes land in the same PR, and one before/after video proves them. Runs on every change a person sees or uses, after the focused checks and before code-review; also when asked to "testar como usuário", "QA exploratório", or "testar o que subimos" over a period of merged PRs (the sweep). Demo of improvements: pr-demo-video.
---

# QA crew

Goal: find what tests, CI and review miss, **before the user does**: a broken or confusing outcome when a person does something plausible but unplanned. A page that loads is not a result.

Two things count as a finding:
- a **defect**: the product does the wrong thing;
- **friction**: the product works and still costs the person effort it could spare them: a form with fields it does not need, free text where a choice or a mask fits, steps that could be one, an error that does not say how to fix it.

You are the orchestrator. Workers explore; you own scope, safety, triage, fixes and the video.

Two modes:
- **Gate**: one change, inside its delivery. The rest of this file.
- **Sweep**: a period of merged PRs, on request. Read `references/sweep.md` and follow it instead.

## 1. Scope: the script decides

```bash
python3 <skill-dir>/scripts/qa_scope.py --repo <repo> [--base <ref>]
```

- `decision: skip` → write "QA: não se aplica (<reason>)" in the task summary and stop here.
- `decision: run` → run the gate with the `lenses` it lists. `size: light` means one worker with the `hurry` lens; `full` means one worker per lens.

The decision is the script's. When it says `run`, the gate runs, even for a refactor: a refactor of a screen can break the screen. When the gate cannot run (no environment, no test account), ask the user with the question tool; that is the only other exit.

**Complete when:** you hold the script's JSON for the final diff.

## 2. Environment and accounts

Read the project's QA profile: the `QA` section of the repository's `AGENTS.md`, else `references/projects/<repo>.md` here. When neither exists, discover the facts and write the second one from `references/project-profile.md` before going on.

- **Environment:** the local stack serving this branch, started **from a build** and through Portly where the server is managed. Exploration writes, so production is out of the gate.
- **Accounts:** test accounts only, one per persona, including the **wrong person** (no permission, another organization) when the `wrong-person` lens is on. When the profile lists none, create one in the local database, store it with the `credentials` skill and add it to the profile; the lens does not count without it. Check without printing that none is personal. Log in once per account yourself and hand workers the stored session (`storageState`, mode 600). Credentials come from the `credentials` skill.
- **Data:** label everything the crew creates with one suffix (`[QA-<branch>]`) so cleanup can find it.

**Complete when:** the app answers on its URL with this branch's code, and you opened one page that needs login with each stored session and saw it load. A login that returns too early writes an empty session without an error, and every worker then stops on a 401.

## 3. Brief the crew

Spawn the workers in parallel on the cheapest capable model (Claude Code: `Agent`, `general-purpose`, `model: haiku`; other harnesses: their parallel worker). At most 2 browsers at once.

Fill `references/worker-brief.md` for each. Every worker gets its lens, the screens the diff touches (`files.interface` from step 1, translated to routes), the promises the change makes, a 10-minute time box and an output folder.

| Lens | Persona | Sections of `references/human-heuristics.md` |
| --- | --- | --- |
| `hurry` | Someone doing the main task fast, on the phone (390 wide) then the desktop | Interrupted flows, Repetition and timing, Devices, Design and usability |
| `inputs` | Someone filling every field the way people really type | Inputs, Files, State and data extremes, Design and usability |
| `wrong-person` | Someone who must not see or do this | Permissions, Two tabs two people |

Every worker also fills the **friction ruler** in `references/friction-ruler.md` for each form and flow it crosses. The ruler is counts, so a later run can compare.

With a profile in place the whole gate fits in about 20 minutes. Past 30, say in the closing message where the time went and write the cause under "Known traps" in the profile.

**Complete when:** every worker has returned a report or hit its time box.

## 4. Triage: reproduce, then route

Reproduce every finding yourself before believing it; workers over-report breakage and under-report clutter, so look at their screenshots too. Then route each confirmed finding:

| Finding | Route |
| --- | --- |
| Defect in the change, or one the change makes easier to hit | **Fix in this PR** |
| Small friction on a screen the change touches: a mask, a default, a choice in place of free text, a label, a field removed, an error message that says how to fix, a missing loading or success state | **Fix in this PR**, in its own commit |
| Structural friction: steps merged or reordered, a screen rearranged, a new component | **Proposal**: not fixed here. It goes in the video and in the PR as a proposal; the user decides |
| Outside the change | **Issue**, after checking for an existing one |
| Expected behavior, environment, or your own bad brief | Drop it; fix the brief |

The line between small and structural: a small fix changes one field or one message and leaves the path through the screen as it was.

**Complete when:** every finding has a route, and you reproduced each one routed to fix or proposal.

## 5. Record before, fix, record after

The video is the proof, and the same scene replayed on the fixed code is the re-verification. Record with the `pr-demo-video` harness (`<skills>/pr-demo-video/scripts/demo.sh`; its SKILL.md sections 2 to 5 cover `new`, `login`, `project.ts`, scenes and judging frames).

1. **Before.** Make a run directory `<run>/before`. Write one scene per finding routed to fix or proposal: 5 to 20 seconds, starting where the person starts. Captions say what the person was trying to do and what happened, in the user's language, at most 90 characters. Record on the code **as it is now**: `DEMO_BADGE=Antes demo.sh record <run>/before`. Findings found at the phone width go in a second pair of runs with a phone viewport.
2. **Fix.** One round. Defects get the regression check at the cheapest level that catches the cause; friction fixes follow `impeccable`. Rebuild and restart the server.
3. **After.** Copy the run (`cp -R <run>/before <run>/after`), delete the proposal scenes, and adjust each remaining scene only where the fix changed the screen. Change the captions to say what is different for the person. Record: `DEMO_BADGE=Depois demo.sh record <run>/after`. A scene that still shows the problem means the fix failed: fix again, once. When every finding is a proposal there is no after run: cut the reel with `--before <run>/before` in place of `--pair`.
4. **Reel.**

```bash
python3 <skill-dir>/scripts/qa_reel.py --out <run>/out --pair <run>/before <run>/after
```

It cuts each finding as before then after, proposals alone, into `qa.mp4` (at most 90 seconds and 10 MB) and writes one frame every 2 seconds of each clip. **Look at every frame**: the badge and caption match what is on screen, the problem is visible in "antes" and gone in "depois", and no personal data shows.

With no finding to fix or propose there is no video: the evidence is the list of journeys walked.

5. **Record what the crew used**, right after the "depois" recording, or after step 4 when nothing was fixed:

```bash
python3 <skill-dir>/scripts/qa_scope.py --repo <repo> --exercised <run> --lenses <the lenses that ran, comma separated>
```

It stores the screens as they are now. Name only lenses a worker really ran with its account.

**Complete when:** every fixed finding has a "depois" frame you looked at that shows it gone, or the gate found nothing; and `<run>/exercised.json` exists.

## 6. Deliver

- **PR body** (the `pr` skill owns the format): under Evidence, the video and one line per finding in product words, fixed ones first, then proposals. End the body with the marker the script prints after the last commit; never write it by hand:

  ```bash
  python3 <skill-dir>/scripts/qa_scope.py --repo <repo> --stamp <run> --findings <n> --fixed <n> --proposals <n>
  ```

  `merge-gate` checks it against the PR. Exit 3 means a screen changed after the crew used it, usually a `code-review` fix. Then run the **light round**: one worker, `hurry` lens, only the screens the script lists, 5 minutes; fix what it finds, record `--exercised` again, and stamp. In a new run directory, pass `--lenses` with the lenses the old marker lists plus `hurry`. A review fix that touches no screen needs no round. Keep the run directory until the PR carries the marker.
- **Video:** attach with `gh pr comment <n> --attach '<run>/out/qa.mp4'`, and show it to the user in the closing message.
- **Closing message:** journeys walked, findings fixed, proposals awaiting the user's decision, issues opened, and what stayed **unverified and why**.
- **Cleanup:** remove the labeled test data, log out the test sessions and delete the session files, stop servers started for this run, delete the run directory after the video is attached.

**Complete when:** `qa_scope.py --pr <n> --require-evidence` exits 0 and nothing the crew created is left behind.

## Anti-patterns

- Treating "the screen renders" as "the feature works".
- One account that sees everything: it hides every permission bug.
- Recording "antes" after the fix, by reverting or faking the old state.
- Rewording a caption to hide what the frame shows.
- Folding a structural redesign into the PR as if it were a small fix.
