---
name: create-verification-skill
description: >-
  Generate or maintain a repository's verification skill that drives the app the way a user does, any stack: "make a control skill for this repo", a project with no scripted way to prove UI/CLI/service behavior, "audit the verify skill", "atualiza o verify".
---

# Create a verification skill

Source: adapted from the pstack plugin by Lauren Tan (poteto), v0.9.29, in [cursor/plugins](https://github.com/cursor/plugins). pstack is MIT-licensed; its copyright and permission notice are kept in [LICENSE](LICENSE).

The output is a repository skill at `.claude/skills/verify-<app>/`, plus one line in the repository's `AGENTS.md` naming that path so every harness finds it. Its reader is an agent arriving cold, mid-task, that has never seen the app.

## 1. Read the repository

Answer from the codebase; ask the user only what you cannot observe:

- **Surface:** what a user touches (web UI, CLI/TUI, desktop, API, mobile, library). Pick the primary one, note the rest.
- **Run:** the documented start command, ports, env vars, seed data, auth.
- **Drive:** existing harnesses first (Playwright specs, expect scripts, PTY helpers, curl-able endpoints, a debug port); then a generic recipe: browser for web and Electron, tmux/PTY for CLI/TUI, HTTP for services.
- **Observe:** screenshots, transcripts, response bodies, logs, exit codes, DB state.
- **Isolate:** whether two instances can run side by side. When they cannot, the skill says so and refuses to double-drive a shared instance.

A checkout that does not build or start gets fixed or precisely reported first. An irrelevant missing asset that blocks startup may be created by the skill, marked as verification scaffolding, and removed in cleanup.

## 2. Write the skill

`SKILL.md` with frontmatter (`name: verify-<app>`, a `description` naming the app, the surface and when to use it) and these sections, each from what step 1 found, with no placeholders:

- **Launch:** the command, the ready signal (a log line, a port, a prompt), and teardown. A short-lived CLI builds once, then runs each drive in its own PTY or tmux session.
- **Doctor:** one read-only check: process up, right build, port owned by this run, auth valid.
- **Drive:** real selectors and commands from this repository, on stable handles (ARIA labels, prompt strings, routes).
- **Evidence:** what proves a feature and where it is stored. Drive the real user path, capture the action and the resulting state, check side effects (files, rows, messages). A dry-run or test mode is trusted only after observing what it really skips.
- **Cleanup:** stop what this run started, by PID or session; evidence survives at its named location.
- **Helpers:** every shipped script is executable and its invocation appears in the body.

## 3. Seed the feature map

`features/README.md` as the index, plus one file per user-facing feature (the top 3 to 5, from routes, commands, menus or docs), shaped like [`references/feature-map-example/`](references/feature-map-example/). Each file has the H2s `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, `Gotchas`, and names the end state that proves the feature. A proof that drives one entry point is incomplete when the map lists others.

## 4. Prove it

Run the skill end to end once: launch, doctor, drive one mapped feature, capture evidence, clean up, then confirm the evidence still exists. Run cleanup after every failed attempt too. Hand it over only after this run passes.

## Keep it honest

When asked to audit an existing verify skill, end in one outcome: **clean** (every feature covered from source and driven live, no PR), **changed** (one PR of proven corrections), or **blocked** (say exactly what stopped it). Edit only the verify skill's own directory: a behaviour the app no longer has is doc drift (fix the map) or a product regression (report it to the user). Run doctor before the first drive and after any failed one. A feature is `verified-unreachable` only with its concrete prerequisite (auth, entitlement, OS, external state) and the route tried.
