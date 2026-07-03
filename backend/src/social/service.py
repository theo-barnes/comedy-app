from __future__ import annotations

from datetime import datetime
from typing import Protocol

from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, ValidationFailedError

from .models.domain import Follow, Report, ReportTargetType
from .repository import SocialRepository


class CreatorLookup(Protocol):
    """Minimal view of the creators module needed for follow validation."""

    def creator_exists(self, creator_id: str) -> bool: ...


class SocialService:
    def __init__(self, repository: SocialRepository, creators: CreatorLookup) -> None:
        self._repository = repository
        self._creators = creators

    def follow(self, user: AuthenticatedUser, creator_id: str) -> None:
        if creator_id == user.user_id:
            raise ValidationFailedError('cannot follow yourself')
        if not self._creators.creator_exists(creator_id):
            raise NotFoundError('creator not found')
        self._repository.add_follow(user.user_id, creator_id)

    def unfollow(self, user: AuthenticatedUser, creator_id: str) -> None:
        self._repository.remove_follow(user.user_id, creator_id)

    def list_following(
        self, user: AuthenticatedUser, *, limit: int = 50, before: datetime | None = None
    ) -> list[Follow]:
        return self._repository.list_following(user.user_id, limit=limit, before=before)

    def block(self, user: AuthenticatedUser, blocked_id: str) -> None:
        if blocked_id == user.user_id:
            raise ValidationFailedError('cannot block yourself')
        self._repository.add_block(user.user_id, blocked_id)
        # A block also severs any follow relationship in both directions.
        self._repository.remove_follow(user.user_id, blocked_id)
        self._repository.remove_follow(blocked_id, user.user_id)

    def unblock(self, user: AuthenticatedUser, blocked_id: str) -> None:
        self._repository.remove_block(user.user_id, blocked_id)

    def list_blocked(self, user: AuthenticatedUser) -> list[str]:
        return self._repository.list_blocked_ids(user.user_id)

    def report(
        self,
        user: AuthenticatedUser,
        *,
        target_type: ReportTargetType,
        target_id: str,
        reason: str,
        details: str | None = None,
    ) -> Report:
        return self._repository.create_report(
            reporter_id=user.user_id,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
            details=details,
        )
