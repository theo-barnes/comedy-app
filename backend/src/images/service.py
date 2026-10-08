"""Gig-bound poster validation, publication, and compensating reconciliation."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from shared.auth.models import AuthenticatedUser
from shared.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationFailedError

from .models.domain import ImageAsset
from .ports import PosterEvent, PosterEvents
from .processing import CONTENT_TYPES, MAX_BYTES, process_image
from .repository import ImageRepository
from .storage import DISPLAY_BUCKET, ORIGINALS_BUCKET, PosterStorage, PosterUnavailableError, StorageError


@dataclass(frozen=True)
class UploadIntent:
    asset_id: str
    upload_url: str
    upload_token: str
    bucket_name: str
    object_name: str


class PosterService:
    def __init__(
        self, repository: ImageRepository | None, storage: PosterStorage | None,
        events: PosterEvents, *, enabled: bool = False,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._events = events
        self.enabled = enabled and repository is not None and storage is not None

    def _configured(self) -> tuple[ImageRepository, PosterStorage]:
        if not self.enabled or self._repository is None or self._storage is None:
            raise PosterUnavailableError('gig poster changes are disabled or Storage is unconfigured')
        return self._repository, self._storage

    def _owned(
        self, event_id: str, user: AuthenticatedUser, events: PosterEvents | None = None,
    ) -> PosterEvent:
        if user.role != 'venue':
            raise PermissionDeniedError('only venues can change gig posters')
        event = (events if events is not None else self._events).get(event_id)
        if event is None:
            raise NotFoundError('event not found')
        if event.owner_id != user.user_id:
            raise PermissionDeniedError('only the owning venue can change this poster')
        return event

    @staticmethod
    def _asset(asset: ImageAsset | None, event_id: str, user: AuthenticatedUser) -> ImageAsset:
        if asset is None:
            raise NotFoundError('poster asset not found')
        if asset.owner_id != user.user_id or asset.event_id != event_id or asset.purpose != 'gig-poster':
            raise PermissionDeniedError('poster asset does not belong to this venue and gig')
        return asset

    def initiate(
        self, event_id: str, user: AuthenticatedUser, content_type: str, file_size: int,
    ) -> UploadIntent:
        repository, storage = self._configured()
        self._owned(event_id, user)
        if content_type not in CONTENT_TYPES or not 0 < file_size <= MAX_BYTES:
            raise ValidationFailedError('use JPEG, PNG or WebP up to 10 MiB')
        now = datetime.now(timezone.utc)
        asset_id = str(uuid4())
        # All possible outputs are durable before signing/uploading. No untracked public copy.
        prefix = f'{user.user_id}/{event_id}/{asset_id}'
        asset = ImageAsset(
            id=asset_id, owner_id=user.user_id, event_id=event_id, purpose='gig-poster',
            status='uploading', content_type=content_type, file_size=file_size,
            upload_key=f'uploads/{prefix}', original_key=f'sealed/{prefix}',
            prepared_key=f'prepared/{prefix}', display_key=f'posters/{prefix}',
            # Hosted Supabase signed uploads last 2h; a TUS session created at
            # the end of that window can remain live for another 24h.
            created_at=now, touched_at=now, expires_at=now + timedelta(hours=26),
        )
        repository.create(asset)
        token = storage.sign_upload(asset.upload_key)
        with repository.locked(asset_id) as transaction:
            assert transaction.asset is not None
            transaction.asset.expires_at = datetime.now(timezone.utc) + timedelta(hours=26)
        return UploadIntent(asset_id, storage.upload_url, token, ORIGINALS_BUCKET, asset.upload_key)

    def complete(self, event_id: str, asset_id: str, user: AuthenticatedUser) -> tuple[int, int]:
        repository, storage = self._configured()
        self._owned(event_id, user)
        invalid: ValidationFailedError | None = None
        result: tuple[int, int] | None = None
        with repository.locked(asset_id) as transaction:
            asset = self._asset(transaction.asset, event_id, user)
            self._owned(event_id, user, transaction.events)
            if asset.status in ('ready', 'attached'):
                assert asset.width is not None and asset.height is not None
                return asset.width, asset.height
            if asset.status != 'uploading':
                raise ConflictError('poster asset is no longer available; start a new upload')
            if datetime.now(timezone.utc) >= asset.expires_at:
                raise ConflictError('poster upload expired; start a new upload')
            try:
                data = storage.read(ORIGINALS_BUCKET, asset.original_key, limit=MAX_BYTES)
                if data is None:
                    data = storage.read(ORIGINALS_BUCKET, asset.upload_key, limit=MAX_BYTES)
                if data is None:
                    raise ConflictError('poster upload has not finished')
                processed = process_image(data, asset.content_type, asset.file_size)
                # Copy validated bytes to a backend-only key. Retain the immutable upload
                # object as a tombstone until token/TUS expiry, preventing path reuse.
                storage.put(ORIGINALS_BUCKET, asset.original_key, data, asset.content_type)
                storage.put(ORIGINALS_BUCKET, asset.prepared_key, processed.data, processed.content_type)
                asset.output_type = processed.content_type
                asset.width, asset.height = processed.width, processed.height
                asset.status = 'ready'
                result = processed.width, processed.height
            except ValidationFailedError as exc:
                asset.status = 'failed'
                invalid = exc
            asset.touched_at = datetime.now(timezone.utc)
        if invalid is not None:
            raise invalid
        assert result is not None
        return result

    def attach(
        self, event_id: str, asset_id: str, expected_revision: int, user: AuthenticatedUser,
    ) -> None:
        repository, storage = self._configured()
        self._owned(event_id, user)
        # Persist the publication lease BEFORE Storage, including crashes/ambiguous
        # responses. Recheck under the next lock: release here does not authorize
        # a stale CAS, and cleanup cannot claim this asset during its fresh grace.
        with repository.locked(asset_id) as transaction:
            asset = self._asset(transaction.asset, event_id, user)
            if not self._attachable(asset, event_id, expected_revision, user, transaction.events):
                return
            asset.touched_at = datetime.now(timezone.utc)
        failure: ConflictError | PosterUnavailableError | None = None
        with repository.locked(asset_id) as transaction:
            asset = self._asset(transaction.asset, event_id, user)
            if not self._attachable(asset, event_id, expected_revision, user, transaction.events):
                return
            prepared = storage.read(ORIGINALS_BUCKET, asset.prepared_key, limit=MAX_BYTES * 2)
            if prepared is None or asset.output_type is None:
                raise StorageError('prepared poster is unavailable; retry completion')
            try:
                storage.put(DISPLAY_BUCKET, asset.display_key, prepared, asset.output_type)
                # CAS owns the event reference; a failed swap leaves the old poster intact.
                # Public orphan keys are durable and reconciled after a fresh grace period.
                transaction.events.swap(
                    event_id, user.user_id, expected_revision, asset, storage.public_url(asset.display_key),
                )
                asset.status = 'attached'
            except (ConflictError, PosterUnavailableError) as exc:
                failure = exc
            asset.touched_at = datetime.now(timezone.utc)
        if failure is not None:
            raise failure

    def _attachable(
        self, asset: ImageAsset, event_id: str, expected_revision: int, user: AuthenticatedUser,
        events: PosterEvents,
    ) -> bool:
        event = self._owned(event_id, user, events)
        if event.asset_id == asset.id and event.revision in (expected_revision, expected_revision + 1):
            return False
        if event.revision != expected_revision:
            raise ConflictError('poster changed; refresh the gig before retrying')
        if asset.status != 'ready':
            raise ConflictError('poster must be ready and not previously superseded')
        return True

    def remove(self, event_id: str, expected_revision: int, user: AuthenticatedUser) -> None:
        self._configured()
        self._owned(event_id, user)
        self._events.swap(event_id, user.user_id, expected_revision, None, None)

    def cleanup(self, *, dry_run: bool = True, limit: int = 100) -> tuple[int, int]:
        # Cleanup is independently usable while the mutation/UI gate is rolled back.
        if self._repository is None or self._storage is None:
            raise PosterUnavailableError('poster cleanup requires database and Storage')
        now = datetime.now(timezone.utc)
        before = now - timedelta(hours=24)
        cleaned = failures = 0
        for asset_id in self._repository.cleanup_candidates(before, limit):
            try:
                with self._repository.locked(asset_id) as transaction:
                    asset = transaction.asset
                    if (
                        asset is None or asset.status == 'deleted'
                        or asset.touched_at > before or asset.expires_at > now
                        or transaction.events.referenced(asset_id)
                    ):
                        continue
                    if not dry_run:
                        # Lock excludes completion/attach; CAS removal refreshes touched_at.
                        self._storage.delete(DISPLAY_BUCKET, [asset.display_key])
                        self._storage.delete(ORIGINALS_BUCKET, [
                            asset.upload_key, asset.original_key, asset.prepared_key,
                        ])
                        asset.status = 'deleted'
                        asset.touched_at = now
                    cleaned += 1
            except PosterUnavailableError:
                failures += 1
        return cleaned, failures
