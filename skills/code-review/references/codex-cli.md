# Codex CLI as reviewer or fixer

Facts about the Codex CLI that an agent cannot guess. `review-run.mjs` builds the normal commands; this file covers what it does not.

## Accounts and binary

- A bare `codex` or `claude` inherits the caller's `CODEX_HOME` / `CLAUDE_CONFIG_DIR`, so the call silently lands on the default account. Call each tool through the account's wrapper by absolute path: shell aliases do not exist in scripts. Give every delegated task that account's provider instance.
- `codex exec resume` only finds sessions created by the same account; a switch of account means a fresh full review.
- A failed login is reported as `BLOCKED`; it never authorizes another account or copied credentials.
- An old app-bundled `codex` lacks newer model metadata, and the server then rejects the model with a misleading "not supported with a ChatGPT account". Check `codex --version`; confirm the slug in `codex debug models`.
- Model: the one the user names, else the policy's.
- Smoke, once per session: `codex exec -m <model> -s read-only --skip-git-repo-check -o "$TMPDIR/ping.txt" "Reply OK and your model name"`. When your own account's `config.toml` fails to parse, use a temporary `CODEX_HOME` holding a copy of that account's `auth.json` and a minimal config, and delete it afterwards. Only within one account.

## Effort by risk

Start from T0's `route.effort` and raise it when the diff reaches these areas in ways paths do not show.

| Change | Effort |
| --- | --- |
| Auth, sessions, tenancy, credentials, migrations, money, safety-critical values | `xhigh` |
| Backend logic, contracts between services | `high` |
| UI copy, error mapping, tests-only, docs | `medium` |
| Delta | one level below the full review, unless the fix crosses the `xhigh` areas |
| Fix | `high`; `medium` for the UI/tests/docs row |

## Prompts and flow

- Review prompt, delta prompt and `--fresh-prompt` history: `codex-review-prompt.md`. Plans, skills and other artifacts: `artifact-review.md`.
- Fixer: `review-run --role fix` with `codex-fix-prompt.md` and only the accepted findings. The fixer leaves changes in the working tree and calls no reviewer; the delta belongs to the original reviewer. Extra writable directories go in the fix provider's `writableRoots` in the policy.
- Rerun T0 and the affected suites yourself after a fixer: fixers often delete the `node_modules` or generated clients they installed.
- When the reviewer's provider is limited at delta time, `review-run --fresh-prompt <file> --full-base <base-sha>` lets the next candidate do a full review (the output says `FRESH`); without it `review-run` exits 3 and `review-ledger limits` shows the reset.
- In T3, delegate instead of shelling out: `t3-workflow.md`.

## Calling `codex` directly

- `exec resume` accepts only `-m`, `-c`, `-o`, `--json` and `--skip-git-repo-check`. Set the sandbox with `-c 'sandbox_mode="…"'` and extra writable dirs with `-c 'sandbox_workspace_write.writable_roots=[…]'`.
- Interactive QA (the reviewer drives the running app) needs `codex exec -s workspace-write -c sandbox_workspace_write.network_access=true`, outside `review-run`; then record the call with `review-ledger record`.
- Read-only reviewers run write-free checks only (`git diff --check`, `tsc --noEmit --incremental false`): the sandbox blocks the Jest cache with EPERM. Give them the context in the prompt instead of external services.
- Work that outlives the turn, in harnesses that kill background tasks: launch with `../scripts/detach.py <name> <abs-out-dir> <cwd> <stdin-file|-> -- <command>`. It writes `<name>.out`, `.log` and `.exit`; watch the `.exit` files, not PIDs. Pass an absolute out-dir, put the prompt in the stdin slot, and add `--skip-git-repo-check` when `<cwd>` is not a git repo. A missing `.log`/`.out` next to the `.pid` means the launch failed; read `<name>.exit`.
