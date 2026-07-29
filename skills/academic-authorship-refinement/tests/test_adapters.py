from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
ADAPTERS_DIR = ROOT / "adapters"


def _load_adapter(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(
        name, ADAPTERS_DIR / filename
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


core = _load_adapter("aar_core", "core.py")
OpenAlex = _load_adapter("aar_openalex", "openalex.py")
Crossref = _load_adapter("aar_crossref", "crossref.py")
SemanticScholar = _load_adapter("aar_semantic", "semantic_scholar.py")
PubMed = _load_adapter("aar_pubmed", "pubmed.py")
Arxiv = _load_adapter("aar_arxiv", "arxiv.py")
Doaj = _load_adapter("aar_doaj", "doaj.py")


class AdapterContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.records = [
            {
                "id": "paper-101",
                "title": "Deep learning in structural biology",
                "abstract": "Deep neural networks for protein folding prediction.",
                "authors": ["Alice A.", "Bob B."],
                "year": "2021",
                "venue": "Nature",
            },
            {
                "id": "paper-102",
                "title": "Classical epidemiology principles",
                "abstract": "Basic infectious disease dynamics.",
                "authors": ["Carol C."],
                "year": 2018,
                "venue": "Lancet",
            },
        ]

    def _assert_adapter(self, adapter):
        result = adapter.query("deep learning protein", limit=2)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].source_id, "paper-101")
        self.assertEqual(result[0].provider, adapter.provider)
        self.assertEqual(adapter.fetch("paper-101").title, "Deep learning in structural biology")
        self.assertIsNone(adapter.fetch("missing"))

    def test_openalex_adapter_contract(self):
        adapter = OpenAlex.OpenAlexAdapter(self.records)
        self._assert_adapter(adapter)

    def test_crossref_adapter_contract(self):
        adapter = Crossref.CrossrefAdapter(self.records)
        self._assert_adapter(adapter)

    def test_semantic_scholar_adapter_contract(self):
        adapter = SemanticScholar.SemanticScholarAdapter(self.records)
        self._assert_adapter(adapter)

    def test_pubmed_adapter_contract(self):
        adapter = PubMed.PubMedAdapter(self.records)
        self._assert_adapter(adapter)

    def test_arxiv_adapter_contract(self):
        adapter = Arxiv.ArxivAdapter(self.records)
        self._assert_adapter(adapter)

    def test_doaj_adapter_contract(self):
        adapter = Doaj.DOAJAdapter(self.records)
        self._assert_adapter(adapter)

    def test_normalize_record_without_identifier(self):
        with self.assertRaises(ValueError):
            core.normalize_record({"title": "No id"}, provider="manual")


if __name__ == "__main__":
    unittest.main()
