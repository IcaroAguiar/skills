#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "git=missing"
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "repo=none"
  echo "cwd=$(pwd)"
  exit 0
fi

root="$(git rev-parse --show-toplevel)"
branch="$(git branch --show-current 2>/dev/null || true)"
dirty_count="$(git status --short | wc -l | tr -d ' ')"

echo "repo=$root"
echo "branch=${branch:-detached}"
echo "dirty_files=$dirty_count"

if [ "$dirty_count" != "0" ]; then
  echo "dirty_sample:"
  git status --short | sed -n '1,20p'
fi

echo "worktrees:"
git worktree list --porcelain | awk '
  /^worktree / { wt=$0; sub(/^worktree /, "", wt); print "- " wt }
  /^branch / { b=$0; sub(/^branch refs\/heads\//, "", b); print "  branch=" b }
  /^detached / { print "  detached=yes" }
'

echo "remotes:"
git remote -v | awk '!seen[$1" "$2" "$3]++ { print "- "$1" "$2" "$3 }' | sed -n '1,10p'

if [ -f package.json ]; then
  echo "package_scripts:"
  node -e '
    const p=require("./package.json");
    const s=p.scripts||{};
    for (const k of ["test","lint","typecheck","build","dev","start"]) {
      if (s[k]) console.log("- "+k+": "+s[k]);
    }
  ' 2>/dev/null || true
fi

