from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class ReportTargetType(str, Enum):
    CONTENT = 'content'
    CREATOR = 'creator'


@dataclass(frozen=True, slots=True)
class Follow:
    follower_id: str
    creator_id: str
    created_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class Report:
    id: str
    reporter_id: str
    target_type: ReportTargetType
    target_id: str
    reason: str
    details: str | None
    status: str
    created_at: datetime | None = None
