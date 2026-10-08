"""Only owner-management responses contain private upload capabilities."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .processing import MAX_BYTES, MAX_PIXELS


class PosterConfigSchema(BaseModel):
    enabled: bool
    maxBytes: int = MAX_BYTES
    maxPixels: int = MAX_PIXELS
    supportedContentTypes: list[str] = Field(default_factory=lambda: [
        'image/jpeg', 'image/png', 'image/webp',
    ])


class PosterUploadRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    contentType: Literal['image/jpeg', 'image/png', 'image/webp']
    fileSize: int = Field(gt=0, le=MAX_BYTES, strict=True)


class PosterUploadSchema(BaseModel):
    assetId: str
    uploadUrl: str
    uploadToken: str
    bucketName: str
    objectName: str


class PosterCompleteSchema(BaseModel):
    assetId: str
    status: Literal['ready'] = 'ready'
    width: int
    height: int


class PosterAttachRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    assetId: str = Field(pattern=(
        r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-'
        r'[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ))
    expectedRevision: int = Field(ge=0, strict=True)


class PosterRemoveRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    expectedRevision: int = Field(ge=0, strict=True)
