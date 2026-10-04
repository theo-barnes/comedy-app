from __future__ import annotations

import pytest

from profiles.models.domain import PublicProfile
from profiles.repository import SqlPublicProfileRepository, _public_profile_from_row
from profiles.schemas import PublicProfileSchema
from profiles.service import PublicProfileService
from shared.errors import NotFoundError


class FakePublicProfileRepository:
    def __init__(self) -> None:
        self.profiles: dict[str, PublicProfile] = {}

    def get_public_profile(self, user_id: str) -> PublicProfile | None:
        return self.profiles.get(user_id)


class FakeResult:
    def __init__(self, row: tuple[str, str | None] | None) -> None:
        self._row = row

    def first(self) -> tuple[str, str | None] | None:
        return self._row


class FakeSession:
    def __init__(self, row: tuple[str, str | None] | None) -> None:
        self._row = row
        self.statement = None
        self.params = None

    def __enter__(self) -> 'FakeSession':
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def execute(self, statement, params):  # noqa: ANN001, ANN201
        self.statement = statement
        self.params = params
        return FakeResult(self._row)


@pytest.fixture()
def repository() -> FakePublicProfileRepository:
    return FakePublicProfileRepository()


@pytest.fixture()
def service(repository: FakePublicProfileRepository) -> PublicProfileService:
    return PublicProfileService(repository)


def test_public_profile_schema_only_exposes_account_identity() -> None:
    profile = PublicProfile(user_id='user-1', display_name='Jo King')

    assert PublicProfileSchema.from_domain(profile).model_dump() == {
        'id': 'user-1',
        'displayName': 'Jo King',
    }


def test_public_profile_service_is_role_independent(
    service: PublicProfileService, repository: FakePublicProfileRepository
) -> None:
    repository.profiles['creator-1'] = PublicProfile(user_id='creator-1', display_name='Jo King')

    assert service.get_public_profile('creator-1').display_name == 'Jo King'


def test_public_profile_service_rejects_missing_accounts(service: PublicProfileService) -> None:
    with pytest.raises(NotFoundError):
        service.get_public_profile('missing')


def test_public_profile_row_normalizes_blank_display_name() -> None:
    assert _public_profile_from_row(('creator-1', '  ')) == PublicProfile(
        user_id='creator-1', display_name='Creator'
    )


def test_public_profile_row_keeps_only_allowlisted_columns() -> None:
    profile = _public_profile_from_row(('creator-1', 'Jo King'))

    assert profile == PublicProfile(user_id='creator-1', display_name='Jo King')


def test_repository_reads_only_the_allowlisted_fields_with_bound_user_id() -> None:
    session = FakeSession(('creator-1', 'Jo King'))
    repository = SqlPublicProfileRepository(lambda: session)  # type: ignore[arg-type]

    assert repository.get_public_profile('creator-1') == PublicProfile(
        user_id='creator-1', display_name='Jo King'
    )
    assert str(session.statement) == (
        'SELECT id::text, display_name FROM public.profiles WHERE id = CAST(:user_id AS uuid)'
    )
    assert session.params == {'user_id': 'creator-1'}