from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol

from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, ValidationFailedError

from .models.domain import EngagementEvent, SavedItem
from .repository import EngagementRepository

MAX_EVENT_BATCH = 50


class ContentLookup(Protocol):
    def content_is_engageable(self, content_id: str) -> bool:
        """True when the content exists and is published."""
        ...


class EngagementService:
    def __init__(self, repository: EngagementRepository, content: ContentLookup) -> None:
        self._repository = repository
        self._content = content

    def save(self, user: AuthenticatedUser, content_id: str) -> None:
        self._ensure_engageable(content_id)
        self._repository.save(user.user_id, content_id)

    def unsave(self, user: AuthenticatedUser, content_id: str) -> None:
        self._repository.unsave(user.user_id, content_id)

    def like(self, user: AuthenticatedUser, content_id: str) -> None:
        self._ensure_engageable(content_id)
        self._repository.like(user.user_id, content_id)

    def unlike(self, user: AuthenticatedUser, content_id: str) -> None:
        self._repository.unlike(user.user_id, content_id)

    def list_saved(
        self, user: AuthenticatedUser, *, limit: int = 50, before: datetime | None = None
    ) -> list[SavedItem]:
        return self._repository.list_saved(user.user_id, limit=limit, before=before)

    def record_events(
        self, user: AuthenticatedUser | None, events: list[EngagementEvent]
    ) -> int:
        if not events:
            return 0
        if len(events) > MAX_EVENT_BATCH:
            raise ValidationFailedError(f'at most {MAX_EVENT_BATCH} events per batch')
        now = datetime.now(timezone.utc)
        stamped = [
            EngagementEvent(
                event_type=event.event_type,
                occurred_at=min(event.occurred_at, now),
                content_id=event.content_id,
                user_id=user.user_id if user is not None else None,
                metadata=event.metadata,
            )
            for event in events
        ]
        return self._repository.record_events(stamped)

    def _ensure_engageable(self, content_id: str) -> None:
        if not self._content.content_is_engageable(content_id):
            raise NotFoundError('content not found')
