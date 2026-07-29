"""Source retrieval using deterministic local adapter fixtures."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from adapters.openalex import OpenAlexAdapter
from adapters.crossref import CrossrefAdapter
from adapters.semantic_scholar import SemanticScholarAdapter
from adapters.pubmed import PubMedAdapter
from adapters.arxiv import ArxivAdapter
from adapters.doaj import DOAJAdapter

MAX_CLAIMS_PER_BATCH = 100
MAX_PER_CLAIM_LIMIT = 20


def load_fixtures(path: str | Path) -> dict[str, list[dict]]:
    """Load local fixture records by provider from JSON."""

    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    normalized = {}
    for provider, records in payload.items():
        normalized[provider.lower()] = list(records)
    return normalized


def instantiate_adapters(fixture_records: dict[str, list[dict]]) -> list[Any]:
    """Instantiate adapters with deterministic fixture state."""

    return [
        OpenAlexAdapter(fixture_records.get("openalex", [])),
        CrossrefAdapter(fixture_records.get("crossref", [])),
        SemanticScholarAdapter(fixture_records.get("semantic_scholar", [])),
        PubMedAdapter(fixture_records.get("pubmed", [])),
        ArxivAdapter(fixture_records.get("arxiv", [])),
        DOAJAdapter(fixture_records.get("doaj", [])),
    ]


def retrieve_sources(
    claims: list[str],
    fixtures: dict[str, list[dict]],
    *,
    per_claim_limit: int = 3,
) -> list[dict]:
    """Query all adapters for a bounded claim batch and deduplicate records.

    The default adapters are deterministic local fixtures. Real network adapters
    should implement batching/rate limiting behind the same adapter boundary.
    """

    if len(claims) > MAX_CLAIMS_PER_BATCH:
        raise ValueError(f"claim batch exceeds {MAX_CLAIMS_PER_BATCH} items")
    if per_claim_limit < 1 or per_claim_limit > MAX_PER_CLAIM_LIMIT:
        raise ValueError(f"per_claim_limit must be between 1 and {MAX_PER_CLAIM_LIMIT}")

    adapters = instantiate_adapters(fixtures)
    hits: dict[str, dict] = {}
    for claim in claims:
        for adapter in adapters:
            for record in adapter.query(claim, limit=per_claim_limit):
                hits[record.source_id] = record.to_dict()
    return list(hits.values())


def main() -> None:
    parser = argparse.ArgumentParser(description="Retrieve sources from local fixtures.")
    parser.add_argument("--claims-json", required=True, help="Path to JSON claims list.")
    parser.add_argument("--fixtures-json", required=True, help="Path to fixture JSON.")
    parser.add_argument("--limit", type=int, default=3)
    args = parser.parse_args()

    claims = json.loads(Path(args.claims_json).read_text(encoding="utf-8"))
    fixtures = load_fixtures(args.fixtures_json)
    results = retrieve_sources(claims, fixtures, per_claim_limit=args.limit)
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
