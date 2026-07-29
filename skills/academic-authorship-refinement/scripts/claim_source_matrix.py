"""Build a deterministic claim × source mapping used in validation workflows."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def _tokenize(value: str) -> set[str]:
    tokens = re.findall(r"[A-Za-zÀ-ÿ0-9]+", str(value).lower())
    return {token for token in tokens if len(token) >= 3}


def _record_tokens(record: dict) -> set[str]:
    text = " ".join(
        [
            str(record.get("title", "")),
            str(record.get("abstract", "")),
            str(record.get("venue", "")),
            " ".join(record.get("authors", [])),
            str(record.get("provider", "")),
        ]
    )
    return _tokenize(text)


def build_claim_source_matrix(
    claims: list[str],
    sources: list[dict],
    *,
    min_overlap: int = 1,
) -> list[dict]:
    """Return row-wise overlap mapping between claim texts and source records."""

    matrix: list[dict] = []
    normalized_sources = [
        {
            "source_id": source.get("source_id") or source.get("id") or f"idx-{index}",
            "title": source.get("title", ""),
            "tokens": _record_tokens(source),
        }
        for index, source in enumerate(sources)
    ]

    for claim_index, claim in enumerate(claims):
        claim_tokens = _tokenize(claim)
        matches = []
        coverage = {}
        for source in normalized_sources:
            overlap = claim_tokens.intersection(source["tokens"])
            score = len(overlap)
            if score >= min_overlap:
                source_id = source["source_id"]
                score_item = {
                    "source_id": source_id,
                    "score": score,
                    "title": source["title"],
                }
                matches.append(score_item)
                coverage[source_id] = score

        matches.sort(key=lambda item: item["score"], reverse=True)
        matrix.append(
            {
                "claim_index": claim_index,
                "claim": claim,
                "matched_sources": [item["source_id"] for item in matches],
                "scores": {item["source_id"]: item["score"] for item in matches},
                "has_support": bool(matches),
                "matched_source_count": len(matches),
                "source_corpus_match_ratio": len(coverage) / max(len(sources), 1),
            }
        )

    return matrix


def main() -> None:
    parser = argparse.ArgumentParser(description="Build claim-to-source overlap matrix.")
    parser.add_argument("--claims-json", required=True, help="Path to JSON list of claims.")
    parser.add_argument(
        "--sources-json",
        required=True,
        help="Path to JSON list of source records.",
    )
    parser.add_argument(
        "--min-overlap",
        type=int,
        default=1,
        help="Minimum number of token overlaps to classify a match.",
    )
    args = parser.parse_args()

    claims = json.loads(Path(args.claims_json).read_text(encoding="utf-8"))
    sources = json.loads(Path(args.sources_json).read_text(encoding="utf-8"))
    matrix = build_claim_source_matrix(claims, sources, min_overlap=args.min_overlap)
    print(json.dumps(matrix, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
