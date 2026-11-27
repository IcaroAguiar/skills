---
name: exploratory-qa
description: >-
  Use the product as a person would, with cheap parallel persona agents that hunt defects and fix confirmed ones in the PR: "testar como usuário", "QA exploratório", "passa um pente fino antes de subir", "testar o que subimos". Not for everyday verification of a change.
---

# Exploratory QA

Hunt the broken or confusing outcome a person meets doing something plausible but unplanned. Run it when asked, or once on the batch headed to production. It blocks no merge and leaves no file or marker in the repository.

Two things count as a finding:
- a **defect**: the product does the wrong thing;
- **friction**: it works and still costs effort it could spare: a field it does not need, free text where a choice or a mask fits, steps that could be one, an error that does not say how to fix it.

For a period of merged PRs, follow [references/sweep.md](references/sweep.md) instead.

## 1. Set up

- Run the branch from a build, in its own checkout and port.
- One test account per persona, from the project's secret store, including a **wrong person** (no permission, another organization) when access rules changed.
- Label everything you create `[QA-<branch>]`.
- When the repository has a `verify` command or e2e suite, run the flows the diff reaches first; each failure is a finding.

**Done when** the app answers with this branch's code and each persona opened one page behind login.

## 2. Walk it

Walk every touched flow yourself. For a new screen, an access rule or a long flow, add workers on the cheapest capable model, one per lens, in the background, each boxed to 10 minutes with [references/worker-brief.md](references/worker-brief.md):

| Lens | Who | Looks for ([references/human-heuristics.md](references/human-heuristics.md)) |
| --- | --- | --- |
| `hurry` | someone doing the main task fast, phone then desktop | interrupted flows, repetition, timing, devices |
| `inputs` | someone typing what the form did not plan for | letters in numbers, pasted formats, spaces, 300 characters, extremes |
| `wrong-person` | someone who must not see or do this | permissions, two tabs, two people |

Layout check: `node <skill-dir>/scripts/ui_audit.mjs --url <url> --viewports 2560x1080,1920x1080,1440x900,1024x800,390x844 --crop-dir <dir>` measures overflow, clipping, overlap and mixed control heights. Each flag is a question you answer by looking; a flag on a look the user approved is listed as accepted.

## 3. Triage and fix

Reproduce every finding first: workers over-report breakage and under-report clutter.

| Finding | Route |
| --- | --- |
| Defect in the batch, or one it makes easier to hit | Fix in this PR |
| Small friction on a touched screen: a mask, a default, a label, a field removed, a clearer error | Fix in this PR, in its own commit |
| Structural friction: steps merged or reordered, a screen rearranged | Proposal to the user, with the image |
| Outside the batch | Issue, after checking for an existing one |
| Expected behaviour, environment, your own bad brief | Drop it |

Treat a confirmed defect as a pattern: find every screen that renders the same component and fix it at the shared source. Replay each fix on the fixed code.

## 4. Report and clean up

Name the journeys walked, what was fixed, what is proposed (images in the chat), the issues opened, and what you could not check and why. Remove the labelled data, stop the servers you started, and delete the sessions of accounts that live outside this machine.
