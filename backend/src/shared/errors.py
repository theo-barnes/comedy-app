from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Base class for errors that map cleanly onto HTTP responses."""

    status_code: int = 400
    code: str = 'bad_request'

    def __init__(self, message: str = '') -> None:
        self.message = message or self.code
        super().__init__(self.message)


class UnauthorizedError(DomainError):
    status_code = 401
    code = 'unauthorized'


class PermissionDeniedError(DomainError):
    status_code = 403
    code = 'forbidden'


class NotFoundError(DomainError):
    status_code = 404
    code = 'not_found'


class ConflictError(DomainError):
    status_code = 409
    code = 'conflict'


class ValidationFailedError(DomainError):
    status_code = 422
    code = 'validation_failed'


class RateLimitedError(DomainError):
    status_code = 429
    code = 'rate_limited'


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _handle_domain_error(request: Request, exc: DomainError) -> JSONResponse:  # noqa: ANN001
        return JSONResponse(
            status_code=exc.status_code,
            content={'error': {'code': exc.code, 'message': exc.message}},
        )
