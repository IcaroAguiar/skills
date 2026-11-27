import json
from pathlib import Path
import subprocess
import sys
import unittest

HOOK = Path(__file__).with_name("closeout_after_merge.py")


def run(event):
    out = subprocess.run([sys.executable, str(HOOK)], input=json.dumps(event), capture_output=True, text=True, check=True).stdout
    return json.loads(out)["hookSpecificOutput"]["additionalContext"] if out else None


def bash(command):
    return {"hook_event_name": "PostToolUse", "tool_name": "Bash", "tool_input": {"command": command}}


class CloseoutAfterMergeTests(unittest.TestCase):
    def test_reminds_after_a_merge(self):
        for command in [
            "gh pr merge 53 --squash",
            "gh pr merge 53 -R owner/repo --squash --match-head-commit abc",
            "gh -R owner/repo pr merge 7",
            "gh stack merge 12 --yes",
            "cd repo && gh pr merge --squash && git pull",
            "GH_REPO=o/r gh pr merge 3",
            "gh pr merge 9 --squash --subject \"feat: x; y\"",
            "cat <<EOF > f\nbody\nEOF\ngh pr merge 4",
        ]:
            self.assertIn("task-closeout", run(bash(command)) or "", command)

    def test_accepts_codex_argv_commands(self):
        self.assertIn("task-closeout", run({"tool_name": "shell", "tool_input": {"command": ["gh", "pr", "merge", "5"]}}))

    def test_silent_for_everything_else(self):
        for command in [
            "gh pr merge 53 --auto --squash",
            "gh pr merge --help",
            "gh pr view 53",
            "git merge origin/main",
            "echo 'gh pr list' && gh pr checks 53",
            "echo 'run gh pr merge later'",
            "python3 -c \"print('cd x && gh pr merge 1')\"",
            "cat > t.py <<'EOF'\ncd repo && gh pr merge --squash\nEOF\npython3 t.py",
            "git commit -m \"after gh pr merge, run closeout\"",
            "python3 - <<'EOF'\nt = 'after `gh pr merge` it reminds'\nEOF",
        ]:
            self.assertIsNone(run(bash(command)), command)
        self.assertIsNone(run({"tool_name": "Read", "tool_input": {"file_path": "x"}}))

    def test_ignores_malformed_input(self):
        out = subprocess.run([sys.executable, str(HOOK)], input="not json", capture_output=True, text=True)
        self.assertEqual((out.returncode, out.stdout), (0, ""))


if __name__ == "__main__":
    unittest.main()
