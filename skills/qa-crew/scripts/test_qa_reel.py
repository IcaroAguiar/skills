#!/usr/bin/env python3
"""Needs ffmpeg and ffprobe on PATH; builds synthetic runs, no browser."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from qa_reel import build  # noqa: E402


def run_dir(root: Path, name: str, size: str, scenes: list[tuple[str, int, int]]) -> Path:
    run = root / name
    run.mkdir()
    video = run / "page.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
                    f"testsrc=duration=8:size={size}:rate=25", "-pix_fmt", "yuv420p", str(video)], check=True)
    (run / "report.json").write_text(json.dumps({"video": str(video), "scenes": [
        {"id": scene_id, "title": scene_id, "status": "ok", "startMs": start, "endMs": end}
        for scene_id, start, end in scenes]}))
    return run


def seconds(path: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                 str(path)], check=True, capture_output=True, text=True).stdout)


class Reel(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_pairs_before_and_after_and_keeps_proposals(self):
        before = run_dir(self.root, "before", "1280x800", [("01-cpf", 0, 2000), ("02-fluxo", 2000, 4000)])
        after = run_dir(self.root, "after", "1280x800", [("01-cpf", 1000, 3000)])
        manifest = build(self.root / "out", [(before, after)], 90)
        order = [(clip["id"], clip["side"]) for clip in manifest["clips"]]
        self.assertEqual(order, [("01-cpf", "antes"), ("01-cpf", "depois"), ("02-fluxo", "antes")])
        self.assertEqual((manifest["findings"], manifest["fixed"]), (2, 1))
        self.assertAlmostEqual(seconds(self.root / "out/qa.mp4"), 6, delta=0.5)
        self.assertTrue((self.root / "out/frames/01-cpf-depois-end.png").is_file())

    def test_phone_pair_joins_the_same_reel(self):
        desk = (run_dir(self.root, "b1", "1280x800", [("01-a", 0, 2000)]),
                run_dir(self.root, "a1", "1280x800", [("01-a", 0, 2000)]))
        phone = (run_dir(self.root, "b2", "390x844", [("02-b", 0, 2000)]),
                 run_dir(self.root, "a2", "390x844", [("02-b", 0, 2000)]))
        manifest = build(self.root / "out", [desk, phone], 90)
        self.assertEqual(len(manifest["clips"]), 4)

    def test_budget_and_orphan_fail(self):
        before = run_dir(self.root, "before", "1280x800", [("01-a", 0, 4000)])
        after = run_dir(self.root, "after", "1280x800", [("01-a", 0, 4000)])
        with self.assertRaisesRegex(RuntimeError, "budget"):
            build(self.root / "out", [(before, after)], 5)
        stray = run_dir(self.root, "stray", "1280x800", [("09-x", 0, 1000)])
        with self.assertRaisesRegex(RuntimeError, "no before clip"):
            build(self.root / "out2", [(before, stray)], 90)


if __name__ == "__main__":
    unittest.main()
