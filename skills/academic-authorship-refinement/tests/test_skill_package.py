from __future__ import annotations

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"


def _skill_text() -> str:
    return SKILL.read_text(encoding="utf-8")


def _frontmatter(text: str) -> str:
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not match:
        raise AssertionError("SKILL.md must start with YAML frontmatter")
    return match.group(1)


class SkillPackageTests(unittest.TestCase):
    def test_frontmatter_is_minimal_and_trigger_rich(self) -> None:
        frontmatter = _frontmatter(_skill_text())
        keys = [
            line.split(":", 1)[0]
            for line in frontmatter.splitlines()
            if line and not line.startswith(" ")
        ]
        self.assertEqual(keys, ["name", "description"])
        self.assertIn("academic authorship refinement", frontmatter)
        self.assertIn("citation integrity", frontmatter)
        self.assertIn("detector-aware", frontmatter)

    def test_referenced_support_files_exist(self) -> None:
        text = _skill_text()
        referenced_paths = sorted(set(re.findall(r"`((?:references|prompts|scripts)/[^`]+)`", text)))
        self.assertGreaterEqual(len(referenced_paths), 10)
        missing = [path for path in referenced_paths if not (ROOT / path).exists()]
        self.assertEqual(missing, [])

    def test_ethics_guardrails_are_explicit(self) -> None:
        text = _skill_text().lower()
        self.assertIn("do not promise detector bypass", text)
        self.assertIn("do not fabricate citations", text)
        self.assertIn("do not hide ai assistance", text)
        self.assertIn("do not scrape sources", text)

    def test_openai_metadata_matches_skill(self) -> None:
        metadata = (ROOT / "agents" / "openai.yaml").read_text(encoding="utf-8")
        self.assertIn("Academic Authorship Refinement", metadata)
        self.assertIn("citation checks", metadata)
        self.assertIn("unsupported claims", metadata)


if __name__ == "__main__":
    unittest.main()
