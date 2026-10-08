from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from creators.controller import get_my_creator_profile, update_my_creator_profile
from creators.models.domain import ComedianProfile, CreatorPublic, CreatorType, VenueProfile
from creators.models.orm import VenueProfileRow
from creators.repository import SqlCreatorRepository
from creators.schemas import CreatorPublicSchema, UpdateCreatorProfileRequest
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


def test_venue_coordinate_profile_request_response_roundtrip(service: CreatorService) -> None:
    body = UpdateCreatorProfileRequest(
        name='The Cellar', bio='Independent comedy', genres=[], address='1 Comedy St',
        capacity=120, latitude=51.5, longitude=-0.1,
    )
    response = update_my_creator_profile(body, _user('venue'), service)
    assert get_my_creator_profile(_user('venue'), service) == response
    assert CreatorPublicSchema.model_validate_json(response.model_dump_json()) == response
    assert response.model_dump() == {
        'id': 'u1', 'creatorType': 'venue', 'name': 'The Cellar',
        'bio': 'Independent comedy', 'genres': [], 'address': '1 Comedy St',
        'capacity': 120, 'verified': True, 'latitude': 51.5, 'longitude': -0.1,
    }
    updated = update_my_creator_profile(
        body.model_copy(update={'address': '2 Comedy St', 'latitude': 52.0, 'longitude': 0.0}),
        _user('venue'), service,
    )
    assert updated.bio == response.bio
    assert updated.capacity == response.capacity
    assert updated.genres == response.genres
    assert updated.verified == response.verified
    assert (updated.latitude, updated.longitude) == (52.0, 0.0)
    assert get_my_creator_profile(_user('venue'), service) == updated


def test_comedian_coordinates_are_not_exposed(service: CreatorService) -> None:
    body = UpdateCreatorProfileRequest(
        name='Jo King', bio='puns', genres=['observational'], latitude=51.5, longitude=-0.1,
    )
    response = update_my_creator_profile(body, _user('comedian'), service)
    assert response.latitude is None and response.longitude is None
    assert response.bio == 'puns'
    assert response.genres == ['observational']
    assert get_my_creator_profile(_user('comedian'), service) == response


def test_venue_coordinate_addition_preserves_nullable_unconfigured_profile() -> None:
    creator = CreatorPublic.from_venue(
        VenueProfile(user_id='venue', venue_name='The Cellar', verified=False),
    )
    response = CreatorPublicSchema.from_domain(creator)
    assert response.latitude is None and response.longitude is None
    assert response.verified is False


def test_stored_venue_update_preserves_server_managed_verification() -> None:
    session_factory = MagicMock()
    session = session_factory.return_value.__enter__.return_value
    session.get.return_value = VenueProfileRow(
        user_id='venue', venue_name='The Cellar', bio='Independent comedy',
        address='1 Comedy St', capacity=120, latitude=51.5, longitude=-0.1,
        verified=False,
    )
    repository = SqlCreatorRepository(session_factory)
    response = CreatorPublicSchema.from_domain(CreatorService(repository).update_me(
        _user('venue', 'venue'), name='The Cellar', bio='Independent comedy',
        address='1 Comedy St', capacity=120, latitude=51.5, longitude=-0.1,
    ))
    statement = session.execute.call_args.args[0]
    # The database's stored verification must not be overwritten by a profile setup.
    assert 'verified' not in str(statement).split('ON CONFLICT')[1]
    assert response.verified is False
    assert response.bio == 'Independent comedy'
    assert response.capacity == 120
    assert (response.latitude, response.longitude) == (51.5, -0.1)
    session.commit.assert_called_once()
