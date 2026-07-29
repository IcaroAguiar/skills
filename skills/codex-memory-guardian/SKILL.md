---
name: codex-memory-guardian
description: Use when installing, checking, tuning, or reviewing the local macOS Codex Memory Guardian launchd watchdog.
---

# Codex Memory Guardian

Use this skill when the user asks about the local memory watchdog, Codex memory pressure, stale agent/dev processes, or the `com.icaro.codex-memory-watch` launchd agent.

## Tool Paths

- Tool: `~/.agents/local-tools/codex-memory-guardian`
- Config: `~/.agents/local-tools/codex-memory-guardian/config.json`
- LaunchAgent: `~/Library/LaunchAgents/com.icaro.codex-memory-watch.plist`
- Logs: `~/.local/state/codex-memory-watch/memory.jsonl`
- Snapshots: `~/.local/state/codex-memory-watch/snapshots`

## Commands

```bash
~/.agents/local-tools/codex-memory-guardian/status.sh
~/.agents/local-tools/codex-memory-guardian/codex-memory-watch.py --once --print-json
tail -n 20 ~/.local/state/codex-memory-watch/memory.jsonl
launchctl print gui/$(id -u)/com.icaro.codex-memory-watch
```

## Safety Rules

- Preserve `neverKillPatterns`; do not remove Codex, ChatGPT, Claude, Docker Desktop, browsers, databases, or system processes without explicit user approval.
- Keep `killPolicy` as `allowlist_only`.
- Prefer adding specific disposable process patterns over broad `node` or browser matches.
- Check JSONL evidence before tuning thresholds.
- If action behavior changes, run the tool smoke and a launchctl load/unload probe before claiming it is ready.

## Operating Model

This is a workload reaper, not a generic RAM cleaner. It should kill only stale, disposable agent/dev processes under sustained memory pressure.
