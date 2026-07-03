from __future__ import annotations

import hashlib
import hmac
import time

import pytest

from media.cloudflare import CloudflareStreamProvider
from media.provider import MediaProviderError

SECRET = 'whsec_test'


@pytest.fixture()
def provider() -> CloudflareStreamProvider:
    return CloudflareStreamProvider(
        account_id='acc', api_token='token', webhook_secret=SECRET
    )


def _sign(body: bytes, secret: str = SECRET, timestamp: int | None = None) -> str:
    ts = timestamp if timestamp is not None else int(time.time())
    sig = hmac.new(secret.encode(), f'{ts}.'.encode() + body, hashlib.sha256).hexdigest()
    return f'time={ts},sig1={sig}'


def test_valid_signature_accepted(provider: CloudflareStreamProvider) -> None:
    body = b'{"uid":"abc"}'
    assert provider.verify_webhook(body, _sign(body)) is True


def test_tampered_body_rejected(provider: CloudflareStreamProvider) -> None:
    header = _sign(b'{"uid":"abc"}')
    assert provider.verify_webhook(b'{"uid":"evil"}', header) is False


def test_wrong_secret_rejected(provider: CloudflareStreamProvider) -> None:
    body = b'{}'
    assert provider.verify_webhook(body, _sign(body, secret='other')) is False


def test_missing_header_rejected(provider: CloudflareStreamProvider) -> None:
    assert provider.verify_webhook(b'{}', None) is False


def test_malformed_header_rejected(provider: CloudflareStreamProvider) -> None:
    assert provider.verify_webhook(b'{}', 'garbage') is False


def test_stale_timestamp_rejected(provider: CloudflareStreamProvider) -> None:
    body = b'{}'
    stale = int(time.time()) - 3600
    assert provider.verify_webhook(body, _sign(body, timestamp=stale)) is False


def test_parse_ready_webhook(provider: CloudflareStreamProvider) -> None:
    event = provider.parse_webhook(
        {
            'uid': 'abc',
            'readyToStream': True,
            'status': {'state': 'ready'},
            'duration': 30.5,
            'thumbnail': 'https://cdn/thumb.jpg',
            'playback': {'hls': 'https://cdn/video.m3u8'},
            'input': {'width': 1080, 'height': 1920},
        }
    )
    assert event.ready is True
    assert event.playback_hls_url == 'https://cdn/video.m3u8'
    assert event.width == 1080


def test_parse_error_webhook(provider: CloudflareStreamProvider) -> None:
    event = provider.parse_webhook(
        {'uid': 'abc', 'status': {'state': 'error', 'errorReasonText': 'bad codec'}}
    )
    assert event.ready is False
    assert event.error == 'bad codec'


def test_parse_webhook_missing_uid_raises(provider: CloudflareStreamProvider) -> None:
    with pytest.raises(MediaProviderError):
        provider.parse_webhook({'status': {'state': 'ready'}})
