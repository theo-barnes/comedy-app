from __future__ import annotations

from functools import lru_cache

from .provider import MediaProvider


@lru_cache(maxsize=1)
def get_media_provider() -> MediaProvider:
    from shared.config import settings

    if settings.cloudflare_account_id and settings.cloudflare_api_token:
        from .cloudflare import CloudflareStreamProvider

        return CloudflareStreamProvider(
            account_id=settings.cloudflare_account_id,
            api_token=settings.cloudflare_api_token,
            webhook_secret=settings.cloudflare_stream_webhook_secret,
        )

    from .stub import StubMediaProvider

    return StubMediaProvider()
