import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///./test_tractuslab_api.db"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"
os.environ["EXPOSE_DEV_TOKENS"] = "true"
os.environ["EMAIL_DELIVERY_MODE"] = "disabled"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_guest_to_account_to_login_restores_learning_evidence() -> None:
    with TestClient(app) as client:
        guest = client.post("/v1/session/guest", json={"display_name": "Journey Learner"})
        assert guest.status_code == 201
        guest_token = guest.json()["access_token"]
        guest_headers = auth(guest_token)

        pcf = client.put(
            "/v1/progress/battery-pcf",
            headers=guest_headers,
            json={"max_step": 7, "completed": True, "solved_challenges": ["policy-mismatch", "schema-mismatch"]},
        )
        twin = client.put(
            "/v1/progress/digital-twin",
            headers=guest_headers,
            json={"max_step": 3, "completed": False, "solved_challenges": ["twin-not-found"]},
        )
        boss = client.put("/v1/boss-scores/battery-pcf", headers=guest_headers, json={"score": 88})
        assert pcf.status_code == twin.status_code == boss.status_code == 200

        registered = client.post(
            "/v1/auth/register",
            headers=guest_headers,
            json={
                "email": "journey@example.com",
                "password": "journey-secure-password-42!",
                "display_name": "Journey Learner",
            },
        )
        assert registered.status_code == 201
        account_token = registered.json()["access_token"]
        assert account_token != guest_token
        account_headers = auth(account_token)

        state_after_register = client.get("/v1/state", headers=account_headers).json()
        assert state_after_register["progress"]["battery-pcf"]["completed"] is True
        assert state_after_register["progress"]["digital-twin"]["max_step"] == 3
        assert state_after_register["boss_scores"]["battery-pcf"] == 88
        assert state_after_register["user"]["display_name"] == "Journey Learner"

        logged_out = client.post("/v1/auth/logout", headers=account_headers)
        assert logged_out.status_code == 204
        assert client.get("/v1/state", headers=account_headers).status_code == 401

        logged_in = client.post(
            "/v1/auth/login",
            json={"email": "journey@example.com", "password": "journey-secure-password-42!"},
        )
        assert logged_in.status_code == 200
        restored_headers = auth(logged_in.json()["access_token"])
        restored = client.get("/v1/state", headers=restored_headers)
        assert restored.status_code == 200
        body = restored.json()

        assert body["user"]["email"] == "journey@example.com"
        assert body["user"]["display_name"] == "Journey Learner"
        assert body["progress"]["battery-pcf"] == {
            "scenario_id": "battery-pcf",
            "max_step": 7,
            "completed": True,
            "solved_challenges": ["policy-mismatch", "schema-mismatch"],
        }
        assert body["progress"]["digital-twin"]["completed"] is False
        assert body["progress"]["digital-twin"]["solved_challenges"] == ["twin-not-found"]
        assert body["boss_scores"]["battery-pcf"] == 88
