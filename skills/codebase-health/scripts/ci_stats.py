#!/usr/bin/env python3
"""Measure what CI really costs, from GitHub Actions history (read-only, uses `gh`).

Reports, per workflow and event: wall time, runner queue wait, compute time,
failure rate; the slowest steps of successful runs; which steps fail; failures
classified by log signature (infra vs test); scheduled workflows failing night
after night; and SHAs that failed then passed on rerun (flakiness).

    ci_stats.py [--repo OWNER/NAME] [--workflow ci.yml ...] [--limit 60]
                [--logs 30] [--out DIR]

Writes DIR/ci-stats.md and DIR/ci-stats.json (default: current directory).
"""

from __future__ import annotations

import argparse
import collections
import concurrent.futures
import datetime as dt
import json
import re
import statistics
import subprocess
import sys
from pathlib import Path

# First match wins. Order from most to least specific.
SIGNATURES: list[tuple[str, str, str]] = [
    ("infra", "port in use", r"EADDRINUSE|is already used|address already in use"),
    ("infra", "missing image", r"Unable to find image|pull access denied|No such image|manifest unknown"),
    ("infra", "docker daemon", r"Cannot connect to the Docker daemon|docker\.sock|failed to connect to the docker API"),
    ("infra", "git ref", r"unknown revision|ambiguous argument|couldn't find remote ref"),
    ("infra", "runner lost", r"lost communication with the server|runner has received a shutdown"),
    ("infra", "billing", r"spending limit|recent account payments have failed"),
    ("infra", "out of memory", r"JavaScript heap out of memory|ENOMEM|Killed\s*$|exit code 137"),
    ("infra", "network", r"ECONNRESET|ETIMEDOUT|EAI_AGAIN|getaddrinfo|socket hang up|503 Service"),
    ("infra", "dependency install", r"ERR_PNPM_(FETCH|LOCKFILE|OUTDATED|NO_MATCHING|TARBALL)|ERESOLVE|lockfile.*(outdated|not up to date)"),
    ("test", "timeout", r"Timeout \d+ms exceeded|Test timeout|timed out after|exceeded while waiting"),
    ("test", "assertion", r"AssertionError|expect\(|Expected:|toBe|toEqual|✗|✘|FAIL "),
    ("build", "type or lint", r"error TS\d+|Type error|lint/|biome|eslint|oxlint"),
]
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def gh(*args: str) -> str:
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def gh_json(*args: str):
    return json.loads(gh(*args))


def ts(value: str | None) -> dt.datetime | None:
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


def seconds(start: str | None, end: str | None) -> float | None:
    a, b = ts(start), ts(end)
    return (b - a).total_seconds() if a and b else None


def mean(values) -> float:
    values = [v for v in values if v is not None]
    return statistics.mean(values) if values else 0.0


def classify(log: str) -> tuple[str, str]:
    for kind, label, pattern in SIGNATURES:
        if re.search(pattern, log, re.MULTILINE):
            return kind, label
    return "unknown", "unclassified"


def errored_text(log: str) -> str:
    """Every log section that ends in `##[error]`; the log tail when none does."""
    clean = ANSI.sub("", log)
    lines = [re.sub(r"^\S+Z ", "", line) for line in clean.splitlines()]
    sections, current = [], None
    for line in lines:
        if line.startswith("##[group]Run "):
            current = [line]
            sections.append(current)
        elif current is not None:
            current.append(line)
    errored = ["\n".join(s) for s in sections if any("##[error]" in line for line in s)]
    return "\n".join(errored) if errored else "\n".join(lines[-400:])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", help="OWNER/NAME (default: the current repository)")
    parser.add_argument("--workflow", action="append", default=[], help="workflow file or name; repeatable")
    parser.add_argument("--limit", type=int, default=60, help="runs per workflow (default 60)")
    parser.add_argument("--logs", type=int, default=30, help="failed jobs per workflow whose logs are classified (default 30)")
    parser.add_argument("--out", default=".", help="output directory")
    args = parser.parse_args()

    repo = args.repo or gh("repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner").strip()
    fields = "databaseId,event,conclusion,status,createdAt,updatedAt,workflowName,headBranch,headSha"
    runs = []
    for workflow in args.workflow or [None]:
        cmd = ["run", "list", "--repo", repo, "--limit", str(args.limit), "--json", fields]
        if workflow:
            cmd += ["--workflow", workflow]
        runs += gh_json(*cmd)
    runs = [r for r in runs if r["status"] == "completed"]
    if not runs:
        print("no completed runs", file=sys.stderr)
        return 1

    def jobs_of(run):
        return run["databaseId"], gh_json("api", f"repos/{repo}/actions/runs/{run['databaseId']}/jobs?per_page=100")["jobs"]

    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        jobs = dict(pool.map(jobs_of, runs))

    # Per workflow/event/conclusion: wall, queue, compute.
    groups = collections.defaultdict(list)
    for run in runs:
        run_jobs = [j for j in jobs[run["databaseId"]] if j.get("started_at")]
        queue = min((seconds(run["createdAt"], j["started_at"]) for j in run_jobs), default=None)
        compute = sum(seconds(j["started_at"], j["completed_at"]) or 0 for j in run_jobs)
        wall = seconds(run["createdAt"], run["updatedAt"])
        groups[(run["workflowName"], run["event"], run["conclusion"] or "none")].append((wall, queue, compute))

    # Steps: duration in successful runs, failures in all runs.
    step_durations = collections.defaultdict(list)
    step_failures = collections.Counter()
    failed_jobs = []
    for run in runs:
        for job in jobs[run["databaseId"]]:
            for step in job.get("steps") or []:
                key = (run["workflowName"], step["name"])
                if step.get("conclusion") == "failure":
                    step_failures[key] += 1
                    failed_jobs.append((run, job, step["name"]))
                elif run["conclusion"] == "success" and step.get("conclusion") == "success":
                    step_durations[key].append(seconds(step["started_at"], step["completed_at"]) or 0)

    # Failure causes from logs, newest first.
    failed_jobs.sort(key=lambda item: item[0]["createdAt"], reverse=True)

    def cause(item):
        run, job, step = item
        try:
            log = gh("api", "--allow-escape-sequences", f"repos/{repo}/actions/jobs/{job['id']}/logs")
        except subprocess.CalledProcessError:
            return run, step, ("unknown", "log unavailable"), ""
        text = errored_text(log)
        return run, step, classify(text), text

    # One entry per failed job: a job with several failed steps is one failure.
    # The log budget applies per workflow, so a noisy nightly cannot crowd out PR failures.
    seen_jobs, per_workflow, sampled = set(), collections.Counter(), []
    for item in failed_jobs:
        workflow = item[0]["workflowName"]
        if item[1]["id"] in seen_jobs or per_workflow[workflow] >= args.logs:
            continue
        seen_jobs.add(item[1]["id"])
        per_workflow[workflow] += 1
        sampled.append(item)
    with concurrent.futures.ThreadPoolExecutor(6) as pool:
        results = list(pool.map(cause, sampled))
    causes = [(run, step, key) for run, step, key, _ in results]
    unknown_samples = [
        f"=== run {run['databaseId']} · {step}\n" + "\n".join(text.splitlines()[-40:])
        for run, step, key, text in results
        if key[0] == "unknown"
    ]

    # Scheduled workflows: consecutive failures from the newest run.
    streaks = {}
    by_workflow = collections.defaultdict(list)
    for run in runs:
        if run["event"] == "schedule":
            by_workflow[run["workflowName"]].append(run)
    for name, scheduled in by_workflow.items():
        scheduled.sort(key=lambda r: r["createdAt"], reverse=True)
        streak = 0
        for run in scheduled:
            if run["conclusion"] != "failure":
                break
            streak += 1
        streaks[name] = {"failing_in_a_row": streak, "seen": len(scheduled), "since": scheduled[streak - 1]["createdAt"][:10] if streak else None}

    # Flakiness: same SHA failed and later succeeded.
    by_sha = collections.defaultdict(list)
    for run in runs:
        by_sha[(run["workflowName"], run["headSha"])].append(run["conclusion"])
    flaky = [sha for sha, outcomes in by_sha.items() if "failure" in outcomes and "success" in outcomes]

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    lines = [f"# CI stats — {repo}", "", f"{len(runs)} completed runs, newest {max(r['createdAt'] for r in runs)[:10]}, oldest {min(r['createdAt'] for r in runs)[:10]}.", ""]
    lines += ["## Wall time, queue and compute (minutes)", "", "| workflow | event | conclusion | runs | wall | queue | compute |", "|---|---|---|---|---|---|---|"]
    for (wf, event, concl), rows in sorted(groups.items()):
        lines.append(f"| {wf} | {event} | {concl} | {len(rows)} | {mean(r[0] for r in rows)/60:.1f} | {mean(r[1] for r in rows)/60:.1f} | {mean(r[2] for r in rows)/60:.1f} |")
    for wf in sorted({k[0] for k in groups}):
        total = sum(len(v) for k, v in groups.items() if k[0] == wf)
        failed = sum(len(v) for k, v in groups.items() if k[0] == wf and k[2] == "failure")
        lines.append(f"\n**{wf}**: {failed}/{total} runs failed ({100 * failed / total:.0f}%).")
    lines += ["", "## Slowest steps in successful runs", "", "| workflow | step | runs | avg s | max s |", "|---|---|---|---|---|"]
    ranked = sorted(step_durations.items(), key=lambda kv: mean(kv[1]), reverse=True)
    for (wf, step), durations in ranked[:25]:
        lines.append(f"| {wf} | {step} | {len(durations)} | {mean(durations):.0f} | {max(durations):.0f} |")
    lines += ["", "## Failing steps", "", "| workflow | step | failures |", "|---|---|---|"]
    for (wf, step), count in step_failures.most_common(20):
        lines.append(f"| {wf} | {step} | {count} |")
    lines += ["", f"## Failure causes (newest failed jobs per workflow, {len(causes)} in total, by log signature)", "", "| workflow | kind | cause | count | example step |", "|---|---|---|---|---|"]
    tally = collections.Counter((run["workflowName"], *key) for run, _, key in causes)
    examples = {}
    for run, step, key in causes:
        examples.setdefault((run["workflowName"], *key), step)
    for (wf, kind, label), count in sorted(tally.items(), key=lambda kv: (kv[0][0], -kv[1])):
        lines.append(f"| {wf} | {kind} | {label} | {count} | {examples[(wf, kind, label)]} |")
    lines += ["", "Signatures are heuristics: open two logs per class before quoting it."]
    if unknown_samples:
        (out / "ci-unknown-failures.txt").write_text("\n\n".join(unknown_samples) + "\n")
        lines.append(f"Tails of the {len(unknown_samples)} unclassified failures: `ci-unknown-failures.txt`.")
    lines += ["", "## Scheduled workflows", ""]
    for name, info in sorted(streaks.items()):
        flag = " — **nobody is watching**" if info["failing_in_a_row"] >= 3 else ""
        lines.append(f"- {name}: failing {info['failing_in_a_row']} run(s) in a row of {info['seen']} seen{flag}")
    if not streaks:
        lines.append("- none in this window")
    lines += ["", f"## Flakiness", "", f"{len(flaky)} SHA(s) failed and later passed on the same workflow."]

    (out / "ci-stats.md").write_text("\n".join(lines) + "\n")
    (out / "ci-stats.json").write_text(json.dumps({
        "repo": repo,
        "groups": {" | ".join(k): rows for k, rows in groups.items()},
        "steps": {" | ".join(k): v for k, v in step_durations.items()},
        "step_failures": {" | ".join(k): v for k, v in step_failures.items()},
        "causes": [{"run": r["databaseId"], "step": s, "kind": c[0], "cause": c[1]} for r, s, c in causes],
        "scheduled": streaks,
        "flaky": [list(k) for k in flaky],
    }, indent=1, default=str))
    print(out / "ci-stats.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
