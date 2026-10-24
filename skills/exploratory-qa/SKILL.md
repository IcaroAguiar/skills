---
name: exploratory-qa
description: Test what was shipped the way real people use it — parallel cheap agents acting as personas, abusing flows, inputs, permissions, tabs, devices and timing to find what development, CI and code review miss. Use when asked to "test what we shipped/subimos", "testar como humano", "QA exploratório", "caçar edge cases pela UI", or to validate a period of merged PRs through the interface.
---

# Exploratory QA

Goal: find the defects that tests, CI and review **do not** catch. A page that loads is not a result. A result is a broken or confusing outcome when a person does something plausible but unplanned.

You are the orchestrator. Workers explore. You own the scope, the safety rules, the triage and the report.

## 1. Inventory what shipped

- List the merged PRs in the period: `gh pr list --state merged --base <default> --search "merged:>=YYYY-MM-DD" --json number,title,body,files`.
- For each PR, read its description and the acceptance criteria of the linked issue. Note the UI routes it touches and the **promises** it makes: "X only appears when…", "Y is blocked until…", "Z keeps the history".
- Each promise becomes a target to break. Group the PRs into **journeys**, one per worker, by the person who uses them, not by PR.

## 2. Choose the environment before anything else

Exploration needs writes, because most edge cases happen while saving, submitting, cancelling midway and retrying.

- **Default:** a write-capable non-production environment, such as a local stack or staging. Follow the project's own rules (AGENTS.md or CLAUDE.md) for which database and servers are allowed.
- **Production:** read-only by default. Writes are allowed only with dedicated test accounts, clearly labeled test data (unique suffix) and a cleanup step the worker runs. If you can't satisfy all three, stay read-only and say which promises stayed unverified.
- State the choice and its consequence in the report. Never present a read-only pass as "tested".

## 3. Accounts and sessions (safety)

- Use **test accounts only**. Before using any credential, check without printing it that it is not a personal account: compare it with the user's known e-mail and look at the display name after login. One account per persona.
- Include the **wrong** people too: no permission, another organization, expired grant, only the legacy role. A permission promise is tested only when someone who must NOT see a control is shown not seeing it.
- Log in **once per account** yourself and hand the workers a stored session (Playwright `storageState`, file mode 600). Parallel logins hit rate limits and lock accounts.
- Workers must never read, print, copy or attach the session or credential files.
- At the end: log out each test session on the server, confirm a `401`, and delete the session files.

## 4. Brief the workers

Spawn one worker per journey in parallel, on the cheapest capable model:
- **Claude Code:** `Agent` with `model: haiku`, `general-purpose`, in the background.
- **Codex:** parallel `codex exec` processes on a small model.
- **Other harnesses:** whatever parallel worker they offer, or run the journeys one after another.

Fill `references/worker-brief.md` for each worker and give it the matching heuristics from `references/human-heuristics.md`. Every worker gets:
- persona(s) and goal, written as a person would say it;
- the promises from step 1 to try to break;
- environment, URLs, session file path and write policy;
- a time box (about 20 to 30 minutes of activity) and an output folder;
- the instruction to **behave like a person**: hesitate, go back, mistype, paste, reload, open a second tab, give up halfway, come back later, use the phone.

## 5. Triage (you, not the workers)

- **Reproduce every reported failure yourself** before you call it a defect. Use the API, logs and code to find the cause.
- Classify each one:
  - **defect**;
  - **design and usability**: a cluttered screen, too many frames or too much text, more than one competing primary action, a decision split across places, hard-to-find navigation, small or crowded targets, awkward handling on the phone, contradictory messages, a disabled control with no reason, jargon or an enum leaking into the UI;
  - **expected behavior**;
  - **environment** or a **bad brief**. When it is your own brief, fix the brief instead of filing an issue.
- Defects: check open issues first. Comment on the existing one instead of opening a duplicate. Open new issues with steps, persona, viewport, expected versus actual, and the request path and status.
- Design and usability: **do not open individual issues.** Gather them in a **correction list** for the end of the report, grouped by screen and ranked by impact on the person. Each item gets a screenshot path and a one-line suggested direction. The user decides with you which correction task to open.
- Workers judge design too. You also look at every screenshot yourself: workers under-report clutter.
- Report incidents honestly, even small ones: a leaked token or cookie, a personal account used, data written where it shouldn't be.

## 6. Report to the user, briefly

Per journey: what was attacked, what broke (confirmed), and what stayed **unverified and why**. Then give the **design and usability correction list**, grouped by screen, with the most harmful first, and propose one correction task. End with the issue links and the cleanup confirmation: sessions closed, test data removed, temporary files deleted.

## Anti-patterns

- Treating "the screen renders" as "the feature works".
- One account that sees everything. That account hides every permission bug.
- Workers filing issues directly, or reporting without reproduction.
- Leaving test data, sessions or background agents behind.
