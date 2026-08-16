# Glossary

## Luna executor

**Luna executor**, also called **cheap executor**, is the serial multi-agent implementation lane in which one maximum-reasoning Luna subagent owns a bounded delivery package in the user's persistent primary checkout, where the user can inspect and test it. A worktree is used only for real parallel work and must hand accepted state back to the primary checkout before runtime or visual validation. A maximum-reasoning Terra subagent replaces Luna only for a qualifying sensitive escalation. The user releases the next package only after the audit and handoff gates.

The executable contract lives in [`$luna-executor`](skills/luna-executor/SKILL.md).

## Antigravity executor

**Antigravity executor**, also called **fast executor**, is the serial implementation lane that routes bounded routine packages through the Antigravity CLI, using Gemini 3.7 Flash High by default, structured receipts, controller audit, independent review, and an explicitly pre-approved queue.

The executable contract lives in [`$antigravity-executor`](skills/antigravity-executor/SKILL.md).
