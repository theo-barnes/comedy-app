"""Domain types for ephemeral accessibility narration."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class NarrationResourceType(str, Enum):
    EVENT = 'event'
    CREATOR = 'creator'


@dataclass(frozen=True, slots=True)
class Narration:
    """Transient audio returned by a configured speech provider."""

    audio: bytes
    content_type: str
    provider_request_id: str | None = None
    character_cost: str | None = None
