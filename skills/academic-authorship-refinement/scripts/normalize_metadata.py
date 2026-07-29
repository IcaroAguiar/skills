"""Normalize heterogeneous bibliographic payloads into canonical records."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from adapters.core import normalize_record
from adapters.schema import PROVIDER_MANUAL


def normalize_records(raw_records: list[dict], *, default_provider: str = PROVIDER_MANUAL) -> list[dict]:
    """Normalize multiple raw records deterministically."""

    normalized: list[dict] = []
    for index, record in enumerate(raw_records):
        normalized.append(
            normalize_record(
                record,
                provider=record.get("provider", default_provider),
                default_id_prefix=f"{default_provider}:{index}",
            ).to_dict()
        )
    return normalized


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize provider metadata from local payloads."
    )
    parser.add_argument(
        "--input-json",
        required=True,
        help="Path to a JSON list of raw records to normalize.",
    )
    parser.add_argument(
        "--provider",
        default=PROVIDER_MANUAL,
        help="Default provider when not present in payloads.",
    )
    args = parser.parse_args()

    raw = json.loads(Path(args.input_json).read_text(encoding="utf-8"))
    print(json.dumps(normalize_records(raw, default_provider=args.provider), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
