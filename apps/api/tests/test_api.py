import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///./test_tractuslab_api.db"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"
os.environ["EXPOSE_DEV_TOKENS"] = "true"
os.environ["EMAIL_DELIVERY_MODE"] = "disabled"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import AccountToken, User


@pytest.fixture(autouse=True)
def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def guest_session(client: TestClient, display_name: str = "Test Learner") -> tuple[dict[str, str], dict]:
    response = client.post("/v1/session/guest", json={"display_name": display_name})
    assert response.status_code == 201
    body = response.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body


def register_account(
    client: TestClient,
    email: str = "learner@example.com",
    password: str = "correct-horse-battery",
) -> tuple[dict[str, str], dict]:
    guest_headers, _ = guest_session(client)
    response = client.post(
        "/v1/auth/register",
        headers=guest_headers,
        json={"email": email, "password": password, "display_name": "Learner"},
    )
    assert response.status_code == 201
    body = response.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body


def test_health_and_guest_session() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}
        _, body = guest_session(client, "  Payam  ")
        assert body["user"]["display_name"] == "Payam"
        assert body["user"]["email"] is None
        assert body["user"]["is_guest"] is True
        assert body["user"]["email_verified"] is False


def test_authentication_is_required() -> None:
    with TestClient(app) as client:
        assert client.get("/v1/state").status_code == 401


def test_guest_can_register_without_losing_progress_and_session_rotates() -> None:
    with TestClient(app) as client:
        old_headers, guest = guest_session(client)
        client.put(
            "/v1/progress/battery-pcf",
            headers=old_headers,
            json={"max_step": 4, "completed": True, "solved_challenges": ["policy"]},
        )
        registered = client.post(
            "/v1/auth/register",
            headers=old_headers,
            json={"email": " PAYAM@example.com ", "password": "correct-horse-battery", "display_name": "Payam"},
        )
        assert registered.status_code == 201
        body = registered.json()
        assert body["user"]["id"] == guest["user"]["id"]
        assert body["user"]["email"] == "payam@example.com"
        assert body["user"]["is_guest"] is False
        assert body["access_token"] != guest["access_token"]
        assert client.get("/v1/me", headers=old_headers).status_code == 401

        new_headers = {"Authorization": f"Bearer {body['access_token']}"}
        state = client.get("/v1/state", headers=new_headers).json()
        assert state["progress"]["battery-pcf"]["completed"] is True

        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == "payam@example.com"))
            assert user is not None
            assert user.password_hash
            assert user.password_hash != "correct-horse-battery"


def test_duplicate_email_and_invalid_credentials_are_safe() -> None:
    with TestClient(app) as client:
        first_headers, _ = register_account(client)
        assert client.get("/v1/me", headers=first_headers).status_code == 200

        second_headers, _ = guest_session(client)
        duplicate = client.post(
            "/v1/auth/register",
            headers=second_headers,
            json={"email": "LEARNER@example.com", "password": "another-secure-password"},
        )
        assert duplicate.status_code == 409

        wrong_email = client.post("/v1/auth/login", json={"email": "missing@example.com", "password": "wrong-password"})
        wrong_password = client.post("/v1/auth/login", json={"email": "learner@example.com", "password": "wrong-password"})
        assert wrong_email.status_code == wrong_password.status_code == 401
        assert wrong_email.json()["detail"] == wrong_password.json()["detail"] == "Invalid email or password"


def test_email_verification_token_is_hashed_single_use_and_confirms() -> None:
    with TestClient(app) as client:
        headers, _ = register_account(client, "verify@example.com")
        requested = client.post("/v1/auth/email-verification/request", headers=headers)
        assert requested.status_code == 202
        raw_token = requested.json()["debug_token"]
        assert raw_token

        with SessionLocal() as db:
            token_row = db.scalar(select(AccountToken))
            assert token_row is not None
            assert token_row.token_hash != raw_token

        confirmed = client.post("/v1/auth/email-verification/confirm", json={"token": raw_token})
        assert confirmed.status_code == 200
        assert confirmed.json()["email_verified"] is True
        assert client.post("/v1/auth/email-verification/confirm", json={"token": raw_token}).status_code == 400
        assert client.get("/v1/me", headers=headers).json()["email_verified"] is True
        already = client.post("/v1/auth/email-verification/request", headers=headers)
        assert already.status_code == 202
        assert already.json()["debug_token"] is None


def test_password_reset_is_non_enumerating_single_use_and_revokes_old_sessions() -> None:
    with TestClient(app) as client:
        headers, _ = register_account(client, "reset@example.com", "old-secure-password")
        login = client.post("/v1/auth/login", json={"email": "reset@example.com", "password": "old-secure-password"})
        second_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        existing = client.post("/v1/auth/password-reset/request", json={"email": "reset@example.com"})
        missing = client.post("/v1/auth/password-reset/request", json={"email": "missing@example.com"})
        assert existing.status_code == missing.status_code == 202
        assert existing.json()["message"] == missing.json()["message"]
        raw_token = existing.json()["debug_token"]
        assert raw_token

        confirmed = client.post(
            "/v1/auth/password-reset/confirm",
            json={"token": raw_token, "new_password": "new-secure-password"},
        )
        assert confirmed.status_code == 200
        reset_headers = {"Authorization": f"Bearer {confirmed.json()['access_token']}"}
        assert client.get("/v1/me", headers=reset_headers).status_code == 200
        assert client.get("/v1/me", headers=headers).status_code == 401
        assert client.get("/v1/me", headers=second_headers).status_code == 401
        assert client.post("/v1/auth/password-reset/confirm", json={"token": raw_token, "new_password": "another-password"}).status_code == 400
        assert client.post("/v1/auth/login", json={"email": "reset@example.com", "password": "old-secure-password"}).status_code == 401
        assert client.post("/v1/auth/login", json={"email": "reset@example.com", "password": "new-secure-password"}).status_code == 200


def test_change_password_rotates_all_sessions() -> None:
    with TestClient(app) as client:
        headers, _ = register_account(client, "change@example.com", "first-secure-password")
        second = client.post("/v1/auth/login", json={"email": "change@example.com", "password": "first-secure-password"})
        second_headers = {"Authorization": f"Bearer {second.json()['access_token']}"}

        wrong = client.post(
            "/v1/auth/change-password",
            headers=headers,
            json={"current_password": "wrong-password", "new_password": "second-secure-password"},
        )
        assert wrong.status_code == 400

        changed = client.post(
            "/v1/auth/change-password",
            headers=headers,
            json={"current_password": "first-secure-password", "new_password": "second-secure-password"},
        )
        assert changed.status_code == 200
        new_headers = {"Authorization": f"Bearer {changed.json()['access_token']}"}
        assert client.get("/v1/me", headers=new_headers).status_code == 200
        assert client.get("/v1/me", headers=headers).status_code == 401
        assert client.get("/v1/me", headers=second_headers).status_code == 401


def test_session_management_lists_revokes_and_keeps_current() -> None:
    with TestClient(app) as client:
        headers, _ = register_account(client, "sessions@example.com")
        login_one = client.post("/v1/auth/login", json={"email": "sessions@example.com", "password": "correct-horse-battery"})
        login_two = client.post("/v1/auth/login", json={"email": "sessions@example.com", "password": "correct-horse-battery"})
        headers_one = {"Authorization": f"Bearer {login_one.json()['access_token']}"}
        headers_two = {"Authorization": f"Bearer {login_two.json()['access_token']}"}

        sessions = client.get("/v1/auth/sessions", headers=headers_one).json()["sessions"]
        assert len(sessions) == 3
        current = next(item for item in sessions if item["current"])
        other = next(item for item in sessions if not item["current"])
        assert client.delete(f"/v1/auth/sessions/{other['id']}", headers=headers_one).status_code == 204

        assert client.post("/v1/auth/sessions/revoke-others", headers=headers_one).status_code == 204
        remaining = client.get("/v1/auth/sessions", headers=headers_one).json()["sessions"]
        assert len(remaining) == 1
        assert remaining[0]["id"] == current["id"]
        assert client.get("/v1/me", headers=headers_one).status_code == 200
        assert client.get("/v1/me", headers=headers_two).status_code == 401


def test_progress_merges_monotonically_and_boss_score_only_improves() -> None:
    with TestClient(app) as client:
        headers, _ = guest_session(client)
        client.put(
            "/v1/progress/battery-pcf",
            headers=headers,
            json={"max_step": 4, "completed": False, "solved_challenges": ["policy"]},
        )
        body = client.put(
            "/v1/progress/battery-pcf",
            headers=headers,
            json={"max_step": 2, "completed": True, "solved_challenges": ["identity", "policy"]},
        ).json()
        assert body["max_step"] == 4
        assert body["completed"] is True
        assert body["solved_challenges"] == ["identity", "policy"]

        assert client.put("/v1/boss-scores/battery-pcf", headers=headers, json={"score": 82}).json()["score"] == 82
        assert client.put("/v1/boss-scores/battery-pcf", headers=headers, json={"score": 61}).json()["score"] == 82
        assert client.put("/v1/boss-scores/battery-pcf", headers=headers, json={"score": 94}).json()["score"] == 94


def test_profile_update_and_state_reset() -> None:
    with TestClient(app) as client:
        headers, _ = guest_session(client)
        assert client.patch("/v1/me", headers=headers, json={"display_name": "  Learner One  "}).json()["display_name"] == "Learner One"
        client.put("/v1/progress/digital-twin", headers=headers, json={"max_step": 3, "completed": False, "solved_challenges": []})
        client.put("/v1/boss-scores/digital-twin", headers=headers, json={"score": 75})
        assert client.delete("/v1/progress", headers=headers).status_code == 204
        assert client.delete("/v1/boss-scores", headers=headers).status_code == 204
        state = client.get("/v1/state", headers=headers).json()
        assert state["progress"] == {}
        assert state["boss_scores"] == {}
