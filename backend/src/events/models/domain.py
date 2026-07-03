from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class EventStatus(str, Enum):
    SCHEDULED = 'scheduled'
    CANCELLED = 'cancelled'


@dataclass(frozen=True, slots=True)
class Event:
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
