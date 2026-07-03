from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, PermissionDeniedError

from .models.domain import AudiencePlace, ContentStatsDaily, CreatorStatsDaily
from .repository import AnalyticsRepository


class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository) -> None:
        self._repository = repository

    def overview(
        self, user: AuthenticatedUser, *, days: int = 30
    ) -> tuple[list[ContentStatsDaily], list[CreatorStatsDaily]]:
        start, end = self._window(days)
        content_ids = self._repository.creator_content_ids(user.user_id)
        content_stats = self._repository.content_stats_range(content_ids, start, end)
        creator_stats = self._repository.creator_stats_range(user.user_id, start, end)
        return content_stats, creator_stats

    def content_stats(
        self, user: AuthenticatedUser, content_id: str, *, days: int = 30
    ) -> list[ContentStatsDaily]:
        owners = self._repository.content_creators([content_id])
        creator_id = owners.get(content_id)
        if creator_id is None:
            raise NotFoundError('content not found')
        if creator_id != user.user_id:
            raise PermissionDeniedError('not your content')
        start, end = self._window(days)
        return self._repository.content_stats_range([content_id], start, end)

    def audience(
        self, user: AuthenticatedUser, *, days: int = 30, limit: int = 10
    ) -> list[AudiencePlace]:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        return self._repository.top_places_for_creator(
            user.user_id, since=since, limit=limit
        )

    @staticmethod
    def _window(days: int) -> tuple[date, date]:
        today = datetime.now(timezone.utc).date()
        return today - timedelta(days=days - 1), today
