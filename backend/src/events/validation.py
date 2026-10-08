"""Validation shared by the native event request and service boundaries."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import HttpUrl, TypeAdapter, UrlConstraints

_https_url = TypeAdapter(Annotated[HttpUrl, UrlConstraints(allowed_schemes=['https'])])


def validate_ticket_url(value: str) -> str:
    parsed = urlsplit(value)
    if (
        parsed.scheme.lower() != 'https' or not parsed.netloc or not parsed.hostname
        or '\\' in value or any(character.isspace() or ord(character) < 32 for character in value)
    ):
        raise ValueError('must be a valid HTTPS URL with a host')
    return str(_https_url.validate_python(value))


def parse_local_time(value: str) -> datetime:
    if re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}', value) is None:
        raise ValueError('must use YYYY-MM-DDTHH:mm without a timezone or seconds')
    return datetime.fromisoformat(value)
