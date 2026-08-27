import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///./test_tractuslab_api.db"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"
os.environ["RATE_LIMIT_ENABLED"] = "false"

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


def register(client: TestClient, email: str) -> tuple[dict[str, str], str]:
    guest = client.post("/v1/session/guest", json={}).json()
    guest_headers = {"Authorization": f"Bearer {guest['access_token']}"}
    response = client.post(
        "/v1/auth/register",
        headers=guest_headers,
        json={"email": email, "password": "correct-horse-battery", "display_name": email.split("@")[0]},
    )
    assert response.status_code == 201
    body = response.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body["user"]["id"]


def test_admin_role_change_is_visible_in_audit_trail() -> None:
    with TestClient(app) as client:
        admin_headers, admin_id = register(client, "admin@example.com")
        _, target_id = register(client, "author@example.com")

        with SessionLocal() as db:
            admin = db.scalar(select(User).where(User.id == admin_id))
            assert admin is not None
            admin.role = "admin"
            db.add(admin)
            db.commit()

        changed = client.patch(
            f"/v1/admin/users/{target_id}/role",
            headers=admin_headers,
            json={"role": "reviewer"},
        )
        assert changed.status_code == 200
        assert changed.json()["role"] == "reviewer"

        audit = client.get("/v1/admin/audit-events?limit=20", headers=admin_headers)
        assert audit.status_code == 200
        event = next(item for item in audit.json() if item["action"] == "admin.role_changed")
        assert event["actor_user_id"] == admin_id
        assert event["target_id"] == target_id
        assert event["details"] == {"from": "learner", "to": "reviewer"}
