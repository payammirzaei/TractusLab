from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from uuid import uuid4

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from .config import settings


class SlidingWindowLimiter:
    """Small process-local guard for auth abuse before edge rate limiting is enabled.

    It is deliberately dependency-free and deterministic for the first production deploy.
    A shared edge/Redis limiter can replace it when TractusLab scales to multiple API replicas.
    """

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> int:
        now = monotonic()
        cutoff = now - window_seconds
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= limit:
                retry_after = max(1, int(window_seconds - (now - hits[0])))
                return retry_after
            hits.append(now)
        return 0


rate_limiter = SlidingWindowLimiter()


def client_identity(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    if forwarded:
        return forwarded[:80]
    return (request.client.host if request.client else "unknown")[:80]


def enforce_rate_limit(request: Request, bucket: str, *, limit: int, window_seconds: int) -> None:
    if not settings.rate_limit_enabled:
        return
    retry_after = rate_limiter.check(
        f"{bucket}:{client_identity(request)}",
        limit=limit,
        window_seconds=window_seconds,
    )
    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Try again shortly.",
            headers={"Retry-After": str(retry_after)},
        )


class ApiHardeningMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id")
        if not request_id or len(request_id) > 80:
            request_id = str(uuid4())
        request.state.request_id = request_id

        if request.method in {"POST", "PUT", "PATCH"}:
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    if int(content_length) > settings.max_request_bytes:
                        return JSONResponse(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            content={"detail": "Request body is too large", "request_id": request_id},
                            headers={"X-Request-ID": request_id},
                        )
                except ValueError:
                    pass

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        if request.url.path.startswith("/v1/auth") or request.url.path in {"/v1/me", "/v1/state"}:
            response.headers["Cache-Control"] = "no-store"
        return response
