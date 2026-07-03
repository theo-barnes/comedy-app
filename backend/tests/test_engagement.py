from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from engagement.models.domain import EngagementEvent, EngagementEventType, SavedItem
from engagement.service import EngagementService
from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, ValidationFailedError


class FakeEngagementRepository:
    def __init__(self) -> None:
        self.saves: dict[tuple[str, str], datetime] = {}
        self.likes: dict[tuple[str, str], datetime] = {}
        self.events: list[EngagementEvent] = []
        self.content_titles: dict[str, str] = {}

    def save(self, user_id: str, content_id: str) -> bool:
        key = (user_id, content_id)
        if key in self.saves:
            return False
        self.saves[key] = datetime.now(timezone.utc)
        return True

    def unsave(self, user_id: str, content_id: str) -> bool:
        return self.saves.pop((user_id, content_id), None) is not None

    def like(self, user_id: str, content_id: str) -> bool:
        key = (user_id, content_id)
        if key in self.likes:
            return False
        self.likes[key] = datetime.now(timezone.utc)
        return True

    def unlike(self, user_id: str, content_id: str) -> bool:
        return self.likes.pop((user_id, content_id), None) is not None

    def list_saved(self, user_id: str, *, limit: int, before) -> list[SavedItem]:  # noqa: ANN001
        items = [
            SavedItem(
                content_id=content_id,
                saved_at=saved_at,
                title=self.content_titles.get(content_id, 'untitled'),
                content_type='video_clip',
                creator_id='creator-1',
            )
            for (uid, content_id), saved_at in self.saves.items()
            if uid == user_id and (before is None or saved_at < before)
        ]
        return sorted(items, key=lambda i: i.saved_at, reverse=True)[:limit]

    def counts_for(self, content_id: str) -> tuple[int, int]:
        likes = sum(1 for (_, cid) in self.likes if cid == content_id)
        saves = sum(1 for (_, cid) in self.saves if cid == content_id)
        return likes, saves

    def viewer_state(self, user_id: str, content_id: str) -> tuple[bool, bool]:
        return (user_id, content_id) in self.likes, (user_id, content_id) in self.saves

    def record_events(self, events: list[EngagementEvent]) -> int:
        self.events.extend(events)
        return len(events)


class FakeContentLookup:
    def __init__(self, engageable: set[str]) -> None:
        self.engageable = engageable

    def content_is_engageable(self, content_id: str) -> bool:
        return content_id in self.engageable


def _user(user_id: str = 'user-1') -> AuthenticatedUser:
    return AuthenticatedUser(user_id=user_id, email=None, role='fan')


@pytest.fixture()
def repo() -> FakeEngagementRepository:
    return FakeEngagementRepository()


@pytest.fixture()
def service(repo: FakeEngagementRepository) -> EngagementService:
    return EngagementService(
        repository=repo, content=FakeContentLookup({'content-1', 'content-2'})
    )


def test_save_and_list(service: EngagementService, repo: FakeEngagementRepository) -> None:
    repo.content_titles['content-1'] = 'Tight Five'
    service.save(_user(), 'content-1')
    saved = service.list_saved(_user())
    assert len(saved) == 1
    assert saved[0].content_id == 'content-1'
    assert saved[0].title == 'Tight Five'


def test_save_unknown_content_rejected(service: EngagementService) -> None:
    with pytest.raises(NotFoundError):
        service.save(_user(), 'ghost-content')


def test_save_idempotent(service: EngagementService, repo: FakeEngagementRepository) -> None:
    service.save(_user(), 'content-1')
    service.save(_user(), 'content-1')
    assert len(repo.saves) == 1


def test_unsave(service: EngagementService, repo: FakeEngagementRepository) -> None:
    service.save(_user(), 'content-1')
    service.unsave(_user(), 'content-1')
    assert repo.saves == {}


def test_like_unlike_counts(service: EngagementService, repo: FakeEngagementRepository) -> None:
    service.like(_user('a'), 'content-1')
    service.like(_user('b'), 'content-1')
    service.unlike(_user('a'), 'content-1')
    likes, saves = repo.counts_for('content-1')
    assert (likes, saves) == (1, 0)


def test_record_events_stamps_user_and_clamps_future(
    service: EngagementService, repo: FakeEngagementRepository
) -> None:
    future = datetime.now(timezone.utc) + timedelta(hours=2)
    accepted = service.record_events(
        _user(),
        [
            EngagementEvent(
                event_type=EngagementEventType.VIDEO_VIEWED,
                occurred_at=future,
                content_id='content-1',
            )
        ],
    )
    assert accepted == 1
    stored = repo.events[0]
    assert stored.user_id == 'user-1'
    assert stored.occurred_at <= datetime.now(timezone.utc)


def test_record_events_batch_limit(service: EngagementService) -> None:
    now = datetime.now(timezone.utc)
    events = [
        EngagementEvent(event_type=EngagementEventType.VIDEO_VIEWED, occurred_at=now)
        for _ in range(51)
    ]
    with pytest.raises(ValidationFailedError):
        service.record_events(_user(), events)


def test_record_empty_batch(service: EngagementService) -> None:
    assert service.record_events(_user(), []) == 0
