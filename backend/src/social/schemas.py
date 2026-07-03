from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .models.domain import Follow, Report


class FollowSchema(BaseModel):
    creatorId: str
    createdAt: datetime | None = None

    @staticmethod
    def from_domain(follow: Follow) -> 'FollowSchema':
        return FollowSchema(creatorId=follow.creator_id, createdAt=follow.created_at)


class FollowingResponse(BaseModel):
    items: list[FollowSchema]


class BlockedResponse(BaseModel):
    userIds: list[str]


class CreateReportRequest(BaseModel):
    targetType: Literal['content', 'creator']
    targetId: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1, max_length=200)
    details: str | None = Field(None, max_length=2000)


class ReportSchema(BaseModel):
    id: str
    status: str

    @staticmethod
    def from_domain(report: Report) -> 'ReportSchema':
        return ReportSchema(id=report.id, status=report.status)
