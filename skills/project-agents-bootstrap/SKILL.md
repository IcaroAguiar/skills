---
name: project-agents-bootstrap
description: Use when starting material work in a repository that lacks a project-local AGENTS.md or has stale local project instructions.
---

# Project AGENTS Bootstrap

## Overview

Project instructions should be explicit, local, and reviewable. Create a concise local `AGENTS.md` from discovered facts before material edits when the repository lacks one.

## When to Use

Use before material repo work when:
- no `AGENTS.md` governs the current repository tree
- the user asks to avoid repeating setup instructions
- recurring commands, architecture, or verification rules are being rediscovered
- module behavior, invariants, or workflow expectations changed

Do not overwrite an existing tracked `AGENTS.md` unless the user asked to edit it.

## Discovery

Inspect only relevant local sources:
- `README`, package manifests, lockfiles, workspace files, task runners, CI workflows
- local docs, scripts, test config, docker/compose files, env examples
- existing repo conventions and nearby code

Do not invent commands or conventions. Omit unknown facts or mark them as needing discovery.

## Default Local Policy

- Create `AGENTS.md` at the repository root when absent.
- Keep it local and gitignored by default.
- Global gitignore should ignore untracked `AGENTS.md`; tracked project files still remain tracked.
- If the user wants to publish the instructions, they can explicitly request a commit-ready version.

## Canonical Template

```md
# AGENTS.md

Project instructions for coding agents working in this repository.

## Project Overview
- <what this repo contains>

## Commands
- Install: `<command>`
- Dev: `<command>`
- Test: `<command>`
- Typecheck/build: `<command>`

## Architecture
- <key app/module boundaries>
- <important entrypoints>

## Coding Rules
- <project-specific style and constraints>

## Testing And Verification
- <focused tests and required checks>
- Runtime behavior changes must exercise the exact touched production code path.
- Temporary probes belong in `/codex-scripts/` and must stay gitignored.

## Secrets And Environment
- Do not print or commit secrets.
- Use documented env examples or local smoke credential guidance only.

## Local Workflow Notes
- <repo-specific notes discovered locally>
```

## Closeout

Report whether `AGENTS.md` was created, reused, or intentionally skipped, and why.
