from __future__ import annotations

import base64
import binascii
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol, Sequence

import h3

from shared.cache import CacheBackend
from shared.errors import ValidationFailedError

from .models.domain import (
    ComedianSummary,
    FeedContext,
    FeedItem,
    FeedPage,
    HomeFeed,
    NearbyEvent,
)
from .ranker import FeedRanker
from .repository import FeedRepository
from .sources import CandidateSource


class PlaceResolver(Protocol):
    def resolve_city(self, lat: float, lng: float) -> Any | None: ...


class EventsPort(Protocol):
    def list_nearby(
        self, lat: float, lng: float, *, radius_meters: int, limit: int
    ) -> list[Any]: ...


class VenueNames(Protocol):
    def venue_names(self, venue_ids: Sequence[str]) -> dict[str, str]: ...


@dataclass(frozen=True, slots=True)
class FeedSources:
    followed: CandidateSource
    nearby: CandidateSource
    trending: CandidateSource

    def all(self) -> tuple[CandidateSource, ...]:
        return (self.followed, self.nearby, self.trending)


class FeedService:
    def __init__(
        self,
        repository: FeedRepository,
        sources: FeedSources,
        ranker: FeedRanker,
        cache: CacheBackend,
        place_resolver: PlaceResolver,
        events: EventsPort,
        venue_names: VenueNames,
        *,
        page_size: int = 20,
        cache_ttl_seconds: int = 300,
        candidate_limit: int = 200,
        h3_resolution: int = 9,
        h3_ring_k: int = 2,
        anchor_resolution: int = 7,
    ) -> None:
        self._repository = repository
        self._sources = sources
        self._ranker = ranker
        self._cache = cache
        self._places = place_resolver
        self._events = events
        self._venue_names = venue_names
        self._page_size = page_size
        self._ttl = cache_ttl_seconds
        self._candidate_limit = candidate_limit
        self._h3_resolution = h3_resolution
        self._h3_ring_k = h3_ring_k
        self._anchor_resolution = anchor_resolution

    # ------------------------------------------------------------------ videos

    def feed_videos(
        self,
        user_id: str,
        *,
        lat: float | None = None,
        lng: float | None = None,
        cursor: str | None = None,
        limit: int | None = None,
    ) -> FeedPage:
        page_size = min(limit or self._page_size, 50)
        anchor = self._anchor_cell(lat, lng)
        offset = 0
        if cursor is not None:
            anchor, offset = self._decode_cursor(cursor)

        content_ids = self._snapshot(user_id, anchor, lat, lng)
        window = content_ids[offset : offset + page_size]
        items = self._repository.hydrate(window, user_id)
        next_offset = offset + page_size
        next_cursor = (
            self._encode_cursor(anchor, next_offset)
            if next_offset < len(content_ids)
            else None
        )
        return FeedPage(items=tuple(items), next_cursor=next_cursor)

    # ------------------------------------------------------------------ home

    def home_feed(
        self, user_id: str, *, lat: float | None = None, lng: float | None = None
    ) -> HomeFeed:
        ctx = self._build_context(user_id, lat, lng)

        nearby_events: tuple[NearbyEvent, ...] = ()
        if lat is not None and lng is not None:
            events = self._events.list_nearby(lat, lng, radius_meters=25_000, limit=10)
            names = self._venue_names.venue_names([e.venue_id for e in events])
            nearby_events = tuple(
                NearbyEvent(
                    id=e.id,
                    title=e.title,
                    start_time=e.start_time,
                    venue_id=e.venue_id,
                    venue_name=names.get(e.venue_id, 'Unknown venue'),
                    ticket_url=e.ticket_url,
                    latitude=e.latitude,
                    longitude=e.longitude,
                )
                for e in events
            )

        trending = self._section_items(user_id, ctx, self._sources.trending, limit=10)
        followed = self._section_items(user_id, ctx, self._sources.followed, limit=10)
        new_comedians = tuple(self._repository.recent_comedians(limit=10))
        return HomeFeed(
            nearby_events=nearby_events,
            trending_clips=trending,
            followed_creators=followed,
            new_comedians=new_comedians,
        )

    # ------------------------------------------------------------------ internals

    def _section_items(
        self, user_id: str, ctx: FeedContext, source: CandidateSource, *, limit: int
    ) -> tuple[FeedItem, ...]:
        candidates = [
            c
            for c in source.collect(ctx)
            if c.creator_id not in ctx.blocked_user_ids
        ]
        ranked = self._ranker.rank(candidates, ctx)[:limit]
        items = self._repository.hydrate([c.content_id for c in ranked], user_id)
        return tuple(items)

    def _snapshot(
        self, user_id: str, anchor: str, lat: float | None, lng: float | None
    ) -> list[str]:
        key = f'feed:videos:{user_id}:{anchor}'
        cached = self._cache.get(key)
        if cached is not None:
            try:
                ids = json.loads(cached)
                if isinstance(ids, list):
                    return ids
            except json.JSONDecodeError:
                pass

        ctx = self._build_context(user_id, lat, lng)
        merged: dict[str, Any] = {}
        for source in self._sources.all():
            for candidate in source.collect(ctx):
                if candidate.creator_id in ctx.blocked_user_ids:
                    continue
                if candidate.content_type != 'video_clip':
                    continue
                merged.setdefault(candidate.content_id, candidate)
        ranked = self._ranker.rank(list(merged.values()), ctx)
        ids = [c.content_id for c in ranked]
        self._cache.set(key, json.dumps(ids), ttl_seconds=self._ttl)
        return ids

    def _build_context(
        self, user_id: str, lat: float | None, lng: float | None
    ) -> FeedContext:
        h3_cells: tuple[str, ...] = ()
        near_cells: tuple[str, ...] = ()
        place_id: str | None = None
        if lat is not None and lng is not None:
            origin = h3.latlng_to_cell(lat, lng, self._h3_resolution)
            h3_cells = tuple(h3.grid_disk(origin, self._h3_ring_k))
            near_cells = tuple(h3.grid_disk(origin, 1))
            place = self._places.resolve_city(lat, lng)
            place_id = place.id if place is not None else None
        return FeedContext(
            user_id=user_id,
            latitude=lat,
            longitude=lng,
            h3_cells=h3_cells,
            near_cells=near_cells,
            place_id=place_id,
            followed_creator_ids=self._repository.followed_creator_ids(user_id),
            blocked_user_ids=self._repository.blocked_user_ids(user_id),
            candidate_limit=self._candidate_limit,
            now=datetime.now(timezone.utc),
        )

    def _anchor_cell(self, lat: float | None, lng: float | None) -> str:
        if lat is None or lng is None:
            return 'nowhere'
        return h3.latlng_to_cell(lat, lng, self._anchor_resolution)

    @staticmethod
    def _encode_cursor(anchor: str, offset: int) -> str:
        payload = json.dumps({'a': anchor, 'o': offset}).encode()
        return base64.urlsafe_b64encode(payload).decode()

    @staticmethod
    def _decode_cursor(cursor: str) -> tuple[str, int]:
        try:
            payload = json.loads(base64.urlsafe_b64decode(cursor.encode()))
            anchor = payload['a']
            offset = int(payload['o'])
            if not isinstance(anchor, str) or offset < 0:
                raise ValueError
            return anchor, offset
        except (ValueError, KeyError, TypeError, binascii.Error, json.JSONDecodeError):
            raise ValidationFailedError('invalid cursor') from None


__all__ = [
    'ComedianSummary',
    'EventsPort',
    'FeedService',
    'FeedSources',
    'PlaceResolver',
    'VenueNames',
]
