import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True

MODULE = Path(__file__).with_name("delivered_leftovers.py")
SPEC = importlib.util.spec_from_file_location("delivered_leftovers", MODULE)
leftovers = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(leftovers)


class DeliveredLeftoversTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="delivered-leftovers-test-")
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name).resolve()
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.git("init", "--initial-branch=main")
        self.commit("base.txt")
        self.git("update-ref", "refs/remotes/origin/main", "HEAD")

    def git(self, *args, cwd=None):
        return subprocess.run(
            ["git", "-c", "user.name=Fixture", "-c", "user.email=fixture@example.test",
             "-c", "commit.gpgsign=false", "-C", str(cwd or self.repo), *args],
            check=True, capture_output=True, text=True,
        ).stdout.strip()

    def commit(self, name, cwd=None):
        (Path(cwd or self.repo) / name).write_text(name)
        self.git("add", name, cwd=cwd)
        self.git("commit", "-m", name, cwd=cwd)

    def worktree(self, branch):
        path = self.root / branch
        self.git("worktree", "add", "-b", branch, str(path))
        return path

    def actions(self, plan):
        return {(e.get("path") or e["branch"]): (e["action"], e["reason"])
                for kind in ("worktrees", "branches") for e in plan[kind]}

    def test_keeps_undelivered_work_and_removes_delivered(self):
        delivered = self.worktree("delivered")
        self.commit("delivered.txt", cwd=delivered)
        self.git("update-ref", "refs/remotes/origin/main", "delivered")
        pending = self.worktree("pending")
        self.commit("pending.txt", cwd=pending)
        dirty = self.worktree("dirty")
        (dirty / "notes.txt").write_text("unsaved")
        self.git("branch", "loose")
        self.commit("loose.txt", cwd=self.repo)

        plan = self.actions(leftovers.classify(str(self.repo), fetch=False))

        self.assertEqual(plan[str(delivered)][0], "remove")
        self.assertEqual(plan["delivered"][0], "remove")
        self.assertEqual(plan[str(pending)], ("keep", "no proof it was delivered"))
        self.assertEqual(plan["pending"][0], "keep")
        self.assertEqual(plan[str(dirty)], ("keep", "1 uncommitted changes"))
        self.assertEqual(plan["dirty"][0], "keep")
        self.assertEqual(plan["loose"][0], "remove")

    def test_keeps_delivered_worktree_with_valuable_ignored_files(self):
        (self.repo / ".gitignore").write_text(".env\nnode_modules/\n")
        self.git("add", ".gitignore")
        self.git("commit", "-m", "ignore")
        self.git("update-ref", "refs/remotes/origin/main", "HEAD")
        done = self.worktree("done")
        self.commit("done.txt", cwd=done)
        self.git("update-ref", "refs/remotes/origin/main", "done")
        (done / "node_modules").mkdir()
        (done / "node_modules" / "x.js").write_text("")
        self.assertEqual(self.actions(leftovers.classify(str(self.repo), fetch=False))[str(done)][0], "remove")
        (done / ".env").write_text("TOKEN=fake")
        plan = self.actions(leftovers.classify(str(self.repo), fetch=False))
        self.assertEqual(plan[str(done)], ("keep", "ignored files worth checking: .env"))

    def test_keeps_fresh_worktree_without_commits(self):
        fresh = self.worktree("fresh")
        plan = self.actions(leftovers.classify(str(self.repo), fetch=False))
        self.assertEqual(plan[str(fresh)], ("keep", "no commit since it was created; may be in use"))
        self.assertEqual(plan["fresh"][0], "keep")

    def test_apply_bundles_before_deleting(self):
        done = self.worktree("done")
        self.commit("done.txt", cwd=done)
        self.git("update-ref", "refs/remotes/origin/main", "done")
        tip = self.git("rev-parse", "done")
        backups = self.root / "backups"

        log = leftovers.apply(leftovers.classify(str(self.repo), fetch=False), str(backups))

        self.assertFalse(done.exists())
        self.assertNotIn("done", self.git("branch", "--format=%(refname:short)").split())
        bundle = next(backups.glob("*.bundle"))
        self.assertIn(tip, self.git("bundle", "list-heads", str(bundle)))
        self.assertTrue(any(line.endswith("deleted") for line in log))


if __name__ == "__main__":
    unittest.main()
