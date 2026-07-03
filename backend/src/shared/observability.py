from __future__ import annotations

from shared.config import Settings


def init_sentry(settings: Settings) -> None:
    """Initialise Sentry if a DSN is configured. No-op otherwise."""

    if not settings.sentry_dsn:
        return
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
    )
