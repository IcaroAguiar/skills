#!/usr/bin/env python3
"""PostToolUse hook: after a successful `gh pr merge` / `gh stack merge`, tell the agent to run task-closeout.

Agents rarely run task-closeout on their own after merging a PR, so the instruction alone is not enough. Shared by Claude Code and
Codex: both send the tool call as JSON on stdin and read `hookSpecificOutput.additionalContext`.
"""
import json
import re
import sys

# `gh` must be the command itself, not text inside a string, heredoc or commit message.
MERGE = re.compile(r"^\s*(?:\w+=\S*\s+)*(?:command\s+)?gh\s+(?:-R\s+\S+\s+|--repo\s+\S+\s+)?(?:pr|stack)\s+merge\b")
NOT_A_MERGE = re.compile(r"(?:^|\s)(?:--auto|--help|-h|--disable-auto)(?:\s|$)")

REMINDER = (
    "A PR was just merged. Once any deploy it triggers is green, load the `task-closeout` skill "
    "now, in this turn: run its `scripts/delivered_leftovers.py <repo>` and account for the task's "
    "worktrees, branches, temporary artifacts and processes before the final message."
)


def command_of(event):
    tool_input = event.get("tool_input") or {}
    command = tool_input.get("command") if isinstance(tool_input, dict) else None
    if isinstance(command, list):
        command = " ".join(str(part) for part in command)
    return command if isinstance(command, str) else ""


HEREDOC = re.compile(r"<<-?\s*(['\"]?)(\w+)\1[^\n]*\n.*?^\s*\2\s*$", re.S | re.M)
QUOTED = re.compile(r"'[^']*'|\"(?:\\.|[^\"\\])*\"")


def merged(command):
    command = QUOTED.sub("''", HEREDOC.sub("", command))
    for part in re.split(r"&&|\|\||;|\n", command):
        if MERGE.match(part) and not NOT_A_MERGE.search(part):
            return True
    return False


def main():
    try:
        event = json.load(sys.stdin)
    except ValueError:
        return 0
    if not merged(command_of(event)):
        return 0
    json.dump({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": REMINDER}}, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
