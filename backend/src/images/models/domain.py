"""Private image intent; never exposed in public event/feed schemas."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class ImageAsset:
    id: str
    owner_id: str
    event_id: str
    purpose: str
    status: str
    content_type: str
    file_size: int
    upload_key: str
    original_key: str
    prepared_key: str
    display_key: str
    created_at: datetime
    touched_at: datetime
    expires_at: datetime
    output_type: str | None = None
    width: int | None = None
    height: int | None = None
