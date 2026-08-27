from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from uuid import uuid4

from fastapi import Request, status
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from .audit import record_audit
from .auth import hash_token
from .config import settings
from .db import SessionLocal
from .models import AuthSession


class SlidingWindowLimiter:
    """Process-local first-line abuse guard.

    This intentionally protects the first production deployment without adding Redis.
    When the API scales beyond one replica, an edge/shared limiter should become the
    authoritative layer while this remains a cheap local backstop.
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
                return max(1, int(window_seconds - (now - hits[0])))
            hits.append(now)
        return 0

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


rate_limiter = SlidingWindowLimiter()


def client_identity(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    if forwarded:
        return forwarded[:80]
    return (request.client.host if request.client else "unknown")[:80]


def rate_limit_rule(request: Request) -> tuple[str, int, int] | None:
    if request.method != "POST":
        return None
    path = request.url.path
    if path == "/v1/session/guest":
        return ("guest", settings.guest_rate_limit_per_minute, 60)
    if path in {"/v1/auth/login", "/v1/auth/register"}:
        return ("auth", settings.auth_rate_limit_per_minute, 60)
    if path in {"/v1/auth/password-reset/request", "/v1/auth/email-verification/request"}:
        return ("recovery", settings.recovery_rate_limit_per_hour, 3600)
    return None


def actor_from_request(request: Request) -> str | None:
    authorization = request.headers.get("authorization", "")
    if not authorization.lower().startswith("bearer "):
        return None
    raw_token = authorization.split(" ", 1)[1].strip()
    if not raw_token:
        return None
    with SessionLocal() as db:
        row = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(raw_token)))
        return row.user_id if row is not None else None


def audit_descriptor(method: str, path: str) -> tuple[str, str | None, str | None] | None:
    if method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None
    if path.startswith("/v1/admin/"):
        return None
    if path == "/v1/auth/register":
        return ("auth.account_created", "user", None)
    if path == "/v1/auth/logout":
        return ("auth.logout", "session", None)
    if path == "/v1/auth/change-password":
        return ("auth.password_changed", "user", None)
    if path == "/v1/auth/email-verification/request":
        return ("auth.verification_requested", "user", None)
    if path.startswith("/v1/auth/sessions"):
        return ("auth.sessions_changed", "session", None)
    if path == "/v1/me" and method == "PATCH":
        return ("profile.updated", "user", None)
    if path == "/v1/progress" and method == "DELETE":
        return ("learning.progress_cleared", "learning_state", None)
    if path == "/v1/boss-scores" and method == "DELETE":
        return ("learning.boss_scores_cleared", "learning_state", None)
    if path.startswith("/v1/content"):
        parts = [part for part in path.split("/") if part]
        content_id = parts[2] if len(parts) >= 3 and parts[2] != "published" else None
        suffix = parts[-1] if len(parts) > 3 else "changed"
        action = {
            "submit": "content.submitted",
            "review": "content.reviewed",
            "publish": "content.published",
            "archive": "content.archived",
            "revisions": "content.revision_created",
        }.get(suffix, "content.created" if method == "POST" and path == "/v1/content" else "content.changed")
        return (action, "content", content_id)
    return None


class ApiHardeningMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id")
        if not request_id or len(request_id) > 80:
            request_id = str(uuid4())
        request.state.request_id = request_id

        if settings.rate_limit_enabled:
            rule = rate_limit_rule(request)
            if rule is not None:
                bucket, limit, window = rule
                retry_after = rate_limiter.check(f"{bucket}:{client_identity(request)}", limit, window)
                if retry_after:
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={"detail": "Too many requests. Try again shortly.", "request_id": request_id},
                        headers={"Retry-After": str(retry_after), "X-Request-ID": request_id},
                    )

        if request.method in {"POST", "PUT", "PATCH"}:
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    if int(content_length) > settings.max_request_bytes:
                        return JSONResponse(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            content={"detail": "Request body is too large", "request_id": request_id},
                            headers={"X-Request-ID": request_id},
                        )
                except ValueError:
                    pass

        actor_user_id = actor_from_request(request)
        response = await call_next(request)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        if request.url.path.startswith("/v1/auth") or request.url.path in {"/v1/me", "/v1/state"}:
            response.headers["Cache-Control"] = "no-store"

        descriptor = audit_descriptor(request.method, request.url.path)
        if descriptor is not None and 200 <= response.status_code < 400:
            action, target_type, target_id = descriptor
            try:
                with SessionLocal() as db:
                    record_audit(
                        db,
                        action,
                        actor_user_id=actor_user_id,
                        target_type=target_type,
                        target_id=target_id,
                        details={"status": response.status_code, "request_id": request_id},
                    )
                    db.commit()
            except Exception:
                pass

        return response
