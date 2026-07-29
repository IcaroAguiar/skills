"""Core contracts for deterministic source adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict, field
from pathlib import Path
import sys
from typing import Any, Iterable, Mapping, Sequence

try:
    from .schema import (
        FIELD_ABSTRACT,
        FIELD_AUTHORS,
        FIELD_CONFERENCE,
        FIELD_DOI,
        FIELD_ID,
        FIELD_JOURNAL,
        FIELD_PMID,
        FIELD_PROVIDER,
        FIELD_PUBLICATION_YEAR,
        FIELD_SOURCE_ID,
        FIELD_TITLE,
        FIELD_URL,
        FIELD_VENUE,
        FIELD_YEAR,
    )
except ImportError:  # pragma: no cover - direct script/test loading fallback
    ADAPTERS_DIR = Path(__file__).resolve().parent
    if str(ADAPTERS_DIR) not in sys.path:
        sys.path.insert(0, str(ADAPTERS_DIR))
    from schema import (
        FIELD_ABSTRACT,
        FIELD_AUTHORS,
        FIELD_CONFERENCE,
        FIELD_DOI,
        FIELD_ID,
        FIELD_JOURNAL,
        FIELD_PMID,
        FIELD_PROVIDER,
        FIELD_PUBLICATION_YEAR,
        FIELD_SOURCE_ID,
        FIELD_TITLE,
        FIELD_URL,
        FIELD_VENUE,
        FIELD_YEAR,
    )


RecordDict = dict[str, Any]


@dataclass(frozen=True)
class SourceRecord:
    """Canonical, deterministic metadata container for a bibliographic source."""

    source_id: str
    title: str
    provider: str
    authors: tuple[str, ...] = ()
    year: int | None = None
    venue: str | None = None
    doi: str | None = None
    pmid: str | None = None
    url: str | None = None
    abstract: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> RecordDict:
        """Return a JSON-serializable representation of the record."""

        return asdict(self)


def _coerce_authors(value: object) -> tuple[str, ...]:
    """Normalize different author input shapes into a canonical tuple."""

    if not value:
        return ()
    if isinstance(value, str):
        parts = [author.strip() for author in value.split(";") if author.strip()]
        return tuple(parts)
    if isinstance(value, Iterable):
        return tuple(str(item).strip() for item in value if str(item).strip())
    return (str(value),)


def _coerce_year(value: object) -> int | None:
    """Convert commonly seen year values to int when possible."""

    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        digits = "".join(ch for ch in value if ch.isdigit())
        return int(digits[:4]) if digits else None
    return None


def normalize_record(
    raw: Mapping[str, Any],
    *,
    provider: str,
    default_id_prefix: str | None = None,
) -> SourceRecord:
    """Convert arbitrary raw metadata into a `SourceRecord`.

    Required fields:
      - title: publication title
      - source_id: stable identifier

    Optional fields are populated when present.
    """

    title = str(raw.get(FIELD_TITLE, "")).strip()
    provider_id = str(raw.get(FIELD_PROVIDER, provider)).strip()
    source_id = str(
        raw.get(FIELD_ID)
        or raw.get(FIELD_SOURCE_ID)
        or raw.get(FIELD_DOI)
        or raw.get(FIELD_PMID)
        or ""
    ).strip()
    if not source_id:
        if default_id_prefix:
            source_id = f"{default_id_prefix}:{title.lower().replace(' ', '-')[:64]}"
        else:
            raise ValueError("source_id/title require at least one stable identifier.")

    venue_value = raw.get(FIELD_VENUE) or raw.get(FIELD_JOURNAL) or raw.get(FIELD_CONFERENCE)

    return SourceRecord(
        source_id=source_id,
        title=title,
        provider=provider_id,
        authors=_coerce_authors(raw.get(FIELD_AUTHORS)),
        year=_coerce_year(raw.get(FIELD_YEAR) or raw.get(FIELD_PUBLICATION_YEAR)),
        venue=venue_value.strip() if isinstance(venue_value, str) else None,
        doi=(str(raw.get(FIELD_DOI)).strip().lower() if raw.get(FIELD_DOI) else None),
        pmid=str(raw.get(FIELD_PMID)).strip() if raw.get(FIELD_PMID) else None,
        url=str(raw.get(FIELD_URL)).strip() if raw.get(FIELD_URL) else None,
        abstract=str(raw.get(FIELD_ABSTRACT)).strip() if raw.get(FIELD_ABSTRACT) else None,
        metadata={
            k: v
            for k, v in raw.items()
            if k
            not in {
                FIELD_ID,
                FIELD_SOURCE_ID,
                FIELD_TITLE,
                FIELD_PROVIDER,
                FIELD_AUTHORS,
                FIELD_YEAR,
                FIELD_PUBLICATION_YEAR,
                FIELD_VENUE,
                FIELD_JOURNAL,
                FIELD_CONFERENCE,
                FIELD_DOI,
                FIELD_PMID,
                FIELD_URL,
                FIELD_ABSTRACT,
            }
        },
    )


class SourceAdapter(ABC):
    """Abstract source adapter contract.

    Implementations must provide:
    - a stable provider name;
    - query by claim text (string);
    - fetch by source identifier.
    """

    provider: str

    @abstractmethod
    def query(self, claim: str, limit: int = 10) -> list[SourceRecord]:
        """Return up to `limit` records that could support the provided claim."""

    @abstractmethod
    def fetch(self, source_id: str) -> SourceRecord | None:
        """Return one record by identifier, or `None` when absent."""

    @abstractmethod
    def normalize(self, raw: Mapping[str, Any]) -> SourceRecord:
        """Normalize a raw payload from this provider."""


class InMemorySourceAdapter(SourceAdapter):
    """Deterministic adapter implementation using seeded records.

    Tests and local scripts should use this behavior by default. It avoids network
    calls and preserves deterministic ordering.
    """

    provider = "in-memory"

    def __init__(self, records: Sequence[Mapping[str, Any]], *, provider: str | None = None):
        self.provider = provider or self.provider
        self._records = tuple(
            SourceRecord(
                **normalize_record(raw, provider=self.provider).to_dict()
            )
            for raw in records
        )

    def normalize(self, raw: Mapping[str, Any]) -> SourceRecord:
        return normalize_record(raw, provider=self.provider)

    def query(self, claim: str, limit: int = 10) -> list[SourceRecord]:
        claim_tokens = {token.lower() for token in claim.split() if len(token) > 2}
        ranked: list[tuple[int, SourceRecord]] = []

        for record in self._records:
            text = " ".join(
                [
                    record.title,
                    record.abstract or "",
                    " ".join(record.authors),
                    record.venue or "",
                ]
            ).lower()
            tokens = {token for token in text.split() if len(token) > 2}
            overlap = len(claim_tokens & tokens)
            ranked.append((overlap, record))

        ranked.sort(key=lambda item: (item[0], item[1].year or 0), reverse=True)
        return [record for overlap, record in ranked if overlap > 0][:limit]

    def fetch(self, source_id: str) -> SourceRecord | None:
        for record in self._records:
            if record.source_id == source_id:
                return record
        return None
