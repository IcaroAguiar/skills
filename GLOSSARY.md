# Glossary

## Luna executor

**Luna executor**, also called **cheap executor**, is the serial implementation lane in which one maximum-reasoning Luna task owns a bounded delivery package through isolated worktree, evidence handoff, controller audit, and owner cleanup. The user releases the next package only after the audit and cleanup gates.

The executable contract lives in [`$luna-executor`](skills/luna-executor/SKILL.md).

## Antigravity executor

**Antigravity executor**, also called **fast executor**, is the serial implementation lane that routes bounded routine packages through the Antigravity CLI, using Gemini 3.7 Flash High by default, structured receipts, controller audit, independent review, and an explicitly pre-approved queue.

The executable contract lives in [`$antigravity-executor`](skills/antigravity-executor/SKILL.md).
