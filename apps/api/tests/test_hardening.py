import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///./test_tractuslab_api.db"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"
os.environ["RATE_LIMIT_ENABLED"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import Base, SessionLocal, engine
from app.hardening import SlidingWindowLimiter
from app.main import app
from app.models import AuditEvent


@pytest.fixture(autouse=True)
def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_sliding_window_limiter_blocks_after_limit_and_can_reset() -> None:
    limiter = SlidingWindowLimiter()
    assert limiter.check("auth:test", 2, 60) == 0
    assert limiter.check("auth:test", 2, 60) == 0
    assert limiter.check("auth:test", 2, 60) > 0
    limiter.clear()
    assert limiter.check("auth:test", 2, 60) == 0


def test_security_headers_and_request_id_are_added() -> None:
    with TestClient(app) as client:
        response = client.get("/health", headers={"X-Request-ID": "trace-123"})
        assert response.status_code == 200
        assert response.headers["x-request-id"] == "trace-123"
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["referrer-policy"] == "no-referrer"
        assert "camera=()" in response.headers["permissions-policy"]


def test_large_mutating_request_is_rejected_before_endpoint() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/v1/session/guest",
            content=b"{}",
            headers={"Content-Type": "application/json", "Content-Length": "2000000"},
        )
        assert response.status_code == 413
        assert response.json()["detail"] == "Request body is too large"
        assert response.headers.get("x-request-id")


def test_successful_profile_mutation_is_audited_without_sensitive_payload() -> None:
    with TestClient(app) as client:
        guest = client.post("/v1/session/guest", json={}).json()
        headers = {"Authorization": f"Bearer {guest['access_token']}"}
        updated = client.patch("/v1/me", headers=headers, json={"display_name": "Audit Learner"})
        assert updated.status_code == 200

        with SessionLocal() as db:
            event = db.scalar(select(AuditEvent).where(AuditEvent.action == "profile.updated"))
            assert event is not None
            assert event.actor_user_id == guest["user"]["id"]
            assert event.target_type == "user"
            assert "password" not in str(event.details).lower()
            assert "token" not in str(event.details).lower()
            assert event.details.get("request_id")
