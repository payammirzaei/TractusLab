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
from app.models import User


@pytest.fixture(autouse=True)
def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def register(client: TestClient, email: str) -> dict[str, str]:
    guest = client.post("/v1/session/guest", json={})
    guest_headers = {"Authorization": f"Bearer {guest.json()['access_token']}"}
    registered = client.post(
        "/v1/auth/register",
        headers=guest_headers,
        json={"email": email, "password": "correct-horse-battery", "display_name": email.split("@")[0]},
    )
    assert registered.status_code == 201
    return {"Authorization": f"Bearer {registered.json()['access_token']}"}


def set_role(email: str, role: str) -> None:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        user.role = role
        db.add(user)
        db.commit()


def sample_document(version: str = "1.0.0", title: str = "Supplier quality exchange") -> dict:
    return {
        "schemaVersion": "1.0",
        "metadata": {
            "id": "quality-demo",
            "version": version,
            "status": "draft",
            "tags": ["quality"],
            "summary": "A governed quality exchange.",
        },
        "scenario": {
            "id": "quality-demo",
            "title": title,
            "shortTitle": "Quality Demo",
            "useCase": "Quality Management",
            "asset": "PART-42",
            "goal": "Share one quality result safely.",
            "supplierLabel": "Supplier",
            "manufacturerLabel": "Manufacturer",
            "steps": [
                {
                    "id": "identity",
                    "technicalName": "Identity",
                    "question": "Who is asking?",
                    "business": "Know the partner before sharing data.",
                    "architecture": "Participant identity is checked before protected exchange.",
                    "developer": "A credential is validated before continuing.",
                    "whyNeeded": "The provider needs a trusted counterparty.",
                    "withoutIt": "Unknown parties could request protected data.",
                    "actionLabel": "Verify partner",
                    "direction": "manufacturer-to-supplier",
                    "mapFocus": ["identity"],
                    "glossary": ["Identity"],
                }
            ],
            "challenges": [
                {
                    "id": "identity-failure",
                    "title": "Identity rejected",
                    "prompt": "What should you inspect?",
                    "symptom": "Identity ❌",
                    "hint": "Check the participant credential.",
                    "correctOptionId": "credential",
                    "rootCause": "The credential is invalid.",
                    "options": [
                        {"id": "credential", "label": "Check credential", "explanation": "Correct."},
                        {"id": "catalog", "label": "Delete catalog", "explanation": "Not related."},
                    ],
                }
            ],
        },
    }


def test_content_workflow_enforces_author_reviewer_admin_separation() -> None:
    with TestClient(app) as client:
        learner = register(client, "learner@example.com")
        author = register(client, "author@example.com")
        reviewer = register(client, "reviewer@example.com")
        admin = register(client, "admin@example.com")
        set_role("author@example.com", "author")
        set_role("reviewer@example.com", "reviewer")
        set_role("admin@example.com", "admin")

        assert client.get("/v1/content", headers=learner).status_code == 403
        assert client.post("/v1/content", headers=learner, json={"document": sample_document()}).status_code == 403

        created = client.post("/v1/content", headers=author, json={"document": sample_document()})
        assert created.status_code == 201
        content_id = created.json()["item"]["id"]
        assert created.json()["item"]["status"] == "draft"
        assert created.json()["revisions"][0]["revision_number"] == 1

        submitted = client.post(f"/v1/content/{content_id}/submit", headers=author)
        assert submitted.status_code == 200
        assert submitted.json()["item"]["status"] == "in_review"
        assert client.post(
            f"/v1/content/{content_id}/review",
            headers=author,
            json={"action": "approve", "note": "looks good"},
        ).status_code == 403

        changes = client.post(
            f"/v1/content/{content_id}/review",
            headers=reviewer,
            json={"action": "request_changes", "note": "Clarify the architecture wording."},
        )
        assert changes.status_code == 200
        assert changes.json()["item"]["status"] == "changes_requested"
        assert changes.json()["revisions"][0]["review_note"] == "Clarify the architecture wording."

        revised = client.post(
            f"/v1/content/{content_id}/revisions",
            headers=author,
            json={"document": sample_document("1.1.0", "Supplier quality exchange revised")},
        )
        assert revised.status_code == 201
        assert revised.json()["item"]["latest_revision"] == 2
        assert len(revised.json()["revisions"]) == 2

        assert client.post(f"/v1/content/{content_id}/submit", headers=author).status_code == 200
        approved = client.post(
            f"/v1/content/{content_id}/review",
            headers=reviewer,
            json={"action": "approve", "note": "Ready for release."},
        )
        assert approved.status_code == 200
        assert approved.json()["item"]["status"] == "approved"
        assert client.post(f"/v1/content/{content_id}/publish", headers=reviewer).status_code == 403

        published = client.post(f"/v1/content/{content_id}/publish", headers=admin)
        assert published.status_code == 200
        assert published.json()["item"]["status"] == "published"
        assert published.json()["item"]["published_revision"] == 2
        assert published.json()["revisions"][0]["document"]["metadata"]["status"] == "published"

        public_content = client.get("/v1/content/published")
        assert public_content.status_code == 200
        assert public_content.json()[0]["scenario_id"] == "quality-demo"
        assert public_content.json()[0]["revision_number"] == 2


def test_invalid_content_is_rejected_before_revision_storage() -> None:
    with TestClient(app) as client:
        author = register(client, "author@example.com")
        set_role("author@example.com", "author")
        invalid = sample_document()
        invalid["scenario"]["steps"][0]["developer"] = ""
        response = client.post("/v1/content", headers=author, json={"document": invalid})
        assert response.status_code == 422
        assert "developer" in str(response.json()["detail"])


def test_admin_can_assign_content_roles_but_cannot_demote_self() -> None:
    with TestClient(app) as client:
        admin = register(client, "admin@example.com")
        author = register(client, "future-author@example.com")
        set_role("admin@example.com", "admin")

        with SessionLocal() as db:
            author_user = db.scalar(select(User).where(User.email == "future-author@example.com"))
            admin_user = db.scalar(select(User).where(User.email == "admin@example.com"))
            assert author_user is not None and admin_user is not None
            author_id = author_user.id
            admin_id = admin_user.id

        updated = client.patch(f"/v1/admin/users/{author_id}/role", headers=admin, json={"role": "author"})
        assert updated.status_code == 200
        assert updated.json()["role"] == "author"
        assert client.get("/v1/content", headers=author).status_code == 200

        self_demote = client.patch(f"/v1/admin/users/{admin_id}/role", headers=admin, json={"role": "reviewer"})
        assert self_demote.status_code == 400
