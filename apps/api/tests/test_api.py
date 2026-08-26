import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///./test_tractuslab_api.db"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import User


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


def test_health_and_guest_session() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}
        _, body = guest_session(client, "  Payam  ")
        assert body["token_type"] == "bearer"
        assert body["user"]["display_name"] == "Payam"
        assert body["user"]["email"] is None
        assert body["user"]["is_guest"] is True


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
        assert client.post(
            "/v1/auth/register",
            headers=new_headers,
            json={"email": "other@example.com", "password": "another-secure-password"},
        ).status_code == 409

        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == "payam@example.com"))
            assert user is not None
            assert user.password_hash
            assert user.password_hash != "correct-horse-battery"


def test_duplicate_email_is_rejected() -> None:
    with TestClient(app) as client:
        first_headers, _ = guest_session(client)
        assert client.post(
            "/v1/auth/register",
            headers=first_headers,
            json={"email": "learner@example.com", "password": "very-secure-password"},
        ).status_code == 201

        second_headers, _ = guest_session(client)
        duplicate = client.post(
            "/v1/auth/register",
            headers=second_headers,
            json={"email": "LEARNER@example.com", "password": "another-secure-password"},
        )
        assert duplicate.status_code == 409


def test_login_logout_and_invalid_credentials() -> None:
    with TestClient(app) as client:
        headers, _ = guest_session(client)
        client.post(
            "/v1/auth/register",
            headers=headers,
            json={"email": "login@example.com", "password": "correct-horse-battery"},
        )

        wrong_email = client.post("/v1/auth/login", json={"email": "missing@example.com", "password": "wrong-password"})
        wrong_password = client.post("/v1/auth/login", json={"email": "login@example.com", "password": "wrong-password"})
        assert wrong_email.status_code == wrong_password.status_code == 401
        assert wrong_email.json()["detail"] == wrong_password.json()["detail"] == "Invalid email or password"

        login = client.post("/v1/auth/login", json={"email": "LOGIN@example.com", "password": "correct-horse-battery"})
        assert login.status_code == 200
        login_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        assert client.get("/v1/me", headers=login_headers).status_code == 200
        assert client.post("/v1/auth/logout", headers=login_headers).status_code == 204
        assert client.get("/v1/me", headers=login_headers).status_code == 401


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
