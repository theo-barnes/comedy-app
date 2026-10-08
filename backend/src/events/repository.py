"""Persistence for events and their comedian lineup."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol

from sqlalchemy import delete, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, sessionmaker
from shared.errors import ConflictError

from .models.domain import Event, EventStatus
from .models.orm import EventComedianRow, EventRow, NativeEventSubmissionRow


class EventRepository(Protocol):
    """Reads and writes events and their comedian lineup."""

    def create(self, event: Event) -> Event: ...

    def get_submission(self, owner_id: str, key: str, payload_hash: str) -> Event | None: ...

    def create_idempotent(self, event: Event, key: str, payload_hash: str) -> Event: ...

    def poster_referenced(self, asset_id: str) -> bool: ...

    def swap_poster(
        self, event_id: str, owner_id: str, expected_revision: int,
        asset_id: str | None, url: str | None, width: int | None, height: int | None,
    ) -> None: ...

    def get(self, event_id: str) -> Event | None: ...

    def update_fields(self, event_id: str, fields: dict) -> None: ...

    def set_status(self, event_id: str, status: EventStatus) -> None: ...

    def add_comedian(self, event_id: str, comedian_id: str) -> bool: ...

    def remove_comedian(self, event_id: str, comedian_id: str) -> bool: ...

    def list_by_venue(
        self, venue_id: str, *, limit: int, from_time: datetime | None
    ) -> list[Event]: ...

    def list_nearby(
        self, lat: float, lng: float, *, radius_meters: int, from_time: datetime, limit: int
    ) -> list[Event]: ...


def _event_from_row(row: EventRow, comedian_ids: tuple[str, ...]) -> Event:
    return Event(
        id=row.id,
        venue_id=row.venue_id,
        title=row.title,
        start_time=row.start_time,
        status=EventStatus(row.status),
        description=row.description,
        end_time=row.end_time,
        place_id=row.place_id,
        latitude=row.latitude,
        longitude=row.longitude,
        h3_index=row.h3_index,
        ticket_url=row.ticket_url,
        comedian_ids=comedian_ids,
        created_at=row.created_at,
        poster_asset_id=row.poster_asset_id,
        poster_url=row.poster_url,
        poster_revision=row.poster_revision,
        poster_width=row.poster_width,
        poster_height=row.poster_height,
    )


class SqlEventRepository:
    """SQLAlchemy-backed EventRepository."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def create(self, event: Event) -> Event:
        return self._create(event)

    def get_submission(self, owner_id: str, key: str, payload_hash: str) -> Event | None:
        with self._session_factory() as session:
            return self._submission(session, owner_id, key, payload_hash)

    def _submission(
        self, session: Session, owner_id: str, key: str, payload_hash: str
    ) -> Event | None:
        submission = session.get(NativeEventSubmissionRow, (owner_id, key))
        if submission is None:
            return None
        if submission.payload_hash != payload_hash:
            raise ConflictError('Idempotency-Key was used with a different submission')
        row = session.get(EventRow, submission.event_id)
        assert row is not None
        return _event_from_row(row, self._comedians_for(session, row.id))

    def create_idempotent(self, event: Event, key: str, payload_hash: str) -> Event:
        return self._create(event, key, payload_hash)

    def _create(self, event: Event, key: str | None = None, payload_hash: str = '') -> Event:
        row = EventRow(
            venue_id=event.venue_id,
            title=event.title,
            description=event.description,
            start_time=event.start_time,
            end_time=event.end_time,
            place_id=event.place_id,
            latitude=event.latitude,
            longitude=event.longitude,
            h3_index=event.h3_index,
            center=(
                f'SRID=4326;POINT({event.longitude} {event.latitude})'
                if event.latitude is not None and event.longitude is not None
                else None
            ),
            ticket_url=event.ticket_url,
            status=event.status.value,
            poster_revision=0,
        )
        with self._session_factory() as session:
            if key is not None:
                session.execute(
                    text('SELECT pg_advisory_xact_lock(hashtextextended(:identity, 0))'),
                    {'identity': f'native-event:{event.venue_id}:{key}'},
                )
                previous = self._submission(session, event.venue_id, key, payload_hash)
                if previous is not None:
                    return previous
            session.add(row)
            session.flush()
            if key is not None:
                session.add(NativeEventSubmissionRow(
                    owner_id=event.venue_id, key=key, payload_hash=payload_hash, event_id=row.id,
                ))
            session.commit()
            session.refresh(row)
            return _event_from_row(row, ())

    def get(self, event_id: str) -> Event | None:
        with self._session_factory() as session:
            return self.get_in_session(session, event_id)

    def get_in_session(self, session: Session, event_id: str) -> Event | None:
        row = session.get(EventRow, event_id)
        if row is None:
            return None
        return _event_from_row(row, self._comedians_for(session, event_id))

    def poster_referenced(self, asset_id: str) -> bool:
        with self._session_factory() as session:
            return self.poster_referenced_in_session(session, asset_id)

    def poster_referenced_in_session(self, session: Session, asset_id: str) -> bool:
        return session.scalar(select(EventRow.id).where(
            EventRow.poster_asset_id == asset_id,
        ).limit(1)) is not None

    def swap_poster(
        self, event_id: str, owner_id: str, expected_revision: int,
        asset_id: str | None, url: str | None, width: int | None, height: int | None,
    ) -> None:
        with self._session_factory() as session:
            self.swap_poster_in_session(
                session, event_id, owner_id, expected_revision, asset_id, url, width, height,
            )
            session.commit()

    def swap_poster_in_session(
        self, session: Session, event_id: str, owner_id: str, expected_revision: int,
        asset_id: str | None, url: str | None, width: int | None, height: int | None,
    ) -> None:
        from images.models.orm import ImageAssetRow

        row = session.scalar(select(EventRow).where(
            EventRow.id == event_id, EventRow.venue_id == owner_id,
        ).with_for_update().execution_options(populate_existing=True))
        if row is None or row.poster_revision != expected_revision:
            raise ConflictError('poster changed; refresh the gig before retrying')
        previous = row.poster_asset_id
        row.poster_asset_id = asset_id
        row.poster_url = url
        row.poster_width = width
        row.poster_height = height
        row.poster_revision += 1
        if previous is not None and previous != asset_id:
            session.execute(update(ImageAssetRow).where(
                ImageAssetRow.id == previous,
            ).values(status='retired', touched_at=datetime.now(timezone.utc)))

    def update_fields(self, event_id: str, fields: dict) -> None:
        with self._session_factory() as session:
            row = session.get(EventRow, event_id)
            if row is None:
                return
            for key, value in fields.items():
                setattr(row, key, value)
            if 'latitude' in fields or 'longitude' in fields:
                if row.latitude is not None and row.longitude is not None:
                    row.center = f'SRID=4326;POINT({row.longitude} {row.latitude})'
                else:
                    row.center = None
            session.commit()

    def set_status(self, event_id: str, status: EventStatus) -> None:
        self.update_fields(event_id, {'status': status.value})

    def add_comedian(self, event_id: str, comedian_id: str) -> bool:
        stmt = (
            pg_insert(EventComedianRow)
            .values(event_id=event_id, comedian_id=comedian_id)
            .on_conflict_do_nothing()
        )
        with self._session_factory() as session:
            result = session.execute(stmt)
            session.commit()
            return bool(result.rowcount)

    def remove_comedian(self, event_id: str, comedian_id: str) -> bool:
        stmt = delete(EventComedianRow).where(
            EventComedianRow.event_id == event_id,
            EventComedianRow.comedian_id == comedian_id,
        )
        with self._session_factory() as session:
            result = session.execute(stmt)
            session.commit()
            return bool(result.rowcount)

    def list_by_venue(
        self, venue_id: str, *, limit: int, from_time: datetime | None
    ) -> list[Event]:
        stmt = (
            select(EventRow)
            .where(EventRow.venue_id == venue_id)
            .order_by(EventRow.start_time.asc())
            .limit(limit)
        )
        if from_time is not None:
            stmt = stmt.where(EventRow.start_time >= from_time)
        with self._session_factory() as session:
            rows = session.execute(stmt).scalars().all()
            return [
                _event_from_row(row, self._comedians_for(session, row.id)) for row in rows
            ]

    def list_nearby(
        self, lat: float, lng: float, *, radius_meters: int, from_time: datetime, limit: int
    ) -> list[Event]:
        query = text(
            """
            SELECT id FROM events
            WHERE status = 'scheduled'
              AND start_time >= :from_time
              AND center IS NOT NULL
              AND ST_DWithin(
                    center::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radius
                  )
            ORDER BY start_time ASC
            LIMIT :limit
            """
        )
        with self._session_factory() as session:
            ids = [
                r[0]
                for r in session.execute(
                    query,
                    {
                        'lat': lat,
                        'lng': lng,
                        'radius': radius_meters,
                        'from_time': from_time,
                        'limit': limit,
                    },
                )
            ]
            events: list[Event] = []
            for event_id in ids:
                row = session.get(EventRow, event_id)
                if row is not None:
                    events.append(_event_from_row(row, self._comedians_for(session, event_id)))
            return events

    @staticmethod
    def _comedians_for(session: Session, event_id: str) -> tuple[str, ...]:
        rows = session.execute(
            select(EventComedianRow.comedian_id).where(EventComedianRow.event_id == event_id)
        ).scalars()
        return tuple(rows)
