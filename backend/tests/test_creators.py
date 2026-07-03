from __future__ import annotations

import pytest

from creators.models.domain import ComedianProfile, CreatorPublic, CreatorType, VenueProfile
from creators.service import CreatorService
from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, PermissionDeniedError, ValidationFailedError


class FakeCreatorRepository:
    def __init__(self) -> None:
        self.comedians: dict[str, ComedianProfile] = {}
        self.venues: dict[str, VenueProfile] = {}

    def get_comedian(self, user_id: str) -> ComedianProfile | None:
        return self.comedians.get(user_id)

    def upsert_comedian(self, profile: ComedianProfile) -> ComedianProfile:
        self.comedians[profile.user_id] = profile
        return profile

    def get_venue(self, user_id: str) -> VenueProfile | None:
        return self.venues.get(user_id)

    def upsert_venue(self, profile: VenueProfile) -> VenueProfile:
        self.venues[profile.user_id] = profile
        return profile

    def get_creator(self, user_id: str) -> CreatorPublic | None:
        comedian = self.comedians.get(user_id)
        if comedian:
            return CreatorPublic.from_comedian(comedian)
        venue = self.venues.get(user_id)
        if venue:
            return CreatorPublic.from_venue(venue)
        return None


def _user(role: str | None, user_id: str = 'u1') -> AuthenticatedUser:
    return AuthenticatedUser(user_id=user_id, email=None, role=role)


@pytest.fixture()
def repo() -> FakeCreatorRepository:
    return FakeCreatorRepository()


@pytest.fixture()
def service(repo: FakeCreatorRepository) -> CreatorService:
    return CreatorService(repository=repo)


def test_comedian_update_me_creates_profile(service: CreatorService) -> None:
    creator = service.update_me(
        _user('comedian'), name='Jo King', bio='puns', genres=('observational',)
    )
    assert creator.creator_type is CreatorType.COMEDIAN
    assert creator.name == 'Jo King'
    assert creator.genres == ('observational',)


def test_venue_update_me_creates_profile(service: CreatorService) -> None:
    creator = service.update_me(
        _user('venue'),
        name='The Cellar',
        address='1 Comedy St',
        capacity=120,
        latitude=51.5,
        longitude=-0.1,
    )
    assert creator.creator_type is CreatorType.VENUE
    assert creator.address == '1 Comedy St'
    assert creator.capacity == 120


def test_fan_cannot_create_creator_profile(service: CreatorService) -> None:
    with pytest.raises(PermissionDeniedError):
        service.update_me(_user('fan'), name='Nope')


def test_venue_partial_coordinates_rejected(service: CreatorService) -> None:
    with pytest.raises(ValidationFailedError):
        service.update_me(_user('venue'), name='The Cellar', latitude=51.5)


def test_get_me_missing_profile_raises(service: CreatorService) -> None:
    with pytest.raises(NotFoundError):
        service.get_me(_user('comedian'))


def test_get_public_returns_either_type(
    service: CreatorService, repo: FakeCreatorRepository
) -> None:
    service.update_me(_user('comedian', 'c1'), name='Jo King')
    service.update_me(_user('venue', 'v1'), name='The Cellar')
    assert service.get_public('c1').creator_type is CreatorType.COMEDIAN
    assert service.get_public('v1').creator_type is CreatorType.VENUE


def test_get_public_unknown_raises(service: CreatorService) -> None:
    with pytest.raises(NotFoundError):
        service.get_public('missing')
