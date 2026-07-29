---
name: ask-gemini
description: Use when the user asks for a focused second opinion from Gemini via the local Gemini CLI.
---

# Ask Gemini

Use the locally installed Gemini CLI as an external advisor for focused questions, design feedback, research critique, or second opinions.

## Preconditions

- The user asked for Gemini, an external second opinion, or this skill by name.
- The local `gemini` CLI is installed and configured.
- The task can be shared with Gemini without exposing secrets or private data beyond the user's intent.

## Workflow

1. Check the local CLI when needed:

```bash
gemini --version
```

2. Run the narrow prompt non-interactively:

```bash
gemini -p "<focused prompt>"
```

If the installed CLI uses a different prompt flag, inspect `gemini --help` and adapt to the local variant.

3. Save a redacted artifact when the result should be reused:

```text
docs/ai/external-advice/gemini-<slug>-<timestamp>.md
```

Use a project-visible path when inside a repository. In a projectless harness audit, use the current scratch workspace.

## Artifact Sections

- Original task
- Prompt sent
- Gemini output summary
- Actionable findings
- Caveats or unverified claims

## Safety

- Do not pass secrets, credential files, session logs, shell snapshots, or private prompts.
- Do not treat Gemini output as authority. Verify claims against local repo evidence before acting.
- If `gemini` is missing, state that the local CLI is required and ask whether to proceed without it.
