"""ElevenLabs implementation of the speech-synthesis provider port."""

from __future__ import annotations

import requests

from shared.logging import get_logger

from .models.domain import Narration
from .provider import SpeechSynthesisProviderError

logger = get_logger(__name__)


class ElevenLabsSpeechSynthesisProvider:
    """Synthesizes a configured platform voice without retaining source text or audio."""

    name = 'elevenlabs'

    def __init__(self, *, api_key: str, voice_id: str, model_id: str) -> None:
        self._api_key = api_key
        self._voice_id = voice_id
        self._model_id = model_id

    def synthesize(self, text: str) -> Narration:
        try:
            response = requests.post(
                f'https://api.elevenlabs.io/v1/text-to-speech/{self._voice_id}/stream',
                params={'output_format': 'mp3_44100_128'},
                headers={'xi-api-key': self._api_key, 'Accept': 'audio/mpeg'},
                json={'text': text, 'model_id': self._model_id},
                timeout=(3.05, 20),
            )
            response.raise_for_status()
        except requests.Timeout as exc:
            raise SpeechSynthesisProviderError('speech provider timed out') from exc
        except requests.ConnectionError as exc:
            raise SpeechSynthesisProviderError('speech provider could not be reached') from exc
        except requests.HTTPError as exc:
            raise SpeechSynthesisProviderError('speech provider rejected the request') from exc
        except requests.RequestException as exc:
            raise SpeechSynthesisProviderError('speech provider request failed') from exc

        content_type = response.headers.get('content-type', '').split(';', 1)[0].lower()
        if content_type != 'audio/mpeg' or not response.content:
            raise SpeechSynthesisProviderError('speech provider returned an invalid audio response')

        request_id = response.headers.get('request-id')
        character_cost = response.headers.get('character-cost')
        logger.info(
            'speech_synthesis_completed',
            provider=self.name,
            provider_request_id=request_id,
            character_cost=character_cost,
        )
        return Narration(
            audio=response.content,
            content_type=content_type,
            provider_request_id=request_id,
            character_cost=character_cost,
        )
