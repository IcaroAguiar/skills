"""Aggregate deterministic audits from style and citation checks."""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.claim_source_matrix import build_claim_source_matrix
from scripts.style_metrics import compute_style_metrics
from scripts.verify_references import validate_references


def run_audit(
    text: str,
    claims: list[str],
    sources: list[dict],
) -> dict:
    """Run the full deterministic audit pipeline."""

    style = compute_style_metrics(text)
    matrix = build_claim_source_matrix(claims, sources, min_overlap=1)
    refs = validate_references(sources)
    support_values = [1 if row["has_support"] else 0 for row in matrix]
    mean_support = statistics.mean(support_values) if support_values else 0.0
    mean_corpus_match = (
        statistics.mean(row["source_corpus_match_ratio"] for row in matrix)
        if matrix
        else 0.0
    )

    return {
        "style": style,
        "claim_source_matrix": matrix,
        "references": refs,
        "coverage": {
            "claim_support_ratio": round(mean_support, 3),
            "mean_source_corpus_match_ratio": round(mean_corpus_match, 3),
            "claims_with_sources": sum(1 for row in matrix if row["has_support"]),
            "claim_count": len(matrix),
        },
        "overall_risk": "high"
        if style["risk"] == "high" or refs["invalid_count"] > 0
        else "low" if mean_support >= 0.66 and style["risk"] == "low"
        else "medium",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate deterministic audit report.")
    parser.add_argument("--text", default=None, help="Raw manuscript text.")
    parser.add_argument("--text-file", default=None, help="Path to text file.")
    parser.add_argument("--claims-json", required=True, help="Path to JSON claim list.")
    parser.add_argument("--sources-json", required=True, help="Path to JSON source list.")
    args = parser.parse_args()

    if args.text_file and args.text is None:
        text = Path(args.text_file).read_text(encoding="utf-8")
    else:
        text = args.text or ""

    claims = json.loads(Path(args.claims_json).read_text(encoding="utf-8"))
    sources = json.loads(Path(args.sources_json).read_text(encoding="utf-8"))
    print(json.dumps(run_audit(text, claims, sources), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
