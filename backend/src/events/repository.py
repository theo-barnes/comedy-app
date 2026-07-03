from __future__ import annotations

from datetime import datetime
from typing import Protocol

from sqlalchemy import delete, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, sessionmaker

from .models.domain import Event, EventStatus
from .models.orm import EventComedianRow, EventRow


class EventRepository(Protocol):
    def create(self, event: Event) -> Event: ...

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
    )


class SqlEventRepository:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def create(self, event: Event) -> Event:
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
        )
        with self._session_factory() as session:
            session.add(row)
            session.commit()
            session.refresh(row)
            return _event_from_row(row, ())

    def get(self, event_id: str) -> Event | None:
        with self._session_factory() as session:
            row = session.get(EventRow, event_id)
            if row is None:
                return None
            return _event_from_row(row, self._comedians_for(session, event_id))

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
