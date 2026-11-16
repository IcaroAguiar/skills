---
name: qa-crew
description: Use the product as a person before a change ships — a form probe and cheap parallel agents acting as personas hunt defects and form or flow friction, the fixes land in the same PR, and before/after stills prove them. Runs on every change a person sees or uses, after the focused checks and alongside code-review; also when asked to "testar como usuário", "QA exploratório", or "testar o que subimos" over a period of merged PRs (the sweep). Demo of improvements: pr-demo-video.
---

# QA crew

Goal: find what tests, CI and review miss, **before the user does**: a broken or confusing outcome when a person does something plausible but unplanned. A page that loads is not a result.

Two things count as a finding:
- a **defect**: the product does the wrong thing;
- **friction**: the product works and still costs the person effort it could spare them: a form with fields it does not need, free text where a choice or a mask fits, steps that could be one, an error that does not say how to fix it.

You are the orchestrator. Workers explore; you own scope, safety, triage, fixes and the proof.

Two modes:
- **Gate**: one change, inside its delivery. The rest of this file.
- **Sweep**: a period of merged PRs, on request. Read `references/sweep.md` and follow it instead.

## 1. Scope: the script decides

```bash
python3 <skill-dir>/scripts/qa_scope.py --repo <repo> [--base <ref>]
```

- `decision: skip` → write "QA: não se aplica (<reason>)" in the task summary and stop here. A repository with nothing a person sees (a catalogue of scripts, a library) declares it once in a `.qa-crew` file with the line `interface: none`; the script reads that file from the remote default branch (for a PR, from the base repository at the base commit), so it counts only after its own PR is merged. Never add it to get a change through.
- `decision: run` → the gate runs at the `size` it gives. Nothing a person sees ships unchecked, and the check is sized to the change:
  - `quick` (a change to a screen that already exists): the form probe when `inputs` is listed, plus one `hurry` worker with a 5-minute box on the touched screens. About 10 minutes in all.
  - `full` (a new screen file, 300 or more changed interface lines, or an access rule): every lens listed. `hurry` and `wrong-person` are one worker each with a 10-minute box; `inputs` is the form probe, a script, never a worker.

The decision is the script's. When it says `run`, the gate runs, even for a refactor: a refactor of a screen can break the screen. When the gate cannot run (no environment, no test account), ask the user with the question tool; that is the only other exit.

**Complete when:** you hold the script's JSON for the final diff.

## 2. Environment and accounts

Read the project's QA profile: the `QA` section of the repository's `AGENTS.md`, else `references/projects/<repo>.md` here. When neither exists, discover the facts and write the second one from `references/project-profile.md` before going on.

- **Environment:** the local stack serving this branch, started **from a build** and through Portly where the server is managed. Exploration writes, so production is out of the gate.
- **Accounts:** test accounts only, one per persona, including the **wrong person** (no permission, another organization) when the `wrong-person` lens is on. When the profile lists none, create one in the local database, store it with the `credentials` skill and add it to the profile; the lens does not count without it. Check without printing that none is personal. Log in once per account yourself and hand workers the stored session (`storageState`, mode 600). Credentials come from the `credentials` skill.
- **Data:** label everything the crew creates with one suffix (`[QA-<branch>]`) so cleanup can find it.

**Complete when:** the app answers on its URL with this branch's code, and you opened one page that needs login with each stored session and saw it load. A login that returns too early writes an empty session without an error, and every worker then stops on a 401.

## 3. Probe, crew and review, all at once

Three things read the same commit and none waits for another. Start them together:

1. **Review.** Start the `code-review` gate now (T0, T1 when routed, the independent reviewer in the background). Its findings join the crew's in step 4.
2. **Form probe** (the `inputs` lens). Make the run directory `<run>/before` with the `pr-demo-video` harness (`demo.sh new`, `login`, `project.ts`; its SKILL.md sections 2 and 3). For each form the diff touches (`files.forms`), write a scene that reaches it, opening the dialog when it lives in one, and ends with `await probe()`:

   ```ts
   async play({ page, probe }) {
     await page.getByRole('button', { name: 'Editar prioridade' }).click();
     await probe();
   }
   ```

   `demo.sh scene <run>/before <id> --fast` runs it in seconds and writes `<run>/before/probe/<id>-<n>.json`: the friction ruler counted from the screen, and what each field kept after letters, pasted formats, spaces and 300 characters, without submitting. Its `findings` are candidates.
3. **Workers.** Spawn one per remaining lens on the cheapest capable model (Claude Code: `Agent`, `general-purpose`, `model: haiku`; other harnesses: their parallel worker). Fill `references/worker-brief.md` for each: its lens, the screens the diff touches (`files.interface` from step 1, translated to routes), the promises the change makes, the time box for its size and the run directory. A worker returns every finding as a scene file that already replays it.

| Lens | Who | Sections of `references/human-heuristics.md` |
| --- | --- | --- |
| `hurry` | Worker: someone doing the main task fast, on the phone (390 wide) then the desktop | Interrupted flows, Repetition and timing, Devices, Design and usability |
| `inputs` | The form probe | (the worker sections Inputs and State and data extremes are what it types) |
| `wrong-person` | Worker: someone who must not see or do this | Permissions, Two tabs two people |

Workers fill the per-flow half of `references/friction-ruler.md`; the probe counts the per-form half.

With a profile in place a `quick` gate fits in about 10 minutes and a `full` one in about 20. Past twice that, say in the closing message where the time went and write the cause under "Known traps" in the profile.

**Complete when:** the probe wrote its JSON for every touched form, every worker returned or hit its time box, and the review is running or done.

## 4. Triage: reproduce, then route

Reproduce every finding before believing it: run the worker's scene (`demo.sh scene <run>/before <id> --fast`) or, for a probe candidate, type the value yourself. Workers over-report breakage and under-report clutter, so look at their screenshots too. Then route each confirmed finding. The review's findings are triaged in the same pass, by the `code-review` rules, so one fix round serves both:

| Finding | Route |
| --- | --- |
| Defect in the change, or one the change makes easier to hit | **Fix in this PR** |
| Small friction on a screen the change touches: a mask, a default, a choice in place of free text, a label, a field removed, an error message that says how to fix, a missing loading or success state | **Fix in this PR**, in its own commit |
| Structural friction: steps merged or reordered, a screen rearranged, a new component | **Proposal**: not fixed here. It goes in the PR as a proposal with its "antes" still; the user decides |
| Outside the change | **Issue**, after checking for an existing one |
| Expected behavior, environment, or your own bad brief | Drop it; fix the brief |

The line between small and structural: a small fix changes one field or one message and leaves the path through the screen as it was.

**Complete when:** every finding has a route, and you reproduced each one routed to fix or proposal.

## 5. Shot before, fix, shot after

The proof of a fix is a pair of stills, and the scene replayed on the fixed code is the re-verification. A scene calls `await shot()` at the moment the problem shows; the still keeps the caption and lands in `<run>/shots/<scene>-<n>.png`.

1. **Before.** In `<run>/before`, keep one scene per finding routed to fix or proposal: the worker's scene, or the probe scene with the value typed. Check the captions: what the person was trying to do and what happened, in the user's language, at most 90 characters. Run each on the code **as it is now**: `DEMO_BADGE=Antes demo.sh scene <run>/before <id> --fast`. The run that reproduced the finding in step 4 already took this still when it carried the badge.
2. **Fix.** One round, for the crew's findings and the review's together. Defects get the regression check at the cheapest level that catches the cause; friction fixes follow `impeccable`. Rebuild and restart the server. The delta review of this round runs while you take the after stills.
3. **After.** Copy the run (`cp -R <run>/before <run>/after`), delete the proposal scenes, and adjust each remaining scene only where the fix changed the screen. Change the captions to say what is different for the person. Run each: `DEMO_BADGE=Depois demo.sh scene <run>/after <id> --fast`. A still that shows the problem means the fix failed: fix again, once.
4. **Look at every pair**: the badge and caption match what is on screen, the problem is visible in "antes" and gone in "depois", and no personal data shows.

No video by default: it cost more than the workers did. When the user asks for one, record the same two runs with `demo.sh record` and cut them with `python3 <skill-dir>/scripts/qa_reel.py --out <run>/out --pair <run>/before <run>/after`.

With no finding to fix or propose there are no stills: the evidence is the list of journeys walked.

5. **Record what the crew used**, right after the "depois" stills, or after step 4 when nothing was fixed:

```bash
python3 <skill-dir>/scripts/qa_scope.py --repo <repo> --exercised <run> --lenses <the lenses that ran, comma separated>
```

It stores the screens as they are now. Name `inputs` when the probe ran on every touched form, and a worker lens only when a worker really ran it with its account.

**Complete when:** every fixed finding has a "depois" still you looked at that shows it gone, or the gate found nothing; and `<run>/exercised.json` exists.

## 6. Deliver

- **PR body** (the `pr` skill owns the format): under Evidence, one Before/After pair per fixed finding with a caption in product words, then one line and the "antes" still per proposal. Attach the stills with `gh pr comment <n> --attach` and place the URLs in the table. End the body with the marker the script prints after the last commit; never write it by hand:

  ```bash
  python3 <skill-dir>/scripts/qa_scope.py --repo <repo> --stamp <run> --findings <n> --fixed <n> --proposals <n>
  ```

  `merge-gate` checks it against the PR. Exit 3 means a screen changed after the crew used it, usually a fix the delta review asked for. Then run the **light round**: one worker, `hurry` lens, only the screens the script lists, 5 minutes; fix what it finds, record `--exercised` again, and stamp. In a new run directory, pass `--lenses` with the lenses the old marker lists plus `hurry`. A review fix that touches no screen needs no round. Keep the run directory until the PR carries the marker.
- **Closing message images:** show the pairs to the user in the closing message, not only in the PR.
- **Closing message:** journeys walked, findings fixed, proposals awaiting the user's decision, issues opened, and what stayed **unverified and why**.
- **Cleanup:** remove the labeled test data, log out the test sessions and delete the session files, stop servers started for this run, delete the run directory after the stills are attached.

**Complete when:** `qa_scope.py --pr <n> --require-evidence` exits 0 and nothing the crew created is left behind.

## Anti-patterns

- Treating "the screen renders" as "the feature works".
- One account that sees everything: it hides every permission bug.
- Taking the "antes" still after the fix, by reverting or faking the old state.
- Rewording a caption to hide what the frame shows.
- Folding a structural redesign into the PR as if it were a small fix.
