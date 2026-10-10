"""Run one release-time Alembic upgrade without exposing database credentials."""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
LOCK_KEY = int.from_bytes(
    hashlib.sha256(b'comedy-platform-alembic-migrations').digest()[:8],
    byteorder='big',
    signed=True,
)


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith('postgresql://'):
        return database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    if database_url.startswith('postgres://'):
        return database_url.replace('postgres://', 'postgresql+psycopg://', 1)
    return database_url


def current_revisions(connection) -> tuple[str, ...]:  # noqa: ANN001
    if not inspect(connection).has_table('alembic_version'):
        return ()
    return tuple(sorted(str(row[0]) for row in connection.execute(
        text('SELECT version_num FROM alembic_version')
    ).fetchall()))


def alembic_config() -> Config:
    config = Config(str(BACKEND_DIR / 'alembic.ini'))
    config.set_main_option('script_location', str(BACKEND_DIR / 'alembic'))
    return config


def run() -> int:
    database_url = os.environ.get('DISCOVERY_DATABASE_URL', '')
    if not database_url:
        print('migration_failed code=database_not_configured', file=sys.stderr)
        return 2

    os.chdir(BACKEND_DIR)
    engine = create_engine(normalize_database_url(database_url), pool_pre_ping=True, future=True)
    try:
        with engine.connect() as connection:
            locked = connection.dialect.name == 'postgresql'
            if locked:
                connection.execute(text('SELECT pg_advisory_lock(:lock_key)'), {'lock_key': LOCK_KEY})
            try:
                print(f'migration_revision_before={",".join(current_revisions(connection)) or "none"}')
                command.upgrade(alembic_config(), 'head')
                print(f'migration_revision_after={",".join(current_revisions(connection)) or "none"}')
            finally:
                if locked:
                    connection.execute(
                        text('SELECT pg_advisory_unlock(:lock_key)'), {'lock_key': LOCK_KEY}
                    )
    except Exception as exc:
        print(f'migration_failed code=migration_error exception_type={type(exc).__name__}', file=sys.stderr)
        return 1
    finally:
        engine.dispose()
    return 0


if __name__ == '__main__':
    raise SystemExit(run())
