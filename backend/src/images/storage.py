"""Backend-only Supabase Storage adapter; signed capabilities never contain service keys."""

from typing import Protocol
from urllib.parse import parse_qs, quote, urlsplit

import requests

from shared.errors import DomainError, ValidationFailedError

ORIGINALS_BUCKET = 'gig-poster-originals'
DISPLAY_BUCKET = 'gig-poster-display'


class PosterUnavailableError(DomainError):
    status_code = 503
    code = 'poster_unavailable'


class StorageError(PosterUnavailableError):
    pass


class PosterStorage(Protocol):
    upload_url: str

    def sign_upload(self, key: str) -> str: ...
    def read(self, bucket: str, key: str, *, limit: int) -> bytes | None: ...
    def put(self, bucket: str, key: str, data: bytes, content_type: str) -> None: ...
    def delete(self, bucket: str, keys: list[str]) -> None: ...
    def public_url(self, key: str) -> str: ...


class SupabasePosterStorage:
    def __init__(self, url: str, service_key: str) -> None:
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.query or parsed.fragment:
            raise ValueError('poster Storage requires an HTTPS Supabase URL')
        self._base = url.rstrip('/') + '/storage/v1'
        host = parsed.hostname
        if host.endswith('.supabase.co') and not host.endswith('.storage.supabase.co'):
            host = host.removesuffix('.supabase.co') + '.storage.supabase.co'
        self.upload_url = f'https://{host}/storage/v1/upload/resumable/sign'
        self._headers = {'Authorization': f'Bearer {service_key}', 'apikey': service_key}

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        try:
            return requests.request(
                method, self._base + path, headers=self._headers | kwargs.pop('headers', {}),
                timeout=(5, 30), allow_redirects=False, **kwargs,
            )
        except requests.RequestException as exc:
            raise StorageError('poster Storage could not be reached; retry this operation') from exc

    @staticmethod
    def _path(bucket: str, key: str) -> str:
        return f'{quote(bucket, safe="")}/{quote(key, safe="/")}'

    @staticmethod
    def _error_code(response: requests.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return ''
        if not isinstance(payload, dict):
            return ''
        return str(payload.get('error', payload.get('code', '')))

    def sign_upload(self, key: str) -> str:
        response = self._request(
            'POST', f'/object/upload/sign/{self._path(ORIGINALS_BUCKET, key)}',
            json={}, headers={'x-upsert': 'false'},
        )
        if response.status_code != 200:
            raise StorageError('poster upload authorization failed')
        try:
            payload = response.json()
            signed_url = payload['url']
            token = parse_qs(urlsplit(signed_url).query)['token'][0]
            if not isinstance(token, str) or not token:
                raise ValueError('empty token')
        except (ValueError, KeyError, TypeError, IndexError) as exc:
            raise StorageError('poster upload authorization returned an invalid capability') from exc
        return token

    def read(self, bucket: str, key: str, *, limit: int) -> bytes | None:
        response = self._request('GET', f'/object/{self._path(bucket, key)}', stream=True)
        try:
            if response.status_code == 404 or (
                response.status_code == 400 and self._error_code(response) in ('not_found', 'NoSuchKey')
            ):
                return None
            if response.status_code != 200:
                raise StorageError('poster object could not be read')
            chunks: list[bytes] = []
            size = 0
            for chunk in response.iter_content(64 * 1024):
                size += len(chunk)
                if size > limit:
                    raise ValidationFailedError('poster exceeds the allowed byte size')
                chunks.append(chunk)
            return b''.join(chunks)
        except requests.RequestException as exc:
            raise StorageError('poster download interrupted; retry this operation') from exc
        finally:
            response.close()

    def put(self, bucket: str, key: str, data: bytes, content_type: str) -> None:
        response = self._request(
            'POST', f'/object/{self._path(bucket, key)}', data=data,
            headers={'Content-Type': content_type, 'x-upsert': 'false', 'Cache-Control': 'max-age=3600'},
        )
        if response.status_code in (200, 201):
            return
        if response.status_code == 409 or (
            response.status_code == 400 and self._error_code(response) in ('Duplicate', 'ResourceAlreadyExists')
        ):
            try:
                existing = self.read(bucket, key, limit=len(data))
            except ValidationFailedError as exc:
                raise StorageError('immutable poster key already contains different bytes') from exc
            if existing == data:
                return
        raise StorageError('immutable poster write failed; retry this operation')

    def delete(self, bucket: str, keys: list[str]) -> None:
        response = self._request('DELETE', f'/object/{quote(bucket, safe="")}', json={'prefixes': keys})
        if response.status_code not in (200, 204):
            raise StorageError('poster cleanup failed; the durable record will be retried')

    def public_url(self, key: str) -> str:
        return self._base + '/object/public/' + self._path(DISPLAY_BUCKET, key)
