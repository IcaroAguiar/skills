#!/usr/bin/env python3
"""Lists a repo's linked worktrees and local branches, and removes the delivered ones.

Squash merges never make a branch an ancestor of the default branch, so
"merged" is proven by either ancestry of the remote default branch or a merged
PR whose head contains the local tip. A worktree is removable only when that
proof exists, `git status` is empty, and its ignored files are all regenerable
(dependencies and build output). Everything else is kept with its reason.

Dry run by default. `--apply` first writes a bundle of every branch it deletes,
then runs `git worktree remove` (never `--force`) and `git branch -D`.
"""
import argparse
import json
import os
import re
import subprocess
import time

REGENERABLE = re.compile(
    r"(^|/)(node_modules|dist|build|out|coverage|\.turbo|\.next|\.vite|\.cache|"
    r"\.venv|__pycache__|target|\.pytest_cache|\.ruff_cache)/$|\.tsbuildinfo$|\.DS_Store$"
)


def run(args, cwd, timeout=120):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def git(cwd, *args):
    code, out, _ = run(["git", *args], cwd)
    return out if code == 0 else None


def is_ancestor(cwd, commit, of):
    return run(["git", "merge-base", "--is-ancestor", commit, of], cwd)[0] == 0


def default_ref(repo):
    head = git(repo, "symbolic-ref", "--quiet", "refs/remotes/origin/HEAD")
    if head:
        return head
    for name in ("main", "master", "develop"):
        if git(repo, "rev-parse", "--verify", "--quiet", f"refs/remotes/origin/{name}"):
            return f"refs/remotes/origin/{name}"
    return None


def merged_prs(repo):
    try:
        code, out, _ = run(["gh", "pr", "list", "--state", "merged", "--limit", "1000",
                            "--json", "headRefName,headRefOid,number"], repo)
    except (OSError, subprocess.TimeoutExpired):
        return {}
    prs = {}
    for pr in json.loads(out) if code == 0 and out else []:
        prs.setdefault(pr["headRefName"], []).append(pr)
    return prs


def delivery(repo, tip, branch, base, prs):
    if base and is_ancestor(repo, tip, base):
        return "in the default branch"
    for pr in prs.get(branch or "", []):
        oid = pr["headRefOid"]
        if tip == oid or (git(repo, "cat-file", "-e", oid) is not None and is_ancestor(repo, tip, oid)):
            return f"PR #{pr['number']} merged"
    return None


def valuable_ignored(path):
    listed = git(path, "ls-files", "--others", "--ignored", "--exclude-standard", "--directory") or ""
    return [entry for entry in listed.splitlines() if entry and not REGENERABLE.search(entry)]


def worktree_blocks(repo):
    for block in (git(repo, "worktree", "list", "--porcelain") or "").split("\n\n"):
        fields = dict((line.split(" ", 1) + [""])[:2] for line in block.splitlines() if line)
        if "worktree" in fields:
            yield fields


def classify(repo, fetch=True):
    if fetch:
        git(repo, "fetch", "--quiet", "--prune", "origin")
    base = default_ref(repo)
    prs = merged_prs(repo)
    worktrees, branches, checked_out = [], [], {}
    for index, fields in enumerate(worktree_blocks(repo)):
        branch = fields.get("branch", "").removeprefix("refs/heads/") or None
        path = fields["worktree"]
        if index == 0:
            if branch:
                checked_out[branch] = "main checkout"
            continue
        entry = {"path": path, "branch": branch}
        if not os.path.isdir(path):
            entry.update(action="remove", reason="folder no longer exists")
        else:
            status = git(path, "status", "--porcelain", "--untracked-files=all")
            tip = git(path, "rev-parse", "HEAD")
            proof = tip and delivery(repo, tip, branch, base, prs)
            ignored = valuable_ignored(path) if status == "" else []
            if status is None:
                entry.update(action="keep", reason="git status failed")
            elif status:
                entry.update(action="keep", reason=f"{len(status.splitlines())} uncommitted changes")
            elif not proof:
                entry.update(action="keep", reason="no proof it was delivered")
            elif ignored:
                entry.update(action="keep", reason=f"ignored files worth checking: {', '.join(ignored[:3])}")
            else:
                entry.update(action="remove", reason=proof)
        if branch and entry["action"] == "keep":
            checked_out[branch] = path
        worktrees.append(entry)
    base_name = base.rsplit("/", 1)[-1] if base else None
    refs = git(repo, "for-each-ref", "--format=%(refname:short) %(objectname)", "refs/heads") or ""
    for line in refs.splitlines():
        branch, tip = line.split(" ")
        if branch in (base_name, "main", "master", "develop"):
            continue
        proof = delivery(repo, tip, branch, base, prs)
        if branch in checked_out:
            entry = {"branch": branch, "action": "keep", "reason": f"checked out at {checked_out[branch]}"}
        elif proof:
            entry = {"branch": branch, "action": "remove", "reason": proof}
        else:
            entry = {"branch": branch, "action": "keep", "reason": "no proof it was delivered"}
        branches.append(entry)
    return {"repo": repo, "base": base, "worktrees": worktrees, "branches": branches}


def apply(plan, backup_dir):
    repo, done = plan["repo"], []
    doomed = [b["branch"] for b in plan["branches"] if b["action"] == "remove"]
    if doomed:
        os.makedirs(backup_dir, exist_ok=True)
        bundle = os.path.join(backup_dir, f"{os.path.basename(repo)}-{time.strftime('%Y%m%d-%H%M%S')}.bundle")
        code, _, err = run(["git", "bundle", "create", bundle, *[f"refs/heads/{b}" for b in doomed]], repo)
        if code != 0:
            return [f"bundle failed, nothing removed: {err[-200:]}"]
        done.append(f"bundle {bundle}")
    for worktree in plan["worktrees"]:
        if worktree["action"] == "remove":
            code, _, err = run(["git", "worktree", "remove", worktree["path"]], repo)
            done.append(f"worktree {worktree['path']}: " + ("removed" if code == 0 else f"kept ({err[-160:]})"))
    run(["git", "worktree", "prune"], repo)
    for branch in doomed:
        code, _, err = run(["git", "branch", "-D", branch], repo)
        done.append(f"branch {branch}: " + ("deleted" if code == 0 else f"kept ({err[-120:]})"))
    return done


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("repo", nargs="?", default=".")
    parser.add_argument("--apply", action="store_true", help="remove what is proven delivered")
    parser.add_argument("--no-fetch", action="store_true")
    parser.add_argument("--backup-dir", default=os.path.expanduser("~/.local/state/task-closeout/bundles"))
    args = parser.parse_args()
    repo = git(os.path.abspath(args.repo), "rev-parse", "--show-toplevel")
    if not repo:
        raise SystemExit("not a git repository")
    plan = classify(repo, fetch=not args.no_fetch)
    for kind in ("worktrees", "branches"):
        for entry in plan[kind]:
            print(f"{entry['action']:6} {entry.get('path') or entry['branch']}  ({entry['reason']})")
    if args.apply:
        print("\n".join(apply(plan, args.backup_dir)))


if __name__ == "__main__":
    main()
