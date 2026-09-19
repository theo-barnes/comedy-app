from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True, slots=True)
class FeedCandidate:
    """A published piece of content plus the signals used for ranking."""

    content_id: str
    creator_id: str
    content_type: str
    title: str
    published_at: datetime
    h3_index: str | None = None
    place_id: str | None = None
    event_id: str | None = None
    view_count: int = 0
    completion_count: int = 0
    like_count: int = 0
    save_count: int = 0
    ticket_click_count: int = 0


@dataclass(frozen=True, slots=True)
class LinkedEvent:
    id: str
    title: str
    start_time: datetime
    venue_id: str
    ticket_url: str | None = None


@dataclass(frozen=True, slots=True)
class FeedItem:
    content_id: str
    content_type: str
    title: str
    creator_id: str
    creator_name: str
    published_at: datetime
    description: str | None = None
    hls_url: str | None = None
    thumbnail_url: str | None = None
    image_url: str | None = None
    linked_event: LinkedEvent | None = None
    like_count: int = 0
    save_count: int = 0
    viewer_liked: bool = False
    viewer_saved: bool = False


@dataclass(frozen=True, slots=True)
class FeedPage:
    items: tuple[FeedItem, ...]
    next_cursor: str | None


@dataclass(frozen=True, slots=True)
class ComedianSummary:
    user_id: str
    stage_name: str
    bio: str | None = None


@dataclass(frozen=True, slots=True)
class HomeFeed:
    nearby_events: tuple['NearbyEvent', ...] = ()
    trending_clips: tuple[FeedItem, ...] = ()
    followed_creators: tuple[FeedItem, ...] = ()
    new_comedians: tuple[ComedianSummary, ...] = ()


@dataclass(frozen=True, slots=True)
class NearbyEvent:
    id: str
    title: str
    start_time: datetime
    venue_id: str
    venue_name: str
    ticket_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None


@dataclass(frozen=True, slots=True)
class FeedContext:
    """Inputs shared by all candidate sources for one feed build."""

    user_id: str
    latitude: float | None
    longitude: float | None
    h3_cells: tuple[str, ...] = ()
    near_cells: tuple[str, ...] = ()  # k<=1 subset of h3_cells for location scoring
    place_id: str | None = None
    followed_creator_ids: tuple[str, ...] = ()
    blocked_user_ids: tuple[str, ...] = ()
    candidate_limit: int = 200
    now: datetime = field(default_factory=lambda: datetime.now().astimezone())
