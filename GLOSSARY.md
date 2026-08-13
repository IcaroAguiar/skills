# Glossary

## Luna executor

**Luna executor**, also called **cheap executor**, is the serial implementation lane in which one maximum-reasoning Luna task owns a bounded delivery package through isolated worktree, evidence handoff, controller audit, and owner cleanup. The user releases the next package only after the audit and cleanup gates.

The executable contract lives in [`$luna-executor`](skills/luna-executor/SKILL.md).
