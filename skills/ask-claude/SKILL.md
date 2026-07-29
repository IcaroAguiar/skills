---
name: ask-claude
description: Use when the user asks for a focused second opinion from Claude via the local Claude CLI.
---

# Ask Claude

Use the locally installed Claude CLI as an external advisor for focused questions, reviews, or second opinions.

## Preconditions

- The user asked for Claude, an external second opinion, or this skill by name.
- The local `claude` CLI is installed and configured.
- The task can be shared with Claude without exposing secrets or private data beyond the user's intent.

## Workflow

1. Check the local CLI when needed:

```bash
claude --version
```

2. Run the narrow prompt non-interactively:

```bash
claude -p "<focused prompt>"
```

3. Save a redacted artifact when the result should be reused:

```text
docs/ai/external-advice/claude-<slug>-<timestamp>.md
```

Use a project-visible path when inside a repository. In a projectless harness audit, use the current scratch workspace.

## Artifact Sections

- Original task
- Prompt sent
- Claude output summary
- Actionable findings
- Caveats or unverified claims

## Safety

- Do not pass secrets, credential files, session logs, shell snapshots, or private prompts.
- Do not treat Claude output as authority. Verify claims against local repo evidence before acting.
- If `claude` is missing, state that the local CLI is required and ask whether to proceed without it.
