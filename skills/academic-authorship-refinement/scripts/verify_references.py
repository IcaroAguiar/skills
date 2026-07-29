"""Reference integrity checks for deterministic citation validation."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

DOI_RE = re.compile(r"^10\.\d{4,9}/\S+$", re.IGNORECASE)
URL_RE = re.compile(r"^https?://\S+$", re.IGNORECASE)
MIN_REASONABLE_PUBLICATION_YEAR = 1500
MAX_REASONABLE_PUBLICATION_YEAR = 2100

FIELD_DOI = "doi"
FIELD_PROVIDER = "provider"
FIELD_SOURCE_ID = "source_id"
FIELD_TITLE = "title"
FIELD_URL = "url"
FIELD_YEAR = "year"


def _coerce_year(value: object) -> int | None:
    """Return a four-digit year int when the field is parseable."""

    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        return int(stripped) if re.fullmatch(r"\d{4}", stripped) else None
    return None


def validate_reference(reference: dict) -> tuple[bool, list[str]]:
    """Validate one reference dictionary."""

    errors: list[str] = []

    if not str(reference.get(FIELD_TITLE, "")).strip():
        errors.append("missing_title")
    if not str(reference.get(FIELD_PROVIDER, "")).strip():
        errors.append("missing_provider")
    if not str(reference.get(FIELD_SOURCE_ID, "")).strip():
        errors.append("missing_source_id")

    doi = str(reference.get(FIELD_DOI, "")).strip()
    if doi and not DOI_RE.fullmatch(doi):
        errors.append("invalid_doi")

    raw_year = reference.get(FIELD_YEAR)
    year = _coerce_year(raw_year)
    if raw_year is not None:
        if year is None:
            errors.append("invalid_year")
        elif year < MIN_REASONABLE_PUBLICATION_YEAR or year > MAX_REASONABLE_PUBLICATION_YEAR:
            errors.append("invalid_year")

    url = str(reference.get(FIELD_URL, "")).strip()
    if url and not URL_RE.match(url):
        errors.append("invalid_url")

    return (len(errors) == 0, errors)


def validate_references(records: list[dict]) -> dict:
    """Validate a list of references and emit a deterministic report."""

    invalid = []
    valid = []
    for record in records:
        is_valid, errors = validate_reference(record)
        payload = dict(record)
        if is_valid:
            valid.append(payload)
        else:
            payload["errors"] = errors
            invalid.append(payload)

    return {
        "count": len(records),
        "valid_count": len(valid),
        "invalid_count": len(invalid),
        "valid": valid,
        "invalid": invalid,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate sources before citation integration.")
    parser.add_argument(
        "--references-json",
        required=True,
        help="Path to JSON list of normalized references.",
    )
    args = parser.parse_args()
    records = json.loads(Path(args.references_json).read_text(encoding="utf-8"))
    report = validate_references(records)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
