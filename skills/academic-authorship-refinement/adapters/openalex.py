"""OpenAlex adapter stub.

Contract:
- query(claim, limit): return deterministic, ranked `SourceRecord` objects from
  seeded fixtures.
- fetch(source_id): return a deterministic fixture record by stable identifier.
- normalize(raw): map provider payload keys to `SourceRecord`.
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


class OpenAlexAdapter(InMemorySourceAdapter):
    """In-memory OpenAlex adapter with explicit, testable contracts."""

    provider = "openalex"

    def __init__(self, records: tuple[Mapping[str, Any], ...] | list[Mapping[str, Any]] = ()):
        super().__init__(records, provider=self.provider)

    def normalize(self, raw: Mapping[str, Any]) -> SourceRecord:
        return normalize_record(raw, provider=self.provider)
