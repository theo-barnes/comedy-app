from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, ValidationFailedError
from social.models.domain import Follow, Report, ReportTargetType
from social.service import SocialService


class FakeSocialRepository:
    def __init__(self) -> None:
        self.follows: set[tuple[str, str]] = set()
        self.blocks: set[tuple[str, str]] = set()
        self.reports: list[Report] = []

    def add_follow(self, follower_id: str, creator_id: str) -> bool:
        pair = (follower_id, creator_id)
        if pair in self.follows:
            return False
        self.follows.add(pair)
        return True

    def remove_follow(self, follower_id: str, creator_id: str) -> bool:
        pair = (follower_id, creator_id)
        if pair not in self.follows:
            return False
        self.follows.remove(pair)
        return True

    def list_following(self, follower_id: str, *, limit: int, before) -> list[Follow]:  # noqa: ANN001
        return [
            Follow(follower_id=f, creator_id=c, created_at=datetime.now(timezone.utc))
            for (f, c) in sorted(self.follows)
            if f == follower_id
        ][:limit]

    def count_followers(self, creator_id: str) -> int:
        return sum(1 for (_, c) in self.follows if c == creator_id)

    def add_block(self, blocker_id: str, blocked_id: str) -> bool:
        self.blocks.add((blocker_id, blocked_id))
        return True

    def remove_block(self, blocker_id: str, blocked_id: str) -> bool:
        self.blocks.discard((blocker_id, blocked_id))
        return True

    def list_blocked_ids(self, blocker_id: str) -> list[str]:
        return [b for (a, b) in sorted(self.blocks) if a == blocker_id]

    def create_report(
        self,
        reporter_id: str,
        target_type: ReportTargetType,
        target_id: str,
        reason: str,
        details: str | None,
    ) -> Report:
        report = Report(
            id=str(uuid4()),
            reporter_id=reporter_id,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
            details=details,
            status='open',
            created_at=datetime.now(timezone.utc),
        )
        self.reports.append(report)
        return report


class FakeCreatorLookup:
    def __init__(self, existing: set[str] | None = None) -> None:
        self.existing = existing or set()

    def creator_exists(self, creator_id: str) -> bool:
        return creator_id in self.existing


def _user(user_id: str = 'u1') -> AuthenticatedUser:
    return AuthenticatedUser(user_id=user_id, email=None, role='fan')


@pytest.fixture()
def repo() -> FakeSocialRepository:
    return FakeSocialRepository()


def _service(repo: FakeSocialRepository, creators: set[str] | None = None) -> SocialService:
    return SocialService(repository=repo, creators=FakeCreatorLookup(creators or {'c1'}))


def test_follow_existing_creator(repo: FakeSocialRepository) -> None:
    service = _service(repo)
    service.follow(_user(), 'c1')
    assert ('u1', 'c1') in repo.follows


def test_follow_unknown_creator_raises(repo: FakeSocialRepository) -> None:
    service = _service(repo)
    with pytest.raises(NotFoundError):
        service.follow(_user(), 'missing')


def test_follow_self_raises(repo: FakeSocialRepository) -> None:
    service = _service(repo, creators={'u1'})
    with pytest.raises(ValidationFailedError):
        service.follow(_user(), 'u1')


def test_follow_is_idempotent(repo: FakeSocialRepository) -> None:
    service = _service(repo)
    service.follow(_user(), 'c1')
    service.follow(_user(), 'c1')
    assert len(repo.follows) == 1


def test_unfollow(repo: FakeSocialRepository) -> None:
    service = _service(repo)
    service.follow(_user(), 'c1')
    service.unfollow(_user(), 'c1')
    assert repo.follows == set()


def test_list_following_scoped_to_user(repo: FakeSocialRepository) -> None:
    service = _service(repo, creators={'c1', 'c2'})
    service.follow(_user('u1'), 'c1')
    service.follow(_user('u2'), 'c2')
    follows = service.list_following(_user('u1'))
    assert [f.creator_id for f in follows] == ['c1']


def test_block_severs_follows_both_ways(repo: FakeSocialRepository) -> None:
    service = _service(repo, creators={'c1', 'u1'})
    service.follow(_user('u1'), 'c1')
    service.follow(_user('c1'), 'u1')
    service.block(_user('u1'), 'c1')
    assert repo.follows == set()
    assert ('u1', 'c1') in repo.blocks


def test_block_self_raises(repo: FakeSocialRepository) -> None:
    service = _service(repo)
    with pytest.raises(ValidationFailedError):
        service.block(_user(), 'u1')


def test_unblock(repo: FakeSocialRepository) -> None:
    service = _service(repo)
    service.block(_user(), 'c1')
    service.unblock(_user(), 'c1')
    assert service.list_blocked(_user()) == []


def test_report_created_open(repo: FakeSocialRepository) -> None:
    service = _service(repo)
    report = service.report(
        _user(),
        target_type=ReportTargetType.CONTENT,
        target_id='content-1',
        reason='inappropriate',
        details=None,
    )
    assert report.status == 'open'
    assert repo.reports[0].target_type is ReportTargetType.CONTENT
