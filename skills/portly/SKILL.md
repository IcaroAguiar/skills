---
name: portly
description: >-
  Manage persistent local dev servers with the Portly macOS app and CLI: start, stop, restart, logs, health, projects and ports, adopting external listeners, port conflicts, launch at login.
---

# Portly

`portly <command> --help` has the flags; prefer `--json`. What the help leaves out:

- Every command, `status` included, launches Portly.app when it is closed. Start with `portly status --json` and address servers by exact ID or `project/server`.
- Portly injects `PORT`, `PORTLY=1` and `PORTLY_SERVER` into the child. Health is checked on the configured port, so a process listening elsewhere never turns healthy.
- After `add-server --start`, poll `portly status --json` until `running` and `healthy`, then hit the meaningful URL and read `portly logs <project/server> --tail 100 --json`. After `update-server`, restart a running server.
- `take-over` (alias `adopt`) sends SIGTERM to whatever holds the configured port, waits for the port, then starts the configured command itself. `kill-port` also sends SIGTERM. Portly never kills a conflict on its own; use either only on a process confirmed in scope.
- `quit` stops every managed server, because Portly is their supervisor. Removing a project stops its servers.
- Config: `~/.config/portly/config.json`, hot-reloaded by the app. Logs: `~/.config/portly/logs/`.
- `forever enable` changes macOS login items: run it only with explicit user authorization, then check both `portly forever status --json` and `portly status --json`. The app is macOS-only; a Linux host needs a separate headless daemon.
