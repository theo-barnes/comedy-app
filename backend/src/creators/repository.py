from __future__ import annotations

from typing import Protocol

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, sessionmaker

from .models.domain import ComedianProfile, CreatorPublic, VenueProfile
from .models.orm import ComedianProfileRow, VenueProfileRow


class CreatorRepository(Protocol):
    def get_comedian(self, user_id: str) -> ComedianProfile | None: ...

    def upsert_comedian(self, profile: ComedianProfile) -> ComedianProfile: ...

    def get_venue(self, user_id: str) -> VenueProfile | None: ...

    def upsert_venue(self, profile: VenueProfile) -> VenueProfile: ...

    def get_creator(self, user_id: str) -> CreatorPublic | None: ...


def _comedian_from_row(row: ComedianProfileRow) -> ComedianProfile:
    return ComedianProfile(
        user_id=row.user_id,
        stage_name=row.stage_name,
        bio=row.bio,
        genres=tuple(row.genres or ()),
        verified=row.verified,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _venue_from_row(row: VenueProfileRow) -> VenueProfile:
    return VenueProfile(
        user_id=row.user_id,
        venue_name=row.venue_name,
        bio=row.bio,
        address=row.address,
        capacity=row.capacity,
        place_id=row.place_id,
        latitude=row.latitude,
        longitude=row.longitude,
        verified=row.verified,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class SqlCreatorRepository:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def get_comedian(self, user_id: str) -> ComedianProfile | None:
        with self._session_factory() as session:
            row = session.get(ComedianProfileRow, user_id)
            return _comedian_from_row(row) if row else None

    def upsert_comedian(self, profile: ComedianProfile) -> ComedianProfile:
        values = {
            'user_id': profile.user_id,
            'stage_name': profile.stage_name,
            'bio': profile.bio,
            'genres': list(profile.genres),
        }
        stmt = (
            pg_insert(ComedianProfileRow)
            .values(**values)
            .on_conflict_do_update(
                index_elements=['user_id'],
                set_={k: v for k, v in values.items() if k != 'user_id'},
            )
        )
        with self._session_factory() as session:
            session.execute(stmt)
            session.commit()
            row = session.get(ComedianProfileRow, profile.user_id)
            assert row is not None
            return _comedian_from_row(row)

    def get_venue(self, user_id: str) -> VenueProfile | None:
        with self._session_factory() as session:
            row = session.get(VenueProfileRow, user_id)
            return _venue_from_row(row) if row else None

    def upsert_venue(self, profile: VenueProfile) -> VenueProfile:
        values = {
            'user_id': profile.user_id,
            'venue_name': profile.venue_name,
            'bio': profile.bio,
            'address': profile.address,
            'capacity': profile.capacity,
            'place_id': profile.place_id,
            'latitude': profile.latitude,
            'longitude': profile.longitude,
        }
        stmt = (
            pg_insert(VenueProfileRow)
            .values(**values)
            .on_conflict_do_update(
                index_elements=['user_id'],
                set_={k: v for k, v in values.items() if k != 'user_id'},
            )
        )
        with self._session_factory() as session:
            session.execute(stmt)
            session.commit()
            row = session.get(VenueProfileRow, profile.user_id)
            assert row is not None
            return _venue_from_row(row)

    def get_creator(self, user_id: str) -> CreatorPublic | None:
        comedian = self.get_comedian(user_id)
        if comedian is not None:
            return CreatorPublic.from_comedian(comedian)
        venue = self.get_venue(user_id)
        if venue is not None:
            return CreatorPublic.from_venue(venue)
        return None
