"""Business rules for safe, on-demand narration of public resources."""

from __future__ import annotations

import re
from typing import Protocol

from creators.models.domain import CreatorPublic
from events.models.domain import Event, EventPublicationStatus, EventStatus
from shared.errors import DomainError, NotFoundError

from .models.domain import Narration, NarrationResourceType
from .provider import SpeechSynthesisProvider, SpeechSynthesisProviderError


class NarrationUnavailableError(DomainError):
    status_code = 503
    code = 'narration_unavailable'


class EventNarrationLookup(Protocol):
    """The public event data required to build an allowed narration summary."""

    def get_event(self, event_id: str) -> Event | None: ...


class CreatorNarrationLookup(Protocol):
    """The public creator data required to build an allowed narration summary."""

    def get_creator(self, creator_id: str) -> CreatorPublic | None: ...


class NarrationService:
    """Builds bounded public summaries and delegates speech generation to a provider."""

    def __init__(
        self,
        provider: SpeechSynthesisProvider,
        events: EventNarrationLookup,
        creators: CreatorNarrationLookup,
        *,
        max_characters: int,
    ) -> None:
        self._provider = provider
        self._events = events
        self._creators = creators
        self._max_characters = max_characters

    def narrate(self, resource_type: NarrationResourceType, resource_id: str) -> Narration:
        text = (
            self._event_summary(resource_id)
            if resource_type is NarrationResourceType.EVENT
            else self._creator_summary(resource_id)
        )
        if len(text) > self._max_characters:
            text = text[:self._max_characters].rsplit(' ', 1)[0].rstrip() + '.'
        try:
            return self._provider.synthesize(text)
        except SpeechSynthesisProviderError as exc:
            raise NarrationUnavailableError('narration is temporarily unavailable') from exc

    def _event_summary(self, event_id: str) -> str:
        event = self._events.get_event(event_id)
        if (
            event is None
            or event.publication_status is not EventPublicationStatus.PUBLISHED
            or event.status is not EventStatus.SCHEDULED
        ):
            raise NotFoundError('event not found')

        parts = [
            f'Event: {self._clean(event.title)}.',
            f'Starts {event.start_time.strftime("%A, %d %B %Y at %H:%M %Z")}.',
        ]
        if event.description:
            parts.append(self._clean(event.description))
        return ' '.join(parts)

    def _creator_summary(self, creator_id: str) -> str:
        creator = self._creators.get_creator(creator_id)
        if creator is None:
            raise NotFoundError('creator not found')

        parts = [f'{creator.creator_type.value.title()}: {self._clean(creator.name)}.']
        if creator.bio:
            parts.append(self._clean(creator.bio))
        if creator.genres:
            parts.append(f'Genres: {", ".join(self._clean(genre) for genre in creator.genres)}.')
        return ' '.join(parts)

    @staticmethod
    def _clean(value: str) -> str:
        return re.sub(r'\s+', ' ', value).strip()
