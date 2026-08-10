# Runtime Proof And QA Evidence

Use this reference when executable behavior, browser smoke, authenticated login, visual QA, CLI interaction, or testability evidence is part of the change.

## High-Testability Runtime Gate

Static review is not enough for executable behavior. Before completion, the builder must exercise the exact production code path touched whenever feasible.

Require runtime proof for:

- any executable behavior change;
- bug fixes and regression fixes;
- refactors of large files, long functions, services, hooks, controllers, handlers, repositories, tools, commands, or jobs;
- cross-repo changes where producer and consumer compatibility can break;
- backend boundary, persistence, auth, validation, concurrency, N+1, unbounded query, or integration changes;
- Web UI/browser changes, with the main agent using browser-use first when user experience is material. If no browser-use session is exposed, load the Browser skill, discover the Node REPL `js` tool if needed, bootstrap the browser runtime, and open a new browser-use tab/session before fallback. Computer-use is reserved for desktop/native/local-app validation, OS/browser shell behavior, or documented failed browser-use bootstrap/open attempt.

Acceptable proof:

- focused tests that import/call the real production function, class, handler, route, hook, adapter, or command;
- route/tool/integration/e2e smoke that reaches the changed production boundary;
- temporary probe that imports production code and uses only boundary mocks for external side effects;
- main-agent browser-use validation for human-facing web flows, complemented by scripted checks when repeatability matters.

Not enough by itself:

- lint, typecheck, build, formatter, or static diff review;
- testing a copied implementation;
- broad test suites where the touched path is not shown to execute;
- mock-only tests that only assert mocks were called.

Reviewer-facing validation must explain what behavior was exercised and what risk it proves. Do not paste command dumps.

## QA Evidence Contract

When UI, browser, desktop, CLI interaction, authenticated smoke, or visual behavior changed, the main agent must produce a minimum evidence record before closeout. Use `templates/qa-evidence.md` when a written record is useful.

Minimum evidence:

- flow tested;
- surface and environment;
- authenticated smoke target classification (`local`, `dev`, `staging`, or `prod`) when login is involved;
- credential lookup performed before login-blocked claims: repository instructions, workstream memory, restricted credential file, documented local creation, or user-provided access;
- initial state, including session/data/config state;
- actions performed;
- observed result compared to expected behavior;
- screenshot/video path or uploaded asset when the surface is visual;
- browser-use notes for web human-like validation, including whether an existing tab was reused or a new browser-use tab/session was opened, or computer-use notes only for desktop/native/local-app validation or documented failed browser-use bootstrap/open attempt;
- complementary deterministic test/probe when repeatability matters;
- bugs found, or the exact phrase `No bug observed.`

Do not accept vague claims such as "tested the UI" without this evidence.

For authenticated UI smoke, do not accept "login failed" or "stopped at login" as sufficient evidence. The report must say whether matching saved smoke credentials were found and used with values redacted, or which approved sources were checked. If login fails after an approved credential source, classify the likely cause: invalid credential, environment mismatch, app/auth bug, missing backend/API, or missing seed/setup.

If no saved credentials are found, the agent still must not abandon the smoke. For `local` or `dev`, it should use a documented safe non-sensitive seed/setup flow when the repository provides one; otherwise ask the user for the single missing credential/environment detail. For `staging` or `prod`, it must not create credentials and must ask the user or use an approved restricted source.

## Runtime Closeout Standard

Before completion:

- name the production function, route, hook, handler, adapter, command, or user flow exercised;
- state the behavior protected and the failure mode covered;
- list skipped checks with exact blocker and residual risk;
- include screenshot/video paths only when the surface is visual;
- say `No bug observed.` only when the checked flow actually matched expectations.
