---
name: cost-aware-exec
description: Use before shell or terminal exploration that can produce large output or high token cost, especially broad rg/find/strings/log reads, searches under $HOME, ~/.codex, ~/Library, bundles, caches, monorepos, multi-repo workspaces, or repeated polling of long-running commands.
metadata:
  short-description: Keep shell exploration token-efficient
---

# Cost-Aware Exec

Use this skill before running commands whose output may be large, repetitive, or expensive to feed back into the model.

## Output Risk

Classify the command before running it:

- `low`: one known file, `git status`, focused `git diff`, focused test, short manifest, or exact path lookup.
- `medium`: one repository, bounded logs, focused `rg` with exclusions, build/test with known output behavior.
- `high`: `$HOME`, `~/.codex`, `~/Library`, `Application Support`, bundles, archives, logs, caches, monorepo roots, multi-repo roots, `strings`, `rg --text`, recursive `find`, or repeated process polling.

For `high`, do not run the full content command first. Run a sizing, listing, or sampling command, then narrow.

## Default Limits

- Start `max_output_tokens` at 2k-5k for exploratory commands.
- Use 8k-12k only when the command is already narrowed and the extra output is necessary.
- Avoid 20k+ unless the user explicitly asked for raw output or the result is known to be bounded.
- Prefer `yield_time_ms` that lets long commands settle without repeated polling; when polling is needed, keep `max_output_tokens` low.

## Narrowing Patterns

Prefer:

```sh
rg -l "needle" path --glob '!node_modules/**' --glob '!dist/**' --glob '!.git/**' | head
rg -n "needle" path --glob '!node_modules/**' --glob '!dist/**' --glob '!.git/**' | head -n 80
find path -maxdepth 3 -type f -name '*.jsonl' -print | head
tail -n 200 log-file
sqlite3 db.sqlite "select ... limit 50"
jq '...' file.json
```

Avoid as first pass:

```sh
rg "needle" "$HOME"
rg --text "needle" ~/.codex
strings large-bundle | rg "needle"
find ~/Library -type f -print
cat huge.jsonl
```

## Exclusions

For repo and workspace searches, exclude generated and dependency trees unless they are the target:

```sh
--glob '!node_modules/**'
--glob '!dist/**'
--glob '!build/**'
--glob '!coverage/**'
--glob '!.git/**'
--glob '!*.tsbuildinfo'
```

For local runtime directories, prefer structured indexes or metadata first:

- Codex usage: SQLite tables and `session_index.jsonl` before full session JSONL.
- Git history: `git log --oneline`, `git show --stat`, or narrowed `git diff`.
- Logs: `tail`, time windows, `rg -n` with `head`, or service-specific status commands.

## Stop Rule

Stop broadening once the decision is supported. If more output is needed, state what evidence is missing and run the smallest command that can produce it.

