from __future__ import annotations

import logging

import structlog

_configured = False


def configure_logging(level: str = 'INFO') -> None:
    """Configure structlog for JSON output. Idempotent."""

    global _configured
    if _configured:
        return
    _configured = True

    logging.basicConfig(level=getattr(logging, level.upper(), logging.INFO), format='%(message)s')

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt='iso', utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
