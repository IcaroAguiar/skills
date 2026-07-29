---
name: finding-authenticated-smoke-context
description: Finding approved smoke context for authenticated browser smoke, login screenshots, real UI QA, codex-smoke-context, credential lookup, login blockers, 401/403 browser validation, or already-running app/API reuse.
---

# Finding Authenticated Smoke Context

Use this skill before authenticated browser smoke, login screenshots, dev/local/staging/prod UI QA, or browser validation that may need credentials, app URLs, API URLs, seeded users, or already-running services.

Goal: find the approved smoke context, avoid asking for credentials too early, avoid duplicate dev servers, and keep secret values redacted.

## Reference Router

- `references/pressure-tests.md`: auto-invocation failure scenarios and audit prompts.
- Known saved smoke sources are lookup hints only. Retrieve values through `codex-smoke-context inspect`; never store credential values in this skill.

## Trigger

Invoke without waiting for the user to name it when work mentions authenticated smoke, browser login, login screenshot, real UI QA, saved smoke credentials, credential source, `codex-smoke-context`, staging login, production login, 401/403, login required, auth wall, session issue, tenant mismatch, or already-running app/API.

Do not stop at `login required` until the lookup path has run or failed with a concrete tool blocker.

## Canonical Tool

`codex-smoke-context` is the shared CLI for safe credential lookup and registration. It reports source paths, variable names, targets, app/API URLs, and redacted status; it must never print credential values. Credentials saved with `--app` are scoped to that app and must not satisfy sibling apps by default.

If it is not in `PATH`, use `$HOME/.local/bin/codex-smoke-context`.

Before relying on the tool in a new harness, verify:

`codex-smoke-context --help`
`codex-smoke-context --json doctor`

`doctor` must return `values_redacted: true`; JSON errors must use the same redacted shape.

## Workflow

1. Classify target environment: `local`, `dev`, `staging`, or `prod`. Done when target and app guess are explicit.
2. Read repository-local instructions and current workstream context for smoke/auth guidance. Done when local guidance is applied or absent.
3. Inspect before asking for credentials, declaring auth blocked, or starting a duplicate server. If app name is unknown, try `web` first unless repo instructions name another app; use `codex-smoke-context list --repo .` when multiple apps/targets are likely.

`codex-smoke-context inspect --repo . --target <local|dev|staging|prod> --app <app-name> --json`

Fallback:
`$HOME/.local/bin/codex-smoke-context inspect --repo . --target <target> --app <app-name> --json`

4. Refuse unsafe output. If `values_redacted` is not `true`, stop and report unsafe CLI output without using it.
5. Use a matching source once with values redacted. Report only source path, variable names, account class, target, app/API URL status, blockers, and next action.
6. If missing, use safe local seed/setup for `local` when documented; for `dev`, `staging`, and `prod`, ask after lookup unless a documented approved source exists. Never create prod credentials automatically.
7. Save future smoke sources only through the CLI. For non-interactive imports, use a private temp directory, `chmod 600` the source file before saving, import with `--source-file`, then delete the temp file. Use `--allow-prod-save` only after explicit user approval.
8. Reuse already-running compatible app/API services when possible before starting new servers.
9. Prefer browser-use for human-facing web validation when available; use deterministic browser tooling as support or fallback.

## Source Precedence

Prefer the safest matching source:

1. repo-local `AGENTS.md`, README, setup docs, or smoke docs;
2. current workstream instruction or memory for the same repo and target;
3. `codex-smoke-context inspect` for the same repo, app, and target;
4. documented safe local/dev seed or fixture workflow;
5. user-provided source after lookup fails.

Never reuse credentials across repository, tenant, app, or target environment just because they worked before.

## Missing Credential Prompt

Ask one precise question only after lookup fails:

`Nao encontrei credencial aprovada para <target> neste projeto depois de checar as fontes locais. Voce quer me passar uma credencial smoke para salvar localmente em fonte restrita, ou indicar a fonte aprovada existente?`

If both `codex-smoke-context` and `$HOME/.local/bin/codex-smoke-context` are unavailable, report that tool blocker first. Do not ask the user to paste credentials until the missing-tool state is explicit.

## Inspect Result Handling

- `credential_status: "found"`: use the referenced source once; report only source path, variable names, and account class.
- `credential_status: "missing"` with `action_required: "ask_user"`: ask the precise question above.
- `app_status` or `api_status` not running: check documented startup before starting anything new.
- `blockers`: carry non-secret blocker names into closeout.
- command errors: report JSON `error.code` and `error.message`, never raw traces or credential values.

## Secret Boundary

Allowed: source path, variable names, account class, target environment, app/API URL status, blockers, next action.

Forbidden: password, token, cookie, OTP, API key, private key, full `.env`, `auth.json`, browser storage, storage state, session JSONL, shell snapshots, or screenshots/logs exposing credentials.

Treat Playwright `storageState`, cookies, localStorage, sessionStorage, HAR files, traces, and authenticated screenshots as secret-bearing artifacts unless proven otherwise. Do not commit, paste, store in memory, or pass them to another agent. Use restricted temp paths and delete artifacts when no longer needed.

## Login Failure Diagnosis

A login error is not enough to block QA. After using a saved or provided source, classify likely failure: invalid credential, wrong environment, app/auth bug, backend/API not running, missing seed/setup, tenant/company mismatch, or browser/session state issue.

Report target, source path, username variable/account class, observed error, likely class, and residual risk. Never report credential values.

## Closeout

For authenticated smoke work, final response includes environment, `codex-smoke-context` summary, credential source status with values redacted, whether app/API was reused or started, browser evidence or blocker, login failure class if applicable, and residual risk.
