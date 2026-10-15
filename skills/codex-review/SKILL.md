---
name: codex-review
description: Get an independent review of a branch, PR, plan or artifact from an OpenAI model through the Codex CLI or T3 delegation, judged by the code-review standards, and have Codex fix only the findings you (the orchestrating agent) accept. Use when the user asks for a Codex/GPT review, to "review and approve with Codex", for a second opinion with interactive testing, or "let Codex review and fix until the PRs are mergeable". Works from any agent harness that can run shell commands.
---

# Codex review

An outside model reviews and fixes; you, the agent running this skill, own the triage and the shipping. You judge whether each finding and each fix is valid; you do not write the fixes. When you are Codex yourself, reviewer and fixer still run as separate `codex exec` processes or delegated tasks, so the opinion stays independent.

The approval standard is the `code-review` skill from this catalog: findings split into Standards and Spec, a gate line, and a verdict of `APPROVE`, `APPROVE_WITH_RESIDUAL_RISK`, `REQUEST_CHANGES` or `BLOCKED`.

## 0. Preflight

0. **Local policy and account.** Read `~/.config/agent-review/local.md` (or `$AGENT_REVIEW_LOCAL`) when it exists: it maps repositories to accounts, Codex binaries or T3 provider instances, models, prompt language and job queue on this machine, and it overrides the defaults here. Work that belongs to another account (for example an employer's organization) runs only on that account. Never review or fix it with a personal account, and a failed login never authorizes another account or copied credentials: report the gate as `BLOCKED`. This covers every model call the work makes, so no other account's quota is spent on it: the orchestrating session, reviewers, fixers, lenses, subagents and delegated tasks. A bare `codex` or `claude` inherits the caller's account settings (`CODEX_HOME`, `CLAUDE_CONFIG_DIR`), and a session started for one tool usually has none for the other, so the call silently lands on the default account. Call each tool through the account's wrapper by absolute path, and give every delegated task that account's provider instance. Sessions do not cross accounts: `codex exec resume` only finds sessions created by the same account, so a switch means a fresh full review. In scripts (`detach.py`) use the account wrapper's absolute path, because shell aliases do not exist there. In every command below, replace `codex` with the account's binary.
1. **Binary.** `codex --version`. If a wrapper is broken, use the CLI bundled with the Codex app. An older app-bundled binary lacks newer model metadata, and the server then rejects the model with a misleading "not supported with a ChatGPT account".
2. **Model.** Use the model the user names, else the local policy's, else `gpt-6.1-sol`. Confirm the slug in `codex debug models`; if it is missing, show the list and ask.
3. **Smoke** (once per machine/session): `codex exec -m <model> -s read-only --skip-git-repo-check -o "$TMPDIR/ping.txt" "Reply OK and your model name"`. If your own account's `config.toml` fails to parse, run with a temporary `CODEX_HOME` holding a copy of that account's `auth.json` and a minimal config, and delete it afterwards. Never do this across accounts.
4. **Targets.** Pin the exact base and head SHA of every PR. Working trees clean and on the right branches. For interactive testing, confirm the app is up.
5. **T0.** Run `review-t0` from the `code-review` skill on every PR checkout. A `BLOCKED` result goes back to the author before any reviewer starts; a `PASS` summary goes into the review prompt.

## 1. Review round — one fresh reviewer per PR

Write one prompt per PR from [references/review-prompt.md](references/review-prompt.md). It invokes `$code-review` and carries: the fixed diff (`git diff <base>...<head>`), the spec (what the change must do and what is out of scope), the T0 summary, the author's verification evidence, and the unchanged neighbours the reviewer needs. For plans, skills and other artifacts, use [references/artifact-review.md](references/artifact-review.md) instead.

Pick reasoning by risk, not by habit:

| Change | Effort |
| --- | --- |
| Auth, sessions, tenancy/isolation, credentials, migrations, money | `xhigh` |
| Backend logic, contracts between services, architectural task breakdown | `high` |
| UI copy, error mapping, tests-only, docs | `medium` |
| Delta review | one level below the full review, unless the fix crosses the `xhigh` areas |
| Fix | `high`; `medium` for the UI/tests/docs row. `xhigh` only when the fix touches migrations or auth and the direction is still open: triage already did the hard thinking |

State the role, account, model and effort before dispatch.

**In T3**, prefer delegated tasks: [references/t3-workflow.md](references/t3-workflow.md). **Outside T3**, code-only review runs read-only, all PRs in parallel:

```bash
codex exec -m <model> -c model_reasoning_effort=<effort> -s read-only -C <worktree> \
  -o <out>/<pr>.review.md - < <out>/<pr>.prompt.md > <out>/<pr>.log 2>&1
```

Interactive QA (reviewer drives the running app) uses `-s workspace-write -c sandbox_workspace_write.network_access=true` and the QA sections of the template.

Record each reviewer's `session id:` from the first lines of its log: the same reviewer does the delta review.

## 2. Triage — you judge

For each finding, check the code yourself:
- **Accept:** a real defect with a plausible trigger.
- **Defer:** it fails safely, or the fix would weaken an invariant. Say why.
- **Reject:** it is wrong. Show the evidence.

Show the user a table with finding, decision and one-line reason. Pass along facts you verified that the fixer will need (e.g. "the guard does not check session revocation").

## 3. Fix round — Codex fixes

Run a fixer session with [references/fix-prompt.md](references/fix-prompt.md) and only the accepted items, on the PR's own branch:

```bash
codex exec -m <model> -c model_reasoning_effort=<effort> -s workspace-write -C <worktree> \
  -c 'sandbox_workspace_write.writable_roots=["<other worktree>"]' \
  -o <out>/<pr>.fix.md - < <out>/<pr>.fix-prompt.md > <out>/<pr>.fix.log 2>&1
```

- The fixer leaves changes in the working tree: no commit, push, rebase or branch switching.
- Every fix needs a test that fails without it (RED → GREEN), and T0 passes before the fixer reports.
- The fixer does **not** invoke `$code-review` or any other reviewer: the delta review belongs to the original reviewer, and a nested review doubles the time.

## 4. Verify, commit, delta review

1. **Judge the diff.** Scope creep, weak tests, silent contract gaps (a DTO or error normalizer dropping a new field), behaviour hidden in refactors. If something is wrong, send it back to the fixer; do not patch it yourself.
2. **Rerun the checks yourself**: T0 and the affected suites. Fixers often delete the `node_modules` or generated clients they installed; reinstall before trusting "it passed".
3. **Commit** per repo with a message that lists the fixed findings, and push.
4. **Delta review** with the same reviewer (same CLI session, or a new T3 task carrying the full history). Start a fresh full reviewer only after an account switch. Deltas are not cheap: on this workflow a full review took a median of 7.5 minutes and a delta 6–7, so time is saved by fewer rounds. A fix that arrives with its RED → GREEN test and a green T0 should need one delta at most.
   ```bash
   codex exec resume <reviewer-session> -m <model> -c model_reasoning_effort=<effort> \
     -c 'sandbox_mode="read-only"' -o <out>/<pr>.delta.md - < <out>/<pr>.delta-prompt.md
   ```
   The prompt gives `git diff <old-head>..<new-head>`. When the fix crosses auth, tenancy, credentials, migrations or public contracts, tell the reviewer it may redo the full review. Repeat 2–4 until the verdict is `APPROVE` or `APPROVE_WITH_RESIDUAL_RISK`, for at most two fix rounds. If the verdict is still not approved after the second delta, stop and show the user the open findings with a recommendation (defer, accept as residual risk, or one more round): a third round has cost up to two hours per PR.
5. **Report**: the verdict per PR, the triage table, what was verified, what stays as residual risk, and the merge/deploy order. Merge and deploy only with the user's approval; read what merging triggers (deploy workflows, migrations) first.

## Runtime notes

- **`resume` flags:** it accepts only `-m`, `-c` and `-o`. Set the sandbox with `-c 'sandbox_mode="…"'` and extra writable dirs with `-c 'sandbox_workspace_write.writable_roots=[…]'`; `--add-dir` and `-s` are not accepted.
- **Work that outlives the turn:** in harnesses that end the process between turns, background tasks die with the session. Launch reviewers and fixers with [scripts/detach.py](scripts/detach.py), which starts them in their own OS session and writes `<name>.out`, `<name>.log` and `<name>.exit`. Watch the `.exit` files, not PIDs: some monitors cannot see processes from another session. In T3, delegated tasks already outlive the turn.
- **`detach.py` pitfalls:** pass an absolute `<out-dir>` (a relative one resolves against `<cwd>`, not your shell), put the prompt file in the `<stdin-file>` slot (`-` means `/dev/null`), and add `--skip-git-repo-check` to `codex exec resume` when `<cwd>` is not a git repo, or it exits 1 with "Not inside a trusted directory". A missing `.log`/`.out` next to the `.pid` means the launch failed; read `<name>.exit`.
- **Keep it fast:**
  - Tell read-only reviewers not to run test suites. The sandbox blocks the Jest cache (EPERM) and retries waste minutes; they use T0, the author's evidence and write-free checks (`git diff --check`, `tsc --noEmit --incremental false`).
  - Tell reviewers not to call external services (knowledge bases, GitHub); give them what they need in the prompt.
  - Reserve `xhigh` for the areas in the table, for fixers too.
  - Most of a run is model time between tool calls (about 25–30 s per round trip), not command time. Fewer calls is the main lever: put the context the agent would look up in the prompt, and tell it to read several files per call and run only the affected suites.
  - Parallel PRs finish when the slowest one does. Do not raise one PR's effort "while you are at it".
