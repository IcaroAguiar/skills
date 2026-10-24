#!/usr/bin/env python3
"""Find copied code that dead-code tools cannot see: live near-copies.

Two passes over tracked source files (read-only, uses `git ls-files`):
  1. Same relative path under two or more roots (apps/web-a/src/x.tsx vs
     apps/web-b/src/x.tsx), scored by line similarity.
  2. Byte-identical files anywhere in the repository, whatever their path.

    dup_files.py [--repo .] [--roots 'apps/*' 'packages/*'] [--min 0.9]
                 [--ext .ts .tsx ...] [--out DIR]

Writes DIR/duplicates.md (default: current directory).
"""

from __future__ import annotations

import argparse
import collections
import difflib
import fnmatch
import hashlib
import subprocess
import sys
from pathlib import Path

DEFAULT_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".go", ".java", ".kt", ".cs", ".rb", ".php", ".vue", ".svelte"]
SKIP = ("/node_modules/", "/dist/", "/build/", ".gen.", "/generated/", "/__snapshots__/", "/migrations/")


def tracked(repo: Path) -> list[str]:
    out = subprocess.run(["git", "-C", str(repo), "ls-files"], check=True, capture_output=True, text=True).stdout
    return [line for line in out.splitlines() if line]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=".")
    parser.add_argument("--roots", nargs="+", default=["apps/*", "packages/*", "services/*"], help="globs naming the workspace roots to compare")
    parser.add_argument("--min", type=float, default=0.9, help="similarity reported as a near-copy (default 0.9)")
    parser.add_argument("--ext", nargs="+", default=DEFAULT_EXT)
    parser.add_argument("--out", default=".")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    files = [f for f in tracked(repo) if Path(f).suffix in args.ext and not any(s in f"/{f}" for s in SKIP)]

    def root_of(path: str) -> str | None:
        parts = path.split("/")
        for depth in (1, 2, 3):
            candidate = "/".join(parts[:depth])
            if any(fnmatch.fnmatch(candidate, pattern) for pattern in args.roots):
                return candidate
        return None

    by_rel: dict[str, dict[str, str]] = collections.defaultdict(dict)
    for path in files:
        root = root_of(path)
        if root:
            by_rel[path[len(root) + 1 :]][root] = path

    def read(path: str) -> list[str]:
        return (repo / path).read_text(errors="replace").splitlines()

    pairs = []
    for rel, owners in by_rel.items():
        roots = sorted(owners)
        for i in range(len(roots)):
            for j in range(i + 1, len(roots)):
                a, b = read(owners[roots[i]]), read(owners[roots[j]])
                ratio = difflib.SequenceMatcher(None, a, b, autojunk=False).ratio() if len(a) * len(b) < 4_000_000 else -1.0
                pairs.append((ratio, rel, roots[i], roots[j], len(a), len(b), a == b))
    pairs.sort(reverse=True)
    near = [p for p in pairs if p[0] >= args.min]
    test_like = lambda rel: any(t in rel for t in (".test.", ".spec.", "__tests__/", "/e2e/"))

    digests = collections.defaultdict(list)
    for path in files:
        data = (repo / path).read_bytes()
        if data.count(b"\n") >= 5:
            digests[hashlib.sha256(data).hexdigest()].append(path)
    identical_groups = sorted((g for g in digests.values() if len(g) > 1), key=len, reverse=True)

    lines = ["# Duplicated code", ""]
    lines.append(f"Same-path pairs across roots: {len(pairs)}; identical {sum(p[6] for p in pairs)}; "
                 f"≥{args.min:.2f} similar {len(near)} "
                 f"({sum(not test_like(p[1]) for p in near)} source, {sum(test_like(p[1]) for p in near)} test), "
                 f"~{sum(min(p[4], p[5]) for p in near)} lines on the smaller side.")
    by_root_pair = collections.Counter((p[2], p[3]) for p in near)
    if by_root_pair:
        lines += ["", "| root A | root B | near-copies |", "|---|---|---|"]
        lines += [f"| {a} | {b} | {n} |" for (a, b), n in by_root_pair.most_common()]
    lines += ["", f"## Near-copies (≥{args.min:.2f}), largest first", "", "| similarity | path under root | A | B | lines A/B |", "|---|---|---|---|---|"]
    for ratio, rel, a, b, la, lb, same in sorted(near, key=lambda p: -min(p[4], p[5]))[:60]:
        lines.append(f"| {'identical' if same else f'{ratio:.2f}'} | `{rel}` | {a} | {b} | {la}/{lb} |")
    lines += ["", "## Byte-identical files at different paths", ""]
    shown = 0
    for group in identical_groups:
        roots = {root_of(p) for p in group}
        if len(group) == len(roots) and None not in roots and len({p.split('/', 2)[-1] for p in group}) == 1:
            continue  # already listed above as a same-path pair
        lines.append("- " + " = ".join(f"`{p}`" for p in group))
        shown += 1
        if shown >= 40:
            break
    if not shown:
        lines.append("- none beyond the same-path pairs")
    lines += ["", "A near-copy is a design question, not a lint error: decide which side owns the behavior, move shared code to a package, and delete the other copy with its tests."]

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "duplicates.md").write_text("\n".join(lines) + "\n")
    print(out / "duplicates.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
