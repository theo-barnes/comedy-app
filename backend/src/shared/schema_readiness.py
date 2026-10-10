"""Database schema readiness checks that do not touch ORM-mapped tables."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from time import monotonic

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import Engine, text

from shared.config import settings
from shared.database import get_engine
from shared.logging import get_logger

_CACHE_SECONDS = 5.0
_logger = get_logger(__name__)


@dataclass(frozen=True)
class SchemaReadiness:
    """A public, credential-free result for readiness and traffic admission."""

    ready: bool
    status: str
    code: str | None = None


def _alembic_script_directory() -> Path:
    return Path(__file__).resolve().parents[2] / 'alembic'


@lru_cache(maxsize=1)
def required_revisions() -> tuple[str, ...]:
    """Return the code's Alembic heads without opening a database connection."""

    config = Config()
    config.set_main_option('script_location', str(_alembic_script_directory()))
    return tuple(sorted(ScriptDirectory.from_config(config).get_heads()))


class SchemaReadinessChecker:
    """Compare the configured database revision to this artifact's Alembic heads."""

    def __init__(
        self,
        *,
        database_configured: Callable[[], bool],
        engine_getter: Callable[[], Engine],
        required_revisions_getter: Callable[[], Sequence[str]],
        cache_seconds: float = _CACHE_SECONDS,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self._database_configured = database_configured
        self._engine_getter = engine_getter
        self._required_revisions_getter = required_revisions_getter
        self._cache_seconds = cache_seconds
        self._clock = clock
        self._cached: tuple[float, SchemaReadiness] | None = None

    def check(self) -> SchemaReadiness:
        """Return current readiness; unavailable database results are deliberately not cached."""

        if not self._database_configured():
            return SchemaReadiness(True, 'degraded', 'database_not_configured')

        now = self._clock()
        if self._cached is not None and now - self._cached[0] < self._cache_seconds:
            return self._cached[1]

        try:
            expected = frozenset(self._required_revisions_getter())
            with self._engine_getter().connect() as connection:
                rows = connection.execute(text('SELECT version_num FROM alembic_version')).fetchall()
        except Exception as exc:
            _logger.warning('schema_readiness_unavailable', exception_type=type(exc).__name__)
            return SchemaReadiness(False, 'unavailable', 'database_unreachable')

        actual = frozenset(str(row[0]) for row in rows)
        if actual == expected:
            result = SchemaReadiness(True, 'ok')
        elif not actual or any(revision not in _known_revisions() for revision in actual):
            result = SchemaReadiness(False, 'unavailable', 'schema_revision_unknown')
        else:
            result = SchemaReadiness(False, 'unavailable', 'schema_revision_behind')

        self._cached = (now, result)
        return result


@lru_cache(maxsize=1)
def _known_revisions() -> frozenset[str]:
    config = Config()
    config.set_main_option('script_location', str(_alembic_script_directory()))
    script = ScriptDirectory.from_config(config)
    return frozenset(revision.revision for revision in script.walk_revisions())


@lru_cache(maxsize=1)
def get_schema_readiness_checker() -> SchemaReadinessChecker:
    """Build the process-local checker lazily; no query runs until a request arrives."""

    return SchemaReadinessChecker(
        database_configured=lambda: bool(settings.database_url),
        engine_getter=get_engine,
        required_revisions_getter=required_revisions,
    )
