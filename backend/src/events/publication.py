"""Events-owned eligibility policy, also checked under the final event row lock."""

from datetime import datetime, timezone
from math import isfinite

from shared.errors import ConflictError, ValidationFailedError

from .models.domain import Event, EventPublicationStatus, EventStatus


def validate_publication(event: Event) -> None:
    if event.publication_status is not EventPublicationStatus.DRAFT:
        raise ConflictError('gig is already published; use poster replacement')
    if event.status is not EventStatus.SCHEDULED:
        raise ConflictError('cancelled gigs cannot be published')
    if not 1 <= len(event.title.strip()) <= 200:
        raise ValidationFailedError('gig title must contain 1 to 200 characters before publication')
    if event.start_time <= datetime.now(timezone.utc):
        raise ValidationFailedError('gig start must be in the future before publication')
    if (
        event.latitude is None or event.longitude is None
        or not isfinite(event.latitude) or not isfinite(event.longitude)
        or not -90 <= event.latitude <= 90 or not -180 <= event.longitude <= 180
    ):
        raise ValidationFailedError('valid venue location is required before publication')
