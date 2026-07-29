"""Crossref adapter stub.

Contract:
- query(claim, limit): return deterministic fixture matches.
- fetch(source_id): return deterministic fixture match.
- normalize(raw): map Crossref-like fields to `SourceRecord`.
"""

from __future__ import annotations

import sys
from pathlib import Path
from collections.abc import Mapping
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from .core import InMemorySourceAdapter, SourceRecord, normalize_record
except ImportError:  # pragma: no cover - script loading fallback
    from adapters.core import InMemorySourceAdapter, SourceRecord, normalize_record


class CrossrefAdapter(InMemorySourceAdapter):
    """In-memory Crossref adapter with explicit boundaries."""

    provider = "crossref"

    def __init__(self, records: tuple[Mapping[str, Any], ...] | list[Mapping[str, Any]] = ()):
        super().__init__(records, provider=self.provider)

    def normalize(self, raw: Mapping[str, Any]) -> SourceRecord:
        return normalize_record(raw, provider=self.provider)
