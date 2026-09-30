"""API request/response schemas for the social endpoints (follows, blocks, reports)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .models.domain import Follow, Report


class FollowSchema(BaseModel):
    """Wire schema for a single followed creator."""

    creatorId: str
    createdAt: datetime | None = None

    @staticmethod
    def from_domain(follow: Follow) -> 'FollowSchema':
        return FollowSchema(creatorId=follow.creator_id, createdAt=follow.created_at)


class FollowingResponse(BaseModel):
    """Wire schema for GET /me/following."""

    items: list[FollowSchema]


class BlockedResponse(BaseModel):
    """Wire schema for GET /me/blocks."""

    userIds: list[str]


class CreateReportRequest(BaseModel):
    """Body for POST /reports."""

    targetType: Literal['content', 'creator']
    targetId: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1, max_length=200)
    details: str | None = Field(None, max_length=2000)


class ReportSchema(BaseModel):
    """Wire schema for a created report."""

    id: str
    status: str

    @staticmethod
    def from_domain(report: Report) -> 'ReportSchema':
        return ReportSchema(id=report.id, status=report.status)
