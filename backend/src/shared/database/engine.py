from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from shared.config import settings


class Base(DeclarativeBase):
    """Declarative base for all location-domain ORM models."""


def _normalize_url(database_url: str) -> str:
    """Ensure SQLAlchemy uses the psycopg (v3) driver."""

    if database_url.startswith('postgresql://'):
        return database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    if database_url.startswith('postgres://'):
        return database_url.replace('postgres://', 'postgresql+psycopg://', 1)
    return database_url


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    if not settings.database_url:
        raise RuntimeError('DISCOVERY_DATABASE_URL is not configured')
    return create_engine(
        _normalize_url(settings.database_url),
        pool_pre_ping=True,
        future=True,
    )


@lru_cache(maxsize=1)
def get_sessionmaker() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False, future=True)


@contextmanager
def session_scope() -> Iterator[Session]:
    session = get_sessionmaker()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
