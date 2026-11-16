#!/usr/bin/env python3
"""Decide from a diff whether the qa-crew gate runs, and with which lenses.

  qa_scope.py --repo <path> [--base <ref>]      local branch against its base
  qa_scope.py --pr <number> [--repo <path>]     a pull request, plus its QA marker
      --require-evidence                        exit 3 when QA is owed and not recorded
  qa_scope.py --repo <path> --exercised <run> --lenses hurry,inputs
                                                record what the crew just used (the screens as they are now)
  qa_scope.py --repo <path> --stamp <run> --findings N --fixed N --proposals N
                                                print the PR marker; exit 3 when a screen changed since

Prints one JSON object. The decision belongs to this script: an agent never
skips the gate on its own reading of the diff.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

UI_EXT = (
    ".tsx", ".jsx", ".vue", ".svelte", ".astro", ".html", ".htm", ".css", ".scss",
    ".sass", ".less", ".erb", ".hbs", ".ejs", ".njk", ".liquid", ".swift", ".kt", ".dart",
)
BLADE = ".blade.php"
# Files a person never meets: tests, stories, mocks, snapshots, docs, tooling folders (.storybook, .github).
NOT_PRODUCT = re.compile(
    r"(^|/)(__tests__|__mocks__|__snapshots__|e2e|tests?|cypress|playwright|stories|docs?|\.[\w-]+)/"
    r"|\.(test|spec|stories|snap)\.[a-z]+$|\.snap$|\.mdx?$",
    re.I,
)
TEXT = re.compile(r"(^|/)(locales?|i18n|messages|translations|lang)/.*\.(json|ya?ml|po|ts|js)$", re.I)
ACCESS = re.compile(
    r"\b(permissions?|rbac|acl|authoriz\w+|unauthori[sz]ed|forbidden|isAdmin|hasRole|hasPermission|requireAuth"
    r"|can[A-Z]\w+\(|user\.roles?|session\.|roles?\.(includes|some|has))"
)
# A folder named auth or session says little; a guard, policy or permission file is the rule itself.
RULE_PATH = re.compile(r"(^|[/._-])(permissions?|roles?|rbac|acl|polic(y|ies)|guards?|grants?)([/._-]|$)", re.I)
DATA_FILE = re.compile(r"\.(json|ya?ml|sql|snap|lock)$|(^|/)migrations?/", re.I)
FORM = re.compile(
    r"<form|<input|<select|<textarea|useForm|onSubmit|handleSubmit|<(Text)?Field|<Input|<Select|<Checkbox"
    r"|<Radio|<DatePicker|<Combobox|type=\"(file|date|number|tel|email)\"|z\.object|yup\.object",
)
MARKER = re.compile(r"<!--\s*qa-crew:\s*head=([0-9a-f]{7,40})([^>]*?)-->")
FULL_LINES = 300
STYLE_EXT = (".css", ".scss", ".sass", ".less")


def is_ui(path: str) -> bool:
    lower = path.lower()
    return lower.endswith(UI_EXT) or lower.endswith(BLADE) or bool(TEXT.search(path))


def is_screen(path: str) -> bool:
    """A file that is a screen or a component, not a stylesheet, a text catalogue or a test."""
    return is_ui(path) and not NOT_PRODUCT.search(path) and not path.lower().endswith(STYLE_EXT) and not TEXT.search(path)


def split_patch(patch: str) -> dict[str, list[str]]:
    """Changed lines (added and removed, without the marker) per file."""
    files: dict[str, list[str]] = {}
    current, in_hunk = None, False
    for line in patch.splitlines():
        if line.startswith("diff --git "):
            current, in_hunk = line.split(" b/", 1)[-1], False
            files[current] = []
        elif line.startswith("@@"):
            in_hunk = True
        elif current and in_hunk and line[:1] in "+-":
            files[current].append(line[1:])
    return files


def added_files(patch: str) -> set[str]:
    """New files, and files renamed into an interface name from one that was not (Console.ts to Console.tsx)."""
    added, current, moved_from = set(), None, None
    for line in patch.splitlines():
        if line.startswith("diff --git "):
            current, moved_from = line.split(" b/", 1)[-1], None
        elif line.startswith("@@"):
            current = None
        elif current and line.startswith("new file mode"):
            added.add(current)
        elif current and line.startswith("rename from "):
            moved_from = line[len("rename from "):]
        elif current and line.startswith("rename to ") and moved_from and not is_screen(moved_from):
            added.add(current)
    return added


def classify(patch: str) -> dict:
    files = split_patch(patch)
    product = {path: lines for path, lines in files.items() if not NOT_PRODUCT.search(path)}
    ui = {path: lines for path, lines in product.items() if is_ui(path)}
    access = sorted(
        path for path, lines in product.items()
        if RULE_PATH.search(path) or (not DATA_FILE.search(path) and any(ACCESS.search(line) for line in lines))
    )
    forms = sorted(path for path, lines in ui.items() if any(FORM.search(line) for line in lines))
    ui_lines = sum(len(lines) for lines in ui.values())

    reasons = []
    if ui:
        reasons.append(f"{len(ui)} interface file(s), {ui_lines} changed line(s)")
    if forms:
        reasons.append(f"form or input changed in {len(forms)} file(s)")
    if access:
        reasons.append(f"access rule touched in {len(access)} file(s)")
    if not (ui or access):
        skipped = "no file a person sees or uses" if product else "only tests, stories or docs"
        return {"decision": "skip", "reasons": [skipped], "lenses": [], "workers": 0, "files": {}}

    lenses = ["hurry"]
    if forms:
        lenses.append("inputs")
    if access:
        lenses.append("wrong-person")
    # Full where the day-one runs found most: a screen that did not exist, a large change, an access rule.
    new_screens = sorted(path for path in added_files(patch) & set(ui) if is_screen(path))
    if new_screens:
        reasons.append(f"{len(new_screens)} new screen file(s)")
    full = bool(new_screens or access or ui_lines >= FULL_LINES)
    return {
        "decision": "run",
        "size": "full" if full else "quick",
        "reasons": reasons,
        "lenses": lenses,
        "workers": len([lens for lens in lenses if lens != "inputs"]),  # inputs is the form probe, a script
        "files": {"interface": sorted(ui), "forms": forms, "access": access},
    }


def on_screen(path: str) -> bool:
    """Path-only test, so the local tree and the PR files API agree on the set."""
    return not NOT_PRODUCT.search(path) and (is_ui(path) or bool(RULE_PATH.search(path)))


def fingerprint(blobs: dict[str, str]) -> str:
    listing = "\n".join(f"{path}:{blob}" for path, blob in sorted(blobs.items()))
    return hashlib.sha256(listing.encode()).hexdigest()[:12]


def sh(args: list[str], cwd: str | None = None) -> str:
    return subprocess.run(args, cwd=cwd, check=True, capture_output=True, text=True).stdout


def default_base(repo: str) -> str:
    try:
        return sh(["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"], repo).strip()
    except subprocess.CalledProcessError:
        for name in ("origin/main", "origin/master", "main", "master"):
            if subprocess.run(["git", "rev-parse", "--verify", "-q", name], cwd=repo, capture_output=True).returncode == 0:
                return name
        raise SystemExit("cannot find the default branch; pass --base")


def pr_patch(pr: str, repo: str | None) -> str:
    try:
        return sh(["gh", "pr", "diff", pr], repo)
    except subprocess.CalledProcessError:
        # Over 300 files GitHub refuses the diff; the files API pages through them.
        rows = sh(["gh", "api", "--paginate", f"repos/{{owner}}/{{repo}}/pulls/{pr}/files",
                   "--jq", ".[] | {filename, patch, status, changes, previous_filename} | @json"], repo)
        return patch_from_rows(json.loads(row) for row in filter(None, rows.splitlines()))


def patch_from_rows(rows) -> str:
    parts = []
    for item in rows:
        head = "new file mode 100644\n" if item.get("status") == "added" else ""
        if item.get("previous_filename"):
            head += f"rename from {item['previous_filename']}\nrename to {item['filename']}\n"
        # GitHub omits the patch of a large file: keep its size, so the 300-line rule still sees it.
        body = item.get("patch") or "\n".join(["@@ patch unavailable @@"] + ["+"] * item.get("changes", 0))
        parts.append(f"diff --git a/{item['filename']} b/{item['filename']}\n{head}{body}")
    return "\n".join(parts)


def local_blobs(repo: str, base: str) -> dict[str, str]:
    """Blob of every changed screen file as it is on disk, committed or not."""
    fork = sh(["git", "merge-base", base, "HEAD"], repo).strip()
    # -z keeps accented names unquoted; --no-renames lists a moved file as gone plus new, like pr_blobs does.
    # Deletions come from git's status: on a case-insensitive disk Kit.tsx still "exists" after a move to kit.tsx.
    fields = sh(["git", "diff", "--name-status", "--no-renames", "-z", fork], repo).split("\0")
    changed = dict(zip(fields[1::2], fields[0::2]))
    for name in sh(["git", "ls-files", "--others", "--exclude-standard", "-z"], repo).split("\0"):
        changed[name] = "A"  # on disk now, whatever the index says
    blobs = {}
    for name in sorted(name for name in changed if name and on_screen(name)):
        gone = changed[name] == "D"
        blobs[name] = "gone" if gone else sh(["git", "hash-object", "--", name], repo).strip()
    return blobs


def pr_blobs(pr: str, repo: str | None) -> dict[str, str]:
    rows = sh(["gh", "api", "--paginate", f"repos/{{owner}}/{{repo}}/pulls/{pr}/files",
               "--jq", ".[] | {filename, sha, status, previous_filename} | @json"], repo)
    return blobs_from_rows(json.loads(row) for row in filter(None, rows.splitlines()))


def blobs_from_rows(rows) -> dict[str, str]:
    blobs = {}
    for row in rows:
        blobs[row["filename"]] = "gone" if row["status"] == "removed" else row["sha"]
        if row.get("previous_filename"):
            blobs.setdefault(row["previous_filename"], "gone")
    return {path: blob for path, blob in blobs.items() if on_screen(path)}


def record_exercised(repo: str, base: str, run: Path, lenses: list[str]) -> dict:
    blobs = local_blobs(repo, base)
    target = run / "exercised.json"
    earlier = json.loads(target.read_text())["lenses"] if target.is_file() else []
    record = {"screens": fingerprint(blobs), "lenses": sorted(set(earlier) | set(lenses)), "files": blobs}
    run.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(record, indent=2))
    return record


def stamp(repo: str, base: str, run: Path, counts: dict[str, int]) -> tuple[int, dict]:
    target = run / "exercised.json"
    if not target.is_file():
        return 3, {"state": "missing", "why": f"{target} not found: record the run with --exercised first"}
    record = json.loads(target.read_text())
    if sh(["git", "status", "--porcelain", "--untracked-files=no"], repo).strip():
        return 3, {"state": "dirty", "why": "commit the work first: the marker names a commit"}
    blobs = local_blobs(repo, base)
    used = {name: blob for name, blob in record["files"].items() if on_screen(name)}
    changed = sorted(name for name in set(blobs) | set(used) if blobs.get(name) != used.get(name))
    if changed:
        return 3, {"state": "stale", "changed_since": changed,
                   "why": "these screens changed after the crew used them: run one worker on them, then --exercised again"}
    head = sh(["git", "rev-parse", "HEAD"], repo).strip()
    fields = " ".join(f"{key}={value}" for key, value in counts.items())
    marker = f"<!-- qa-crew: head={head} screens={fingerprint(blobs)} lenses={'+'.join(record['lenses'])} {fields} -->"
    return 0, {"state": "ok", "marker": marker}


NO_INTERFACE = {"decision": "skip", "reasons": ["the repository declares no interface (.qa-crew on the base branch)"],
                "lenses": [], "workers": 0, "files": {}}


def declares_no_interface(text: str) -> bool:
    return any(re.fullmatch(r"interface:\s*none", line.strip()) for line in text.splitlines())


def remote_default(repo: str | None) -> str | None:
    """The default branch as the remote has it; a local branch or a --base the caller picked is not a policy source."""
    try:
        return sh(["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"], repo).strip()
    except subprocess.CalledProcessError:
        for name in ("origin/main", "origin/master"):
            if subprocess.run(["git", "rev-parse", "--verify", "-q", name], cwd=repo, capture_output=True).returncode == 0:
                return name
    return None


def waiver(repo: str | None, pr: str | None = None) -> bool:
    """`.qa-crew` counts only as the target branch has it, never as the change has it: a PR cannot waive itself."""
    try:
        if pr:
            base = json.loads(sh(["gh", "api", f"repos/{{owner}}/{{repo}}/pulls/{pr}",
                                  "--jq", "{repo: .base.repo.full_name, sha: .base.sha}"], repo))
            found = sh(["gh", "api", f"repos/{base['repo']}/contents/.qa-crew?ref={base['sha']}", "--jq", ".content"], repo)
            return declares_no_interface(base64.b64decode("".join(found.split()), validate=True).decode())
        target = remote_default(repo)
        return bool(target) and declares_no_interface(sh(["git", "show", f"{target}:.qa-crew"], repo))
    except (subprocess.CalledProcessError, ValueError, KeyError, TypeError):
        return False


def evidence(pr: str, repo: str | None, scope: dict) -> dict:
    """present: the marker covers the head. stale: in-scope files changed after it."""
    view = json.loads(sh(["gh", "pr", "view", pr, "--json", "body,headRefOid"], repo))
    match = MARKER.search(view.get("body") or "")
    if not match:
        return {"state": "missing"}
    marked, head = match.group(1), view["headRefOid"]
    counts = dict(re.findall(r"(\w+)=([\w+-]+)", match.group(2)))
    if "screens" in counts:
        # The marker carries what the crew used; a stamp on a newer head cannot stand in for a rerun.
        if counts["screens"] != fingerprint(pr_blobs(pr, repo)):
            return {"state": "stale", "head": marked, "why": "a screen changed after the crew used it"}
        owed = sorted(set(scope["lenses"]) - set(counts.get("lenses", "").split("+")))
        if owed:
            return {"state": "partial", "head": marked, "lenses_owed": owed}
        return {"state": "present", **counts, "head": marked}
    if head.startswith(marked):
        return {"state": "present", "head": marked, **counts}
    try:
        names = json.loads(sh(
            ["gh", "api", f"repos/{{owner}}/{{repo}}/compare/{marked}...{head}", "--jq", "[.files[].filename]"], repo))
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return {"state": "stale", "head": marked, "why": "cannot compare the marked commit with the head"}
    in_scope = set(scope["files"].get("interface", [])) | set(scope["files"].get("access", []))
    touched = sorted(name for name in names if name in in_scope)
    if touched:
        return {"state": "stale", "head": marked, "changed_since": touched}
    return {"state": "present", "head": marked, **counts}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo")
    parser.add_argument("--base")
    parser.add_argument("--pr")
    parser.add_argument("--require-evidence", action="store_true")
    parser.add_argument("--exercised", type=Path, metavar="RUN")
    parser.add_argument("--lenses", default="")
    parser.add_argument("--stamp", type=Path, metavar="RUN")
    for name in ("findings", "fixed", "proposals"):
        parser.add_argument(f"--{name}", type=int, default=0)
    args = parser.parse_args()
    if not (args.repo or args.pr):
        parser.error("pass --repo or --pr")
    if (args.exercised or args.stamp) and not args.repo:
        parser.error("--exercised and --stamp need --repo")
    try:
        if args.exercised:
            lenses = [lens for lens in args.lenses.split(",") if lens]
            if not lenses:
                parser.error("--exercised needs --lenses with the lenses the crew ran")
            record = record_exercised(args.repo, args.base or default_base(args.repo), args.exercised, lenses)
            print(json.dumps({key: record[key] for key in ("screens", "lenses")}))
            return 0
        if args.stamp:
            counts = {name: getattr(args, name) for name in ("findings", "fixed", "proposals")}
            code, result = stamp(args.repo, args.base or default_base(args.repo), args.stamp, counts)
            print(result["marker"] if code == 0 else json.dumps(result, indent=2))
            return code
        if args.pr:
            scope = NO_INTERFACE if waiver(args.repo, pr=args.pr) else classify(pr_patch(args.pr, args.repo))
            if scope["decision"] == "run":
                scope["evidence"] = evidence(args.pr, args.repo, scope)
        else:
            base = args.base or default_base(args.repo)
            scope = dict(NO_INTERFACE) if waiver(args.repo) else classify(sh(["git", "diff", f"{base}...HEAD"], args.repo))
            scope["base"] = base
    except subprocess.CalledProcessError as error:
        print(f"qa_scope: {' '.join(error.cmd[:3])} failed: {error.stderr.strip()[:200]}", file=sys.stderr)
        return 2
    print(json.dumps(scope, indent=2))
    owed = scope["decision"] == "run" and scope.get("evidence", {}).get("state") != "present"
    return 3 if args.require_evidence and owed else 0


if __name__ == "__main__":
    sys.exit(main())
