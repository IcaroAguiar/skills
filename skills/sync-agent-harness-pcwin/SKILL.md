---
name: sync-agent-harness-pcwin
description: Synchronize the user's custom agent harness from the Mac to both the PCwin-Icaro Windows Codex host and its WSL environment, including skills, agents, global instructions, lifecycle hooks, and the universal Notion plus Obsidian Brain MCP routing. Use when asked to migrate, refresh, repair, compare, or verify harness behavior on PCwin/WSL, after global harness updates on the Mac, or when remote executors are missing a local capability.
---

# Sync Agent Harness PCwin

Keep the Mac authoritative and synchronize only the active harness surfaces to both runtimes used by PCwin-Icaro:

- Windows user `Icaro`, which launches Codex remote-control chats even when their project path is inside WSL.
- WSL user `icaro`, which runs Linux CLI and shell sessions.

Use the bundled deterministic script instead of reconstructing `rsync`, junction, and symlink commands ad hoc.

## Safety boundary

Never copy authentication, API keys, credentials, sessions, memory databases, automation state, browser profiles, plugin caches, project repositories, `.env` files, or the whole `~/.codex` directory.

Synchronize only:

- `~/.agents/skills` and `~/.agents/.skill-lock.json`
- `~/.codex/agents` and `~/.codex/AGENTS.md`
- canonical lifecycle hook code and the portable WSL `~/.codex/hooks.json`
- MCP endpoint definitions for hosted Notion and the queue-mode Obsidian Brain server
- adapter agent definitions under Claude, Cursor, and OpenCode when present

The Brain outbox contains sanitized durable work records, not credentials, and
is pulled back to the Mac by the background reconciler. Never sync OAuth tokens
or substitute a copied credential for per-runtime authorization.

Treat the Mac as the source of truth. The script uses `--delete` inside these bounded harness directories, so remote-only edits there will be removed. If the user asks only for status or diagnosis, inspect read-only and do not run the sync.

## Workflow

1. Resolve this skill's installed directory and locate `scripts/sync-agent-harness-pcwin`.
2. Run `bash -n` on the script before execution.
3. Check the SSH alias and remote identity read-only:

   ```bash
   ssh pcwin-qualityflow 'printf "USER=%s HOME=%s\n" "$USER" "$HOME"'
   ```

4. If unexpected real directories already occupy an adapter skill path, stop and inspect them. Do not replace user-owned directories merely to create a symlink.
5. Run the script only when synchronization is authorized:

   ```bash
   <skill-directory>/scripts/sync-agent-harness-pcwin
   ```

   Pass another SSH alias as the first argument when needed. Override either remote home only with an explicit, validated path:

   ```bash
   REMOTE_HARNESS_HOME=/home/icaro <script> <ssh-alias>
   REMOTE_WINDOWS_HOME=/mnt/c/Users/Icaro <script> <ssh-alias>
   ```

6. Require the script's final verification to pass. It checks `improve`, the custom `grilling` policy, agent counts, system-skill separation, adapter links, lifecycle hooks, exact hook trust, and both MCP definitions.
7. For higher-risk or disputed syncs, compare hashes of representative files and run an `rsync -ani` dry-run after completion.

## Required topology

### Windows remote-control runtime

- `C:\Users\Icaro\.agents\skills` is the canonical Windows skill catalog.
- `C:\Users\Icaro\.codex\skills` is a directory junction to that catalog, including the runtime-managed `.system` directory.
- Claude, Cursor, and OpenCode skill directories are junctions to the same catalog.
- Windows Codex agents and `AGENTS.md` are synchronized independently from the WSL copies.

### WSL runtime

- `/home/icaro/.agents/skills` is the canonical user-skill catalog.
- `/home/icaro/.codex/skills/.system` remains a real directory managed by the remote Codex version.
- Each Codex user skill is an individual symlink into `~/.agents/skills`.
- Claude, Cursor, and OpenCode skill directories point to the shared catalog.
- `~/.agents/AGENTS.md` points to `~/.codex/AGENTS.md`.
- Mac-only absolute skill links are materialized as real content on WSL.
- `~/.codex/hooks` and `~/.codex/hooks.json` are present and portable.
- Notion uses the hosted MCP endpoint; Obsidian Brain uses queue mode under
  `~/.agents/harness-ledger` for later silent reconciliation on the Mac.

Do not assume that a WSL project path means Codex itself runs under the WSL home. Remote-control chats are launched by Windows and load skills from `C:\Users\Icaro`; Linux CLI sessions load them from `/home/icaro`.

Do not create a cross-host filesystem link from PCwin to the Mac. Junctions and symlinks prevent drift among harnesses on one host; the bundled synchronization handles drift between hosts.

## Authentication and runtime proof

Keep remote authentication separate. Never copy the Mac's Codex auth state. If a remote `codex exec` smoke returns `401`, report authentication as the blocker while preserving filesystem/catalog proof.

After a successful sync, require a new remote Codex task so the runtime reloads the catalog. Existing tasks retain the skill catalog injected when they were created. Report Windows and WSL counts separately, key verification results, skipped protected surfaces, and any remaining authentication or version caveat.
