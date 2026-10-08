"""Image-owned ports, including event operations bound to the current transaction."""

from dataclasses import dataclass
from typing import Protocol

from .models.domain import ImageAsset


@dataclass(frozen=True)
class PosterEvent:
    id: str
    owner_id: str
    asset_id: str | None
    revision: int


class PosterEvents(Protocol):
    def get(self, event_id: str) -> PosterEvent | None: ...
    def referenced(self, asset_id: str) -> bool: ...
    def swap(
        self, event_id: str, owner_id: str, expected_revision: int,
        asset: ImageAsset | None, url: str | None,
    ) -> None: ...


@dataclass
class ImageTransaction:
    asset: ImageAsset | None
    events: PosterEvents
