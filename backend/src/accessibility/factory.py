"""Wires narration provider and narrow read adapters."""

from __future__ import annotations

from functools import lru_cache

from .models.domain import Narration
from .provider import SpeechSynthesisProvider, SpeechSynthesisProviderError
from .service import CreatorNarrationLookup, EventNarrationLookup, NarrationService


class UnavailableSpeechSynthesisProvider:
    """Fails explicitly until narration has valid backend-only configuration."""

    def synthesize(self, text: str) -> Narration:
        raise SpeechSynthesisProviderError('speech provider is not configured')


class RepositoryEventNarrationLookup:
    """Adapts the events repository to the narration service's narrow read port."""

    def __init__(self, events_repository) -> None:  # noqa: ANN001
        self._events = events_repository

    def get_event(self, event_id: str):  # noqa: ANN201
        return self._events.get(event_id)


class RepositoryCreatorNarrationLookup:
    """Adapts the creators repository to the narration service's narrow read port."""

    def __init__(self, creators_repository) -> None:  # noqa: ANN001
        self._creators = creators_repository

    def get_creator(self, creator_id: str):  # noqa: ANN201
        return self._creators.get_creator(creator_id)


def build_provider() -> SpeechSynthesisProvider:
    from shared.config import settings

    if not settings.elevenlabs_enabled or not settings.elevenlabs_api_key or not settings.elevenlabs_voice_id:
        return UnavailableSpeechSynthesisProvider()

    from .elevenlabs import ElevenLabsSpeechSynthesisProvider

    return ElevenLabsSpeechSynthesisProvider(
        api_key=settings.elevenlabs_api_key,
        voice_id=settings.elevenlabs_voice_id,
        model_id=settings.elevenlabs_model_id,
    )


@lru_cache(maxsize=1)
def get_service() -> NarrationService:
    from creators.factory import build_repository as build_creators_repository
    from events.factory import build_repository as build_events_repository
    from shared.config import settings

    events: EventNarrationLookup = RepositoryEventNarrationLookup(build_events_repository())
    creators: CreatorNarrationLookup = RepositoryCreatorNarrationLookup(build_creators_repository())
    return NarrationService(
        provider=build_provider(),
        events=events,
        creators=creators,
        max_characters=settings.elevenlabs_max_narration_characters,
    )
