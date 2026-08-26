import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///./test_tractuslab_api.db"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"

from fastapi.testclient import TestClient

from app.main import app

DB_FILE = Path("test_tractuslab_api.db")


def auth_header(client: TestClient) -> dict[str, str]:
    response = client.post("/v1/session/guest", json={"display_name": "Test Learner"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_health_and_guest_session() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}
        response = client.post("/v1/session/guest", json={"display_name": "  Payam  "})
        assert response.status_code == 201
        body = response.json()
        assert body["token_type"] == "bearer"
        assert body["user"]["display_name"] == "Payam"
        assert body["access_token"]


def test_authentication_is_required() -> None:
    with TestClient(app) as client:
        response = client.get("/v1/state")
        assert response.status_code == 401


def test_progress_merges_monotonically() -> None:
    with TestClient(app) as client:
        headers = auth_header(client)
        first = client.put(
            "/v1/progress/battery-pcf",
            headers=headers,
            json={"max_step": 4, "completed": False, "solved_challenges": ["policy"]},
        )
        assert first.status_code == 200

        second = client.put(
            "/v1/progress/battery-pcf",
            headers=headers,
            json={"max_step": 2, "completed": True, "solved_challenges": ["identity", "policy"]},
        )
        body = second.json()
        assert body["max_step"] == 4
        assert body["completed"] is True
        assert body["solved_challenges"] == ["identity", "policy"]

        state = client.get("/v1/state", headers=headers).json()
        assert state["progress"]["battery-pcf"]["completed"] is True


def test_boss_score_only_improves() -> None:
    with TestClient(app) as client:
        headers = auth_header(client)
        assert client.put("/v1/boss-scores/battery-pcf", headers=headers, json={"score": 82}).json()["score"] == 82
        assert client.put("/v1/boss-scores/battery-pcf", headers=headers, json={"score": 61}).json()["score"] == 82
        assert client.put("/v1/boss-scores/battery-pcf", headers=headers, json={"score": 94}).json()["score"] == 94


def test_profile_update_and_state_reset() -> None:
    with TestClient(app) as client:
        headers = auth_header(client)
        response = client.patch("/v1/me", headers=headers, json={"display_name": "  Learner One  "})
        assert response.json()["display_name"] == "Learner One"

        client.put(
            "/v1/progress/digital-twin",
            headers=headers,
            json={"max_step": 3, "completed": False, "solved_challenges": []},
        )
        client.put("/v1/boss-scores/digital-twin", headers=headers, json={"score": 75})

        assert client.delete("/v1/progress", headers=headers).status_code == 204
        assert client.delete("/v1/boss-scores", headers=headers).status_code == 204
        state = client.get("/v1/state", headers=headers).json()
        assert state["progress"] == {}
        assert state["boss_scores"] == {}
