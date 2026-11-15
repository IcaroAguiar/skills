#!/usr/bin/env python3
"""Cut one QA video per PR from recorded runs: each finding before, then after.

  qa_reel.py --out <dir> --pair <before-run> <after-run> [--pair ...] [--max-seconds 90]

A run is a pr-demo-video run directory recorded with `demo.sh record` (the
"before" one with DEMO_BADGE=Antes on the defective code, the "after" one with
DEMO_BADGE=Depois on the fixed code). Scenes pair by id. A scene that exists
only in the before run is a proposal that was not fixed and plays alone.
Use a second pair for findings recorded at another viewport (the phone).

Writes <out>/qa.mp4, <out>/reel.json and <out>/frames/<id>-<antes|depois>-<NNs|end>.png (one every 2 s).
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

W, H = 1280, 800
MAX_BYTES = 10 * 1024 * 1024
SAFE_ID = re.compile(r"^[A-Za-z0-9_-]+$")


def ffmpeg(*args) -> None:
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *map(str, args)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def scenes(run: Path) -> tuple[Path, dict]:
    report = json.loads((run / "report.json").read_text())
    video = report.get("video")
    if not video or not Path(video).is_file():
        raise RuntimeError(f"{run.name}: report has no recording; run `demo.sh record` first")
    found = {}
    for scene in report["scenes"]:
        if not SAFE_ID.match(scene["id"]):
            raise RuntimeError(f"{run.name}: invalid scene id")
        if scene["status"] == "ok":
            found[scene["id"]] = scene
    return Path(video), found


def cut(video: Path, scene: dict, target: Path) -> float:
    start = scene["startMs"] / 1000
    duration = max((scene["endMs"] - scene["startMs"]) / 1000, 0.5)
    fit = (f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
           f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x10181d,fps=25")
    ffmpeg("-i", video, "-ss", f"{start:.2f}", "-t", f"{duration:.2f}", "-vf", fit, "-an",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "medium", target)
    return duration


def frame(source: Path, seconds: float, target: Path) -> None:
    target.unlink(missing_ok=True)
    ffmpeg("-ss", f"{max(seconds, 0):.2f}", "-i", source, "-frames:v", "1", target)
    if not target.is_file() or target.stat().st_size == 0:
        raise RuntimeError(f"frame {target.name} was not produced")


def build(out: Path, pairs: list[tuple[Path, Path]], max_seconds: float) -> dict:
    clips_dir, frames = out / "clips", out / "frames"
    for folder in (clips_dir, frames):
        folder.mkdir(parents=True, exist_ok=True)
    clips, at = [], 0.0
    for before_run, after_run in pairs:
        before_video, before = scenes(before_run)
        after_video, after = scenes(after_run)
        orphans = sorted(set(after) - set(before))
        if orphans:
            raise RuntimeError(f"{after_run.name}: scenes with no before clip: {', '.join(orphans)}")
        for scene_id, scene in before.items():
            for side, video, source in (("antes", before_video, scene), ("depois", after_video, after.get(scene_id))):
                if source is None:
                    continue
                target = clips_dir / f"{len(clips):02d}-{scene_id}-{side}.mp4"
                duration = cut(video, source, target)
                # Every 2 s: the decisive moment (an error, a refused value) rarely sits at the middle or the end.
                second = 0.0
                while second < duration - 0.3:
                    frame(target, second, frames / f"{scene_id}-{side}-{int(second):02d}s.png")
                    second += 2
                frame(target, duration - 0.3, frames / f"{scene_id}-{side}-end.png")
                clips.append({"id": scene_id, "title": scene["title"], "side": side, "file": str(target),
                              "startSeconds": round(at, 2), "seconds": round(duration, 2),
                              "fixed": scene_id in after})
                at += duration
    if not clips:
        raise RuntimeError("no recorded scene with status ok")
    if at > max_seconds:
        raise RuntimeError(f"reel is {at:.0f}s, over the {max_seconds:.0f}s budget: shorten holds or drop the weakest finding")
    listing = out / "clips.txt"
    listing.write_text("".join(f"file '{clip['file']}'\n" for clip in clips))
    reel = out / "qa.mp4"
    ffmpeg("-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", "-movflags", "+faststart", reel)
    crf = 24
    while reel.stat().st_size > MAX_BYTES and crf < 36:
        crf += 4
        ffmpeg("-f", "concat", "-safe", "0", "-i", listing, "-c:v", "libx264", "-pix_fmt", "yuv420p",
               "-crf", str(crf), "-movflags", "+faststart", reel)
    manifest = {"video": str(reel), "seconds": round(at, 2), "bytes": reel.stat().st_size,
                "findings": len({clip["id"] for clip in clips}),
                "fixed": len({clip["id"] for clip in clips if clip["fixed"]}), "clips": clips}
    (out / "reel.json").write_text(json.dumps(manifest, indent=2))
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--pair", nargs=2, action="append", required=True, type=Path, metavar=("BEFORE", "AFTER"))
    parser.add_argument("--max-seconds", type=float, default=90)
    args = parser.parse_args()
    try:
        manifest = build(args.out, [tuple(pair) for pair in args.pair], args.max_seconds)
    except (RuntimeError, OSError, KeyError, json.JSONDecodeError, subprocess.CalledProcessError) as error:
        print(f"qa_reel failed: {error if isinstance(error, RuntimeError) else type(error).__name__}", file=sys.stderr)
        return 1
    print(f"qa.mp4: {manifest['seconds']}s, {manifest['bytes'] // 1024} KB, "
          f"{manifest['findings']} finding(s), {manifest['fixed']} fixed; frames in {args.out / 'frames'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
