"""Domain types for venue events."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class EventStatus(str, Enum):
    """Lifecycle state of an event."""

    SCHEDULED = 'scheduled'
    CANCELLED = 'cancelled'


@dataclass(frozen=True, slots=True)
class Event:
    """A venue's scheduled (or cancelled) event, with its lineup of comedians."""

    id: str
    venue_id: str
    title: str
    start_time: datetime
    status: EventStatus = EventStatus.SCHEDULED
    description: str | None = None
    end_time: datetime | None = None
    place_id: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    h3_index: str | None = None
    ticket_url: str | None = None
    comedian_ids: tuple[str, ...] = ()
    created_at: datetime | None = None
    poster_asset_id: str | None = None
    poster_url: str | None = None
    poster_revision: int = 0
    poster_width: int | None = None
    poster_height: int | None = None
