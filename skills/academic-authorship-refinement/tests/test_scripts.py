from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
SCRIPTS_DIR = ROOT / "scripts"


def _load_script(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS_DIR / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


_matrix = _load_script("aar_claim_matrix", "claim_source_matrix.py")
_style = _load_script("aar_style", "style_metrics.py")
_normalize = _load_script("aar_normalize", "normalize_metadata.py")
_verify = _load_script("aar_verify", "verify_references.py")
_retrieve = _load_script("aar_retrieve", "retrieve_sources.py")
_audit = _load_script("aar_audit", "audit_report.py")


class ScriptBehaviorTests(unittest.TestCase):
    def test_claim_source_matrix_detects_match(self) -> None:
        claims = ["machine learning for biology"]
        sources = [
            {
                "source_id": "s1",
                "title": "Machine learning in molecular biology",
                "abstract": "Neural models for sequences.",
            },
            {"source_id": "s2", "title": "Unrelated topic", "abstract": "Historical tax data."},
        ]
        matrix = _matrix.build_claim_source_matrix(claims, sources, min_overlap=1)
        self.assertEqual(len(matrix), 1)
        self.assertEqual(matrix[0]["matched_sources"], ["s1"])
        self.assertTrue(matrix[0]["has_support"])
        self.assertEqual(matrix[0]["matched_source_count"], 1)
        self.assertEqual(matrix[0]["source_corpus_match_ratio"], 0.5)

    def test_style_metrics_basic(self) -> None:
        text = (
            "This study proposes a compact model. "
            "Results were validated with multiple datasets. "
            "The method is reproducible and robust."
        )
        metrics = _style.compute_style_metrics(text)
        self.assertIn("style_score", metrics)
        self.assertIsInstance(metrics["style_score"], int)
        self.assertGreaterEqual(metrics["style_score"], 0)
        self.assertLessEqual(metrics["style_score"], 100)

    def test_normalize_metadata_basic(self) -> None:
        raw = [
            {
                "title": "Deep Learning",
                "authors": "Alice;Bob",
                "year": "2021",
            }
        ]
        normalized = _normalize.normalize_records(raw, default_provider="manual")
        self.assertEqual(len(normalized), 1)
        self.assertEqual(normalized[0]["authors"], ("Alice", "Bob"))
        self.assertEqual(normalized[0]["year"], 2021)

    def test_verify_references_catches_invalid_doi(self) -> None:
        refs = [
            {
                "title": "Paper one",
                "provider": "crossref",
                "source_id": "x1",
                "doi": "invalid-doi",
            }
        ]
        report = _verify.validate_references(refs)
        self.assertEqual(report["invalid_count"], 1)
        self.assertIn("invalid_doi", report["invalid"][0]["errors"])

    def test_verify_references_rejects_invalid_year_strings(self) -> None:
        refs = [
            {
                "title": "Future paper",
                "provider": "crossref",
                "source_id": "future",
                "year": "2500",
            },
            {
                "title": "Ancient paper",
                "provider": "crossref",
                "source_id": "ancient",
                "year": "1499",
            },
            {
                "title": "Invalid paper",
                "provider": "crossref",
                "source_id": "invalid",
                "year": "twenty twenty",
            },
        ]
        report = _verify.validate_references(refs)
        self.assertEqual(report["invalid_count"], 3)
        for invalid in report["invalid"]:
            self.assertIn("invalid_year", invalid["errors"])

    def test_retrieve_and_audit_deterministic(self) -> None:
        fixtures = {
            "openalex": [
                {
                    "id": "a1",
                    "title": "Reproducibility in deep learning",
                    "abstract": "This paper studies reproducibility.",
                    "authors": ["Ana"],
                }
            ],
            "crossref": [],
            "semantic_scholar": [],
            "pubmed": [],
            "arxiv": [],
            "doaj": [],
        }

        claims = ["reproducibility in deep learning models"]
        records = _retrieve.retrieve_sources(claims, fixtures, per_claim_limit=2)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["source_id"], "a1")

        audit = _audit.run_audit("Reproducibility is tested carefully.", claims, records)
        self.assertIn("coverage", audit)
        self.assertIn("overall_risk", audit)
        self.assertIn("claim_support_ratio", audit["coverage"])

    def test_retrieve_rejects_unbounded_claim_batch(self) -> None:
        claims = ["claim"] * (_retrieve.MAX_CLAIMS_PER_BATCH + 1)
        with self.assertRaises(ValueError):
            _retrieve.retrieve_sources(claims, {}, per_claim_limit=1)

    def test_retrieve_rejects_unbounded_per_claim_limit(self) -> None:
        with self.assertRaises(ValueError):
            _retrieve.retrieve_sources(["claim"], {}, per_claim_limit=0)


if __name__ == "__main__":
    unittest.main()
