#!/usr/bin/env python3
"""Check GitHub Actions workflows against the CI rule in ../references/ci-rule.md.

Usage: ci_rule_check.py <repo-or-workflow-dir> [...]
Exit 1 when any workflow breaks the rule. YAML is parsed through Ruby's stdlib (no PyYAML on this machine).
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

HOSTED = re.compile(r"\b(ubuntu|windows|macos)-(latest|\d[\w.]*)\b")
HEAVY = re.compile(
    r"playwright (test|install)|npx playwright|cypress|\be2e\b|test:e2e|docker (build|compose (up|build|run|create))|docker/build-push-action|buildx|"
    r"maestro|detox|xcodebuild|flutter (drive|test integration)|test:all|--run-all|full[-_ ]suite",
    re.I,
)
LABEL_GATE = re.compile(r"label", re.I)
REVALIDATE = re.compile(r"\b(lint|typecheck|tsc --noEmit|jest|vitest|go test|pnpm( -\w+)* test|npm test|biome check)\b", re.I)
# Lint and tests are the author's verification before the push; a typecheck may stand in for the build.
LOCAL_ONLY = re.compile(r"\b(lint|eslint|biome check|prettier|semgrep|jest|vitest|go test|pytest|pnpm( -\w+)* test|npm (run )?test|yarn test)\b", re.I)
RELEASE_PROOF = re.compile(r"release:verify|release:build|docker save|simulated worker|--output \.local/release", re.I)


def load(path: Path) -> dict:
    out = subprocess.run(
        ["ruby", "-ryaml", "-rjson", "-e", "puts YAML.safe_load(File.read(ARGV[0]), aliases: true).to_json", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(out.stdout) or {}


def triggers(doc: dict) -> dict:
    on = doc.get("on", doc.get("true", {}))  # YAML 1.1 reads a bare `on` key as true
    if isinstance(on, str):
        return {on: None}
    if isinstance(on, list):
        return {t: None for t in on}
    return on or {}


def scheduled_with_reason(path: Path) -> bool:
    """A schedule is allowed when a comment within two lines of `schedule:` says why it exists."""
    lines = path.read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(lines):
        if re.match(r"\s*schedule\s*:", line):
            window = lines[max(0, i - 2) : i + 3]
            return any(re.search(r"#\s*\S{3,}", near) for near in window if near is not line or "#" in near)
    return False


def check(path: Path) -> list[str]:
    try:
        doc = load(path)
    except (subprocess.CalledProcessError, json.JSONDecodeError) as error:
        return [f"unparseable: {error}"]
    on = triggers(doc)
    on_pr = any(t in on for t in ("pull_request", "pull_request_target"))
    findings: list[str] = []
    if "schedule" in on and not scheduled_with_reason(path):
        findings.append("scheduled run: state its reason in a comment next to `schedule:`")
    push = on.get("push")
    if on_pr and "push" in on and not (isinstance(push, dict) and (push.get("branches") or push.get("tags"))):
        findings.append("push on every branch plus pull_request: each PR commit runs twice")
    pr_jobs = []
    for name, job in (doc.get("jobs") or {}).items():
        if not isinstance(job, dict):
            continue
        cond = str(job.get("if", ""))
        runs_on = json.dumps(job.get("runs-on", ""))
        if "matrix." in runs_on:
            runs_on += json.dumps(job.get("strategy", {}))
        # Deploy jobs may need the self-hosted network; jobs named *fallback* are the quota fallback itself.
        if ("self-hosted" in runs_on or "vars." in runs_on) and not HOSTED.search(runs_on) and not re.search(r"deploy|fallback", name, re.I):
            findings.append(f"job {name}: runs only on a self-hosted runner; hosted must be the default and self-hosted the quota fallback")
        # A per-PR job that skips forks unless labelled: the skipped required check counts as passing.
        if on_pr and "head.repo.full_name == github.repository" in cond and "run-full-ci" not in cond:
            findings.append(f"job {name}: skipped for fork PRs; a skipped required check counts as passing, so a fork could merge unvalidated (route forks to a hosted runner without secrets instead of skipping)")
        if not on_pr or ("pull_request" not in cond and "push" in cond) or LABEL_GATE.search(cond) or "workflow_dispatch" in cond:
            continue
        if "github.event_name == 'push'" in cond or "github.event_name != 'pull_request'" in cond:
            continue
        pr_jobs.append(name)
        steps = [s for s in job.get("steps") or [] if isinstance(s, dict)]
        pr_steps = [s for s in steps if not re.search(r"label|push|workflow_dispatch", str(s.get("if", "")), re.I)]
        body = json.dumps({**{k: v for k, v in job.items() if k != "steps"}, "steps": pr_steps})
        if LOCAL_ONLY.search(body):
            findings.append(f"job {name}: lint or tests on every PR; they run locally before the push, the PR job only builds (move them behind the run-full-ci label)")
        if HEAVY.search(body):
            findings.append(f"job {name}: E2E, image build or whole suite on every PR (move behind a label or to the publishing push)")
        if "services" in job:
            findings.append(f"job {name}: service containers on every PR (real-database tier runs on request)")
        if "matrix" in json.dumps(job.get("strategy", {})):
            findings.append(f"job {name}: matrix fan-out on every PR")
        if "timeout-minutes" not in job:
            findings.append(f"job {name}: no timeout-minutes")
    if len(pr_jobs) > 1:
        findings.append(f"{len(pr_jobs)} jobs on every PR ({', '.join(pr_jobs)}): the PR runs one short job")
    for name in push_jobs(doc, on):
        job = doc["jobs"][name]
        body = json.dumps(job.get("steps") or [])
        if REVALIDATE.search(body):
            findings.append(f"job {name}: re-validates on push to main (lint/typecheck/tests); branch protection with `strict` makes main the tested tree")
        if RELEASE_PROOF.search(body):
            findings.append(f"job {name}: release packaging or runtime proof on the way to a deploy; move it to a release tag or the run-full-ci label")
    return findings


def push_jobs(doc: dict, on: dict) -> list[str]:
    """Jobs that run on a push to the default branch, matrix legs counted once each."""
    if "push" not in on:
        return []
    push = on.get("push")
    branches = push.get("branches") if isinstance(push, dict) else None
    if branches and not any(b in ("main", "master") for b in branches):
        return []
    names = []
    for name, job in (doc.get("jobs") or {}).items():
        if not isinstance(job, dict):
            continue
        cond = str(job.get("if", ""))
        # An explicit push branch can coexist with a label or dispatch branch in the same condition.
        runs_on_push = re.search(r'''event_name\s*==\s*['"]push['"]''', cond)
        on_demand = LABEL_GATE.search(cond) or re.search(
            r'''event_name\s*==\s*['"](pull_request|workflow_dispatch|release)['"]''', cond
        )
        if not runs_on_push and (
            on_demand or re.search(r'''event_name\s*!=\s*['"]push['"]''', cond)
        ):
            continue
        legs = 1
        matrix = (job.get("strategy") or {}).get("matrix") if isinstance(job.get("strategy"), dict) else None
        if isinstance(matrix, dict):
            for value in matrix.values():
                if isinstance(value, list):
                    legs *= max(1, len(value))
        names.extend([name] * legs)
    return names


def workflows(target: Path) -> list[Path]:
    if target.is_file():
        return [target]
    base = target / ".github/workflows" if (target / ".github/workflows").is_dir() else target
    return sorted([*base.glob("*.yml"), *base.glob("*.yaml")])


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    failed = False
    for arg in sys.argv[1:]:
        for wf in workflows(Path(arg)):
            findings = check(wf)
            if findings:
                failed = True
                print(wf)
                for finding in findings:
                    print(f"  - {finding}")
    for arg in sys.argv[1:]:
        target = Path(arg)
        if target.is_dir():
            total = []
            for wf in workflows(target):
                try:
                    doc = load(wf)
                except (subprocess.CalledProcessError, json.JSONDecodeError):
                    continue
                total += [f"{wf.name}:{n}" for n in push_jobs(doc, triggers(doc))]
            justified = any(re.search(r"#\s*ci-jobs:\s*\S{3,}", wf.read_text(encoding="utf-8")) for wf in workflows(target))
            if len(total) > 2 and not justified:
                failed = True
                print(target)
                print(f"  - {len(total)} jobs run on push to main ({', '.join(total)}): merge-to-deploy is at most two jobs (build+push, deploy) unless a `# ci-jobs: <reason>` comment justifies more; each job waits for a runner slot")
    if not failed:
        print("PASS: workflows follow the CI rule")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
