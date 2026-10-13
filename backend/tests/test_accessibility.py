from __future__ import annotations

from datetime import datetime, timezone

import pytest
import requests

from accessibility.elevenlabs import ElevenLabsSpeechSynthesisProvider
from accessibility.models.domain import Narration, NarrationResourceType
from accessibility.provider import SpeechSynthesisProviderError
from accessibility.service import NarrationService, NarrationUnavailableError
from creators.models.domain import CreatorPublic, CreatorType
from events.models.domain import Event, EventPublicationStatus, EventStatus
from shared.errors import NotFoundError


class FakeSpeechProvider:
    def __init__(self) -> None:
        self.texts: list[str] = []
        self.error: Exception | None = None

    def synthesize(self, text: str) -> Narration:
        self.texts.append(text)
        if self.error is not None:
            raise self.error
        return Narration(audio=b'mp3', content_type='audio/mpeg')


class FakeEventLookup:
    def __init__(self, event: Event | None) -> None:
        self.event = event

    def get_event(self, event_id: str) -> Event | None:
        return self.event


class FakeCreatorLookup:
    def __init__(self, creator: CreatorPublic | None) -> None:
        self.creator = creator

    def get_creator(self, creator_id: str) -> CreatorPublic | None:
        return self.creator


def _event(
    *,
    status: EventStatus = EventStatus.SCHEDULED,
    publication_status: EventPublicationStatus = EventPublicationStatus.PUBLISHED,
) -> Event:
    return Event(
        id='event-1',
        venue_id='venue-1',
        title='  Friday   Night Comedy ',
        description='  A  live  show. ',
        start_time=datetime(2026, 10, 16, 19, 30, tzinfo=timezone.utc),
        status=status,
        publication_status=publication_status,
    )


def _service(
    provider: FakeSpeechProvider,
    *,
    event: Event | None = None,
    creator: CreatorPublic | None = None,
    max_characters: int = 1200,
) -> NarrationService:
    return NarrationService(
        provider,
        FakeEventLookup(event),
        FakeCreatorLookup(creator),
        max_characters=max_characters,
    )


def test_published_scheduled_event_uses_server_built_summary() -> None:
    provider = FakeSpeechProvider()

    narration = _service(provider, event=_event()).narrate(NarrationResourceType.EVENT, 'event-1')

    assert narration.content_type == 'audio/mpeg'
    assert provider.texts == [
        'Event: Friday Night Comedy. Starts Friday, 16 October 2026 at 19:30 UTC. A live show.'
    ]


@pytest.mark.parametrize(
    'event',
    [
        _event(publication_status=EventPublicationStatus.DRAFT),
        _event(status=EventStatus.CANCELLED),
        None,
    ],
)
def test_non_public_event_does_not_reach_provider(event: Event | None) -> None:
    provider = FakeSpeechProvider()

    with pytest.raises(NotFoundError):
        _service(provider, event=event).narrate(NarrationResourceType.EVENT, 'event-1')

    assert provider.texts == []


def test_creator_summary_uses_allowlisted_public_fields() -> None:
    provider = FakeSpeechProvider()
    creator = CreatorPublic(
        user_id='creator-1',
        creator_type=CreatorType.COMEDIAN,
        name='  Ada  Jones ',
        bio='  Observational  comedy. ',
        genres=('  surreal ', ' musical  '),
    )

    _service(provider, creator=creator).narrate(NarrationResourceType.CREATOR, 'creator-1')

    assert provider.texts == [
        'Comedian: Ada Jones. Observational comedy. Genres: surreal, musical.'
    ]


def test_missing_creator_does_not_reach_provider() -> None:
    provider = FakeSpeechProvider()

    with pytest.raises(NotFoundError):
        _service(provider).narrate(NarrationResourceType.CREATOR, 'missing')

    assert provider.texts == []


def test_provider_failures_are_not_success_shaped() -> None:
    provider = FakeSpeechProvider()
    provider.error = SpeechSynthesisProviderError('provider timeout')

    with pytest.raises(NarrationUnavailableError) as error:
        _service(provider, event=_event()).narrate(NarrationResourceType.EVENT, 'event-1')

    assert error.value.status_code == 503
    assert error.value.code == 'narration_unavailable'


def test_elevenlabs_provider_sends_only_configured_request_and_records_metadata(monkeypatch) -> None:
    class FakeResponse:
        content = b'audio'
        headers = {
            'content-type': 'audio/mpeg',
            'request-id': 'request-1',
            'character-cost': '42',
        }

        def raise_for_status(self) -> None:
            return None

    sent: dict[str, object] = {}

    def fake_post(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
        sent['args'] = args
        sent['kwargs'] = kwargs
        return FakeResponse()

    monkeypatch.setattr(requests, 'post', fake_post)
    provider = ElevenLabsSpeechSynthesisProvider(
        api_key='secret',
        voice_id='voice-1',
        model_id='eleven_flash_v2_5',
    )

    narration = provider.synthesize('A permitted summary.')

    assert sent['args'] == ('https://api.elevenlabs.io/v1/text-to-speech/voice-1/stream',)
    assert sent['kwargs'] == {
        'params': {'output_format': 'mp3_44100_128'},
        'headers': {'xi-api-key': 'secret', 'Accept': 'audio/mpeg'},
        'json': {'text': 'A permitted summary.', 'model_id': 'eleven_flash_v2_5'},
        'timeout': (3.05, 20),
    }
    assert narration == Narration(
        audio=b'audio',
        content_type='audio/mpeg',
        provider_request_id='request-1',
        character_cost='42',
    )


def test_elevenlabs_provider_rejects_non_audio_response(monkeypatch) -> None:
    class FakeResponse:
        content = b'{"detail":"invalid"}'
        headers = {'content-type': 'application/json'}

        def raise_for_status(self) -> None:
            return None

    monkeypatch.setattr(requests, 'post', lambda *args, **kwargs: FakeResponse())
    provider = ElevenLabsSpeechSynthesisProvider(
        api_key='secret',
        voice_id='voice-1',
        model_id='eleven_flash_v2_5',
    )

    with pytest.raises(SpeechSynthesisProviderError, match='invalid audio response'):
        provider.synthesize('A permitted summary.')
