from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from .models.orm import ContentRow

if TYPE_CHECKING:
    from location.models.domain import DiscoveryRegion


class ContentInventoryProvider:
    """Counts published content per place for discovery region scoring."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def count_for_place(self, place_id: str) -> int:
        stmt = select(func.count()).where(
            ContentRow.place_id == place_id, ContentRow.status == 'published'
        )
        with self._session_factory() as session:
            return session.execute(stmt).scalar_one()

    def counts_for_regions(self, regions: list['DiscoveryRegion']) -> dict[str, int]:
        if not regions:
            return {}
        ids = [region.id for region in regions]
        stmt = (
            select(ContentRow.place_id, func.count())
            .where(ContentRow.place_id.in_(ids), ContentRow.status == 'published')
            .group_by(ContentRow.place_id)
        )
        with self._session_factory() as session:
            counts = dict(session.execute(stmt).all())
        return {region.id: counts.get(region.id, 0) for region in regions}
