---
name: note
description: Use when important context should be saved in a visible notepad for compaction resilience or cross-turn continuity.
---

# Note Skill

Save important context to a visible notepad file that survives conversation compaction.

## Default Path

Use the nearest appropriate visible path:

```text
docs/ai/notepad.md
```

In projectless harness audits, use the current scratch workspace, for example:

```text
harness-audit/notepad.md
```

Do not require hidden runtime directories for normal note taking.

## Usage

| Command | Action |
| --- | --- |
| `/note <content>` | Add a timestamped working-memory note |
| `/note --priority <content>` | Add a short high-priority note |
| `/note --manual <content>` | Add a durable user-controlled note |
| `/note --show` | Display current notepad contents |
| `/note --prune` | Remove stale working-memory entries when safe |
| `/note --clear` | Clear working memory only after explicit user approval |

## Sections

- Priority Context: short facts that should survive compaction.
- Working Memory: timestamped temporary findings.
- Manual: durable notes explicitly approved by the user.

## Safety

- Never store secrets, token values, auth files, session JSONL, shell snapshots, or private prompt internals.
- Prefer references to paths, variable names, and redacted summaries.
- Do not create hidden state directories for normal notes.
