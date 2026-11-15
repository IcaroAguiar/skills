# Sweep: a period of merged PRs

Use when the user asks to test what shipped over a period. The gate in `SKILL.md` covers one change inside its delivery; the sweep covers many changes after the fact and ends in a report, not in a PR.

## 1. Inventory what shipped

- List the merged PRs in the period: `gh pr list --state merged --base <default> --search "merged:>=YYYY-MM-DD" --json number,title,body,files`.
- For each PR, read its description and the acceptance criteria of the linked issue. Note the UI routes it touches and the **promises** it makes: "X only appears when…", "Y is blocked until…", "Z keeps the history".
- Each promise becomes a target to break. Group the PRs into **journeys**, one per worker, by the person who uses them, not by PR.

## 2. Choose the environment

Exploration needs writes, because most edge cases happen while saving, submitting, cancelling midway and retrying.

- **Default:** a write-capable non-production environment, such as a local stack or staging. Follow the project's own rules for which database and servers are allowed.
- **Production:** read-only by default. Writes are allowed only with dedicated test accounts, clearly labeled test data (unique suffix) and a cleanup step the worker runs. If you can't satisfy all three, stay read-only and say which promises stayed unverified.
- State the choice and its consequence in the report. A read-only pass is reported as read-only, never as "tested".

## 3. Accounts and sessions

Step 2 of `SKILL.md` applies. In addition:
- Include every **wrong** person the promises name: no permission, another organization, expired grant, only the legacy role. A permission promise is tested only when someone who must NOT see a control is shown not seeing it.
- Log in **once per account** yourself; parallel logins hit rate limits and lock accounts.
- At the end: log out each test session on the server, confirm a `401`, and delete the session files.

## 4. Brief the workers

One worker per journey, in parallel, on the cheapest capable model. Fill `worker-brief.md` for each with the matching sections of `human-heuristics.md`, the promises from step 1, a time box of 20 to 30 minutes, and `friction-ruler.md`.

## 5. Triage (you, not the workers)

- **Reproduce every reported failure yourself** before you call it a defect. Use the API, logs and code to find the cause.
- **Defects:** check open issues first and comment on the existing one. Open new issues with steps, persona, viewport, expected versus actual, and the request path and status.
- **Friction:** gather it in one **correction list**, grouped by screen and ranked by the effort it costs the person, each item with its ruler counts, a screenshot and a one-line direction. Propose one correction task; the user decides.
- Report incidents honestly, even small ones: a leaked token or cookie, a personal account used, data written where it shouldn't be.

## 6. Report, briefly

Per journey: what was attacked, what broke (confirmed), and what stayed **unverified and why**. Then the correction list, most harmful first, and the proposed correction task. When the user wants to see the findings, record them as scenes and cut them with `scripts/qa_reel.py` (a before run only: every scene plays as a proposal). End with the issue links and the cleanup confirmation: sessions closed, test data removed, temporary files deleted.
