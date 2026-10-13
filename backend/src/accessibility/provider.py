"""Provider boundary for speech synthesis."""

from __future__ import annotations

from typing import Protocol

from .models.domain import Narration


class SpeechSynthesisProviderError(Exception):
    """Raised when a configured upstream provider cannot synthesize speech."""


class SpeechSynthesisProvider(Protocol):
    """Generates ephemeral speech from a bounded, server-built summary."""

    def synthesize(self, text: str) -> Narration: ...
