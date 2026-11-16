#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from qa_scope import MARKER, blobs_from_rows, patch_from_rows, classify, evidence, fingerprint, local_blobs, on_screen, record_exercised, stamp
import qa_scope  # noqa: E402


def patch(*files):
    out = []
    for path, lines in files:
        out.append(f"diff --git a/{path} b/{path}")
        out.append(f"--- a/{path}")
        out.append(f"+++ b/{path}")
        out.append("@@ -1 +1 @@")
        out.extend(f"+{line}" for line in lines)
    return "\n".join(out)


class Scope(unittest.TestCase):
    def test_backend_only_skips(self):
        scope = classify(patch(("apps/api/src/billing/invoice.service.ts", ["const total = sum(items)"])))
        self.assertEqual(scope["decision"], "skip")

    def test_tests_and_docs_skip(self):
        scope = classify(patch(
            ("apps/web/src/Form.test.tsx", ["<input />"]),
            ("apps/web/e2e/login.spec.ts", ["await page.goto('/')"]),
            ("README.md", ["text"]),
            (".design-sync/previews/Button.tsx", ["<button />"]),
        ))
        self.assertEqual(scope["decision"], "skip")
        self.assertEqual(scope["reasons"], ["only tests, stories or docs"])

    def test_change_to_an_existing_screen_is_quick(self):
        scope = classify(patch(("apps/web/src/Header.tsx", ["<h1 className=\"text-lg\">Painel</h1>"])))
        self.assertEqual((scope["decision"], scope["size"], scope["lenses"]), ("run", "quick", ["hurry"]))
        form = classify(patch(("apps/web/src/Signup.tsx", ["<Input name=\"cpf\" />"] * 50)))
        self.assertEqual((form["size"], form["lenses"], form["workers"]), ("quick", ["hurry", "inputs"], 1))

    def test_new_screen_large_change_or_access_is_full(self):
        new = patch(("apps/web/src/Console.tsx", ["<main />"])).replace("--- a/", "new file mode 100644\n--- a/")
        self.assertEqual(classify(new)["size"], "full")
        style = patch(("apps/web/src/console.css", [".a{}"])).replace("--- a/", "new file mode 100644\n--- a/")
        self.assertEqual(classify(style)["size"], "quick")
        self.assertEqual(classify(patch(("apps/web/src/Header.tsx", ["<p />"] * 300)))["size"], "full")
        self.assertEqual(classify(patch(("apps/web/src/Menu.tsx", ["if (user.roles.includes('admin')) show()"])))["size"], "full")

    def test_form_adds_inputs_lens(self):
        scope = classify(patch(("apps/web/src/Signup.tsx", ["<Input name=\"cpf\" />", "const form = useForm()"])))
        self.assertEqual(scope["lenses"], ["hurry", "inputs"])

    def test_backend_access_rule_runs_wrong_person(self):
        scope = classify(patch(("apps/api/src/projects/projects.guard.ts", ["return user.orgId === project.orgId"])))
        self.assertEqual(scope["decision"], "run")
        self.assertEqual(scope["lenses"], ["hurry", "wrong-person"])

    def test_aria_role_and_author_are_not_access(self):
        scope = classify(patch(("apps/web/src/AuthorCard.tsx", ['<div role="button">{author.name}</div>'])))
        self.assertEqual(scope["lenses"], ["hurry"])

    def test_permission_check_in_interface(self):
        scope = classify(patch(("apps/web/src/Toolbar.tsx", ["{user.role === 'admin' && <Delete />}"])))
        self.assertIn("wrong-person", scope["lenses"])

    def test_visible_text_counts_as_interface(self):
        scope = classify(patch(("apps/web/messages/pt-BR.json", ['"save": "Salvar"'])))
        self.assertEqual(scope["decision"], "run")

    def test_large_visual_change_is_full(self):
        scope = classify(patch(("apps/web/src/Page.tsx", ["<div />"] * 300)))
        self.assertEqual(scope["size"], "full")

    def test_rename_into_a_screen_and_missing_patch_stay_full(self):
        local = "diff --git a/src/Console.ts b/src/Console.tsx\nsimilarity index 90%\nrename from src/Console.ts\nrename to src/Console.tsx\n@@ -1 +1 @@\n+<main />"
        self.assertEqual(classify(local)["size"], "full")
        moved = "diff --git a/src/Old.tsx b/src/New.tsx\nrename from src/Old.tsx\nrename to src/New.tsx\n@@ -1 +1 @@\n+<main />"
        self.assertEqual(classify(moved)["size"], "quick")
        api = patch_from_rows([{"filename": "src/Console.tsx", "status": "renamed", "previous_filename": "src/Console.ts", "patch": "@@ -1 +1 @@\n+<main />"}])
        self.assertEqual(classify(api)["size"], "full")
        big = patch_from_rows([{"filename": "src/Page.tsx", "status": "modified", "changes": 350}])
        self.assertEqual(classify(big)["size"], "full")

    def test_lines_that_look_like_headers_are_counted(self):
        body = "\n".join(["---count;"] * 150 + ["+++count;"] * 150)
        scope = classify(f"diff --git a/src/Page.tsx b/src/Page.tsx\n--- a/src/Page.tsx\n+++ b/src/Page.tsx\n@@ -1,150 +1,150 @@\n{body}")
        self.assertEqual(scope["size"], "full")

    def test_auth_folder_and_data_files_are_not_access_rules(self):
        scope = classify(patch(
            ("apps/web/src/auth/layout.tsx", ["<main />"]),
            ("apps/api/src/errors/auth-module-error.catalog.ts", ["export const code = 'X'"]),
            ("server/db/migrations/meta/0007_snapshot.json", ['"permissions": {']),
        ))
        self.assertEqual((scope["size"], scope["lenses"]), ("quick", ["hurry"]))

    def test_marker(self):
        match = MARKER.search("text\n<!-- qa-crew: head=abc1234 findings=3 fixed=2 proposals=1 -->")
        self.assertEqual(match.group(1), "abc1234")


class Stamp(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name) / "repo"
        self.run = Path(self.tmp.name) / "run"
        (self.repo / "web").mkdir(parents=True)
        self.git("init", "-q", "-b", "main")
        (self.repo / "api.ts").write_text("one")
        self.commit("base")
        self.git("checkout", "-q", "-b", "feature")
        (self.repo / "web" / "Form.tsx").write_text("<input />")

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *args):
        subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *args],
                       cwd=self.repo, check=True, capture_output=True)

    def commit(self, message):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)

    def test_stamp_follows_what_the_crew_used(self):
        record = record_exercised(str(self.repo), "main", self.run, ["hurry"])
        self.assertEqual(list(record["files"]), ["web/Form.tsx"])
        self.commit("screen")
        code, result = stamp(str(self.repo), "main", self.run, {"findings": 1, "fixed": 1, "proposals": 0})
        self.assertEqual(code, 0)
        fields = MARKER.search(result["marker"]).group(2)
        self.assertIn(f"screens={record['screens']} lenses=hurry findings=1", fields)

    def test_review_fix_on_a_screen_refuses_the_stamp(self):
        record_exercised(str(self.repo), "main", self.run, ["hurry"])
        self.commit("screen")
        (self.repo / "web" / "Form.tsx").write_text("<input aria-label='x' />")
        (self.repo / "api.ts").write_text("two")
        self.commit("review fix")
        code, result = stamp(str(self.repo), "main", self.run, {})
        self.assertEqual((code, result["changed_since"]), (3, ["web/Form.tsx"]))
        record = record_exercised(str(self.repo), "main", self.run, ["inputs"])
        self.assertEqual(record["lenses"], ["hurry", "inputs"])
        self.assertEqual(stamp(str(self.repo), "main", self.run, {})[0], 0)

    def blob(self, name):
        return subprocess.run(["git", "rev-parse", f"HEAD:{name}"], cwd=self.repo, capture_output=True, text=True).stdout.strip()

    def test_local_and_pr_sides_agree_on_renames_and_accents(self):
        (self.repo / "web" / "Usuário.tsx").write_text("<p />")
        self.commit("screens")
        self.git("checkout", "-q", "main")
        (self.repo / "web").mkdir(exist_ok=True)
        (self.repo / "web" / "Old.tsx").write_text("<b />")
        self.commit("old screen on base")
        self.git("checkout", "-q", "feature")
        self.git("rebase", "-q", "main")
        self.git("mv", "web/Old.tsx", "web/New.tsx")
        before_commit = local_blobs(str(self.repo), "main")
        self.commit("rename")
        local = local_blobs(str(self.repo), "main")
        self.assertEqual(before_commit, local)
        rows = [
            {"filename": "web/Form.tsx", "status": "added", "sha": self.blob("web/Form.tsx")},
            {"filename": "web/Usuário.tsx", "status": "added", "sha": self.blob("web/Usuário.tsx")},
            {"filename": "web/New.tsx", "status": "renamed", "sha": self.blob("web/New.tsx"), "previous_filename": "web/Old.tsx"},
        ]
        self.assertEqual(blobs_from_rows(rows), local)

    def test_case_only_rename_counts_the_old_spelling_as_gone(self):
        (self.repo / "web" / "Kit.tsx").write_text("<i />")
        self.commit("screens")
        self.git("mv", "web/Kit.tsx", "web/kit.tsx")
        staged = local_blobs(str(self.repo), "main")
        self.commit("case rename")
        self.assertEqual(staged, local_blobs(str(self.repo), "main"))
        self.assertNotIn("web/Kit.tsx", staged)
        self.git("checkout", "-q", "main")
        (self.repo / "web").mkdir(exist_ok=True)
        (self.repo / "web" / "Nav.tsx").write_text("<nav />")
        self.commit("base screen")
        self.git("checkout", "-q", "feature")
        self.git("rebase", "-q", "main")
        self.git("mv", "web/Nav.tsx", "web/nav.tsx")
        staged = local_blobs(str(self.repo), "main")
        self.commit("case rename of a base file")
        self.assertEqual(staged, local_blobs(str(self.repo), "main"))
        self.assertEqual((staged["web/Nav.tsx"], staged["web/nav.tsx"]), ("gone", self.blob("web/nav.tsx")))

    def test_recreating_a_deleted_screen_refuses_the_stamp(self):
        self.git("checkout", "-q", "main")
        (self.repo / "web").mkdir(exist_ok=True)
        (self.repo / "web" / "Nav.tsx").write_text("<nav />")
        self.commit("base screen")
        self.git("checkout", "-q", "feature")
        self.git("rebase", "-q", "main")
        self.git("rm", "-q", "web/Nav.tsx")
        record = record_exercised(str(self.repo), "main", self.run, ["hurry"])
        self.assertEqual(record["files"]["web/Nav.tsx"], "gone")
        self.commit("remove screen")
        self.assertEqual(stamp(str(self.repo), "main", self.run, {})[0], 0)
        (self.repo / "web" / "Nav.tsx").write_text("<nav>back</nav>")
        code, result = stamp(str(self.repo), "main", self.run, {})
        self.assertEqual((code, result["changed_since"]), (3, ["web/Nav.tsx"]))

    def test_marker_with_every_lens_is_present(self):
        blobs = {"web/Form.tsx": "abc"}
        body = f"text\n<!-- qa-crew: head=1234567 screens={fingerprint(blobs)} lenses=hurry+wrong-person findings=0 fixed=0 proposals=0 -->"
        real = (qa_scope.sh, qa_scope.pr_blobs)
        qa_scope.sh = lambda *a, **k: json.dumps({"body": body, "headRefOid": "f" * 40})
        qa_scope.pr_blobs = lambda pr, repo: blobs
        try:
            scope = {"lenses": ["hurry", "wrong-person"], "files": {}}
            self.assertEqual(evidence("1", None, scope)["state"], "present")
            scope["lenses"].append("inputs")
            self.assertEqual(evidence("1", None, scope), {"state": "partial", "head": "1234567", "lenses_owed": ["inputs"]})
            qa_scope.pr_blobs = lambda pr, repo: {"web/Form.tsx": "changed"}
            self.assertEqual(evidence("1", None, scope)["state"], "stale")
        finally:
            qa_scope.sh, qa_scope.pr_blobs = real

    def test_stamp_without_a_recorded_run_is_refused(self):
        self.commit("screen")
        self.assertEqual(stamp(str(self.repo), "main", self.run, {})[0], 3)

    def test_screen_set_is_decided_by_path(self):
        self.assertTrue(on_screen("apps/web/src/Form.tsx"))
        self.assertTrue(on_screen("apps/api/src/auth/guard.ts"))
        self.assertFalse(on_screen("apps/api/src/auth/session.service.ts"))
        self.assertFalse(on_screen("apps/api/src/billing/invoice.service.ts"))
        self.assertFalse(on_screen("apps/web/src/Form.test.tsx"))
        self.assertNotEqual(fingerprint({"a.tsx": "1"}), fingerprint({"a.tsx": "2"}))


if __name__ == "__main__":
    unittest.main()
