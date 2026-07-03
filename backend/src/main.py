from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from content.controller import router as content_router
from content.controller import webhook_router as content_webhook_router
from creators.controller import router as creators_router
from analytics.controller import router as analytics_router
from engagement.controller import router as engagement_router
from events.controller import router as events_router
from feed.controller import router as feed_router
from location.controller import router as discovery_router
from shared.config import settings
from shared.errors import register_error_handlers
from shared.logging import configure_logging
from shared.middleware import RequestContextMiddleware
from shared.observability import init_sentry
from social.controller import router as social_router


def create_app() -> FastAPI:
    configure_logging(settings.log_level)
    init_sentry(settings)

    app = FastAPI(title='Comedy Platform API', version='0.3.0')

    app.add_middleware(RequestContextMiddleware)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[o.strip() for o in settings.cors_origins.split(',') if o.strip()],
            allow_credentials=True,
            allow_methods=['*'],
            allow_headers=['*'],
        )

    register_error_handlers(app)

    # Versioned API surface. The unversioned discovery route is kept for
    # backwards compatibility with existing app builds.
    app.include_router(discovery_router, prefix='/v1')
    app.include_router(creators_router, prefix='/v1')
    app.include_router(social_router, prefix='/v1')
    app.include_router(content_router, prefix='/v1')
    app.include_router(content_webhook_router, prefix='/v1')
    app.include_router(events_router, prefix='/v1')
    app.include_router(engagement_router, prefix='/v1')
    app.include_router(feed_router, prefix='/v1')
    app.include_router(analytics_router, prefix='/v1')
    app.include_router(discovery_router, include_in_schema=False)

    @app.get('/health', include_in_schema=False)
    def health() -> dict[str, str]:
        return {'status': 'ok'}

    return app


app = create_app()
