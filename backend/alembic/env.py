from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from shared.config import settings
from shared.database import Base
from shared.database.tables import PLATFORM_TABLES

# Import models so their metadata is registered on ``Base``.
from location.models import orm as _location_orm  # noqa: F401
from creators.models import orm as _creators_orm  # noqa: F401
from social.models import orm as _social_orm  # noqa: F401
from content.models import orm as _content_orm  # noqa: F401
from events.models import orm as _events_orm  # noqa: F401
from engagement.models import orm as _engagement_orm  # noqa: F401
from analytics.models import orm as _analytics_orm  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def _database_url() -> str:
    url = settings.database_url
    if not url:
        raise RuntimeError('DISCOVERY_DATABASE_URL must be set to run migrations')
    if url.startswith('postgresql://'):
        return url.replace('postgresql://', 'postgresql+psycopg://', 1)
    if url.startswith('postgres://'):
        return url.replace('postgres://', 'postgresql+psycopg://', 1)
    return url


target_metadata = Base.metadata


def include_object(obj, name, type_, reflected, compare_to):  # noqa: ANN001, ANN201
    """Only manage tables owned by this backend (see shared/database/tables.py).

    Prevents Alembic from trying to drop Supabase-managed auth/RLS tables.
    """

    if type_ == 'table':
        return name in PLATFORM_TABLES
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
        dialect_opts={'paramstyle': 'named'},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration['sqlalchemy.url'] = _database_url()
    connectable = engine_from_config(
        configuration,
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
