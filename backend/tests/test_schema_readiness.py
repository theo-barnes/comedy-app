from __future__ import annotations

from main import create_app
from shared.schema_readiness import SchemaReadinessChecker


class FakeResult:
    def __init__(self, revisions: list[str]) -> None:
        self._revisions = revisions

    def fetchall(self) -> list[tuple[str]]:
        return [(revision,) for revision in self._revisions]


class FakeConnection:
    def __init__(self, revisions: list[str] | None = None, error: Exception | None = None) -> None:
        self.revisions = revisions or []
        self.error = error

    def __enter__(self) -> FakeConnection:
        if self.error:
            raise self.error
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def execute(self, statement: object) -> FakeResult:
        return FakeResult(self.revisions)


class FakeEngine:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection

    def connect(self) -> FakeConnection:
        return self.connection


def checker(
    revisions: list[str] | None = None,
    *,
    configured: bool = True,
    error: Exception | None = None,
) -> SchemaReadinessChecker:
    return SchemaReadinessChecker(
        database_configured=lambda: configured,
        engine_getter=lambda: FakeEngine(FakeConnection(revisions, error)),  # type: ignore[arg-type]
        required_revisions_getter=lambda: ('0010_gig_posters',),
        cache_seconds=0,
    )


def test_current_database_revision_is_ready() -> None:
    assert checker(['0010_gig_posters']).check().ready is True


def test_behind_database_revision_is_unavailable() -> None:
    readiness = checker(['0009_media_status_default']).check()
    assert (readiness.ready, readiness.code) == (False, 'schema_revision_behind')


def test_unknown_database_revision_is_unavailable() -> None:
    readiness = checker(['unrecognized-revision']).check()
    assert (readiness.ready, readiness.code) == (False, 'schema_revision_unknown')


def test_database_connection_failure_is_unavailable_without_secret() -> None:
    readiness = checker(error=RuntimeError('postgres://user:password@example.test/db')).check()
    assert (readiness.ready, readiness.code) == (False, 'database_unreachable')
    assert 'password' not in str(readiness)


def test_unconfigured_database_preserves_degraded_development_mode() -> None:
    readiness = checker(configured=False).check()
    assert (readiness.ready, readiness.status, readiness.code) == (
        True,
        'degraded',
        'database_not_configured',
    )


def test_health_liveness_does_not_depend_on_schema_readiness() -> None:
    app = create_app()
    health = next(route.endpoint for route in app.routes if getattr(route, 'path', None) == '/health')
    assert health() == {'status': 'ok'}


def test_readiness_route_returns_unavailable_schema_code_without_secret() -> None:
    app = create_app()
    ready = next(route.endpoint for route in app.routes if getattr(route, 'path', None) == '/ready')
    response = ready(checker(error=RuntimeError('postgres://user:password@example.test/db')))
    assert response.status_code == 503
    assert response.body == b'{"status":"unavailable","code":"database_unreachable"}'
