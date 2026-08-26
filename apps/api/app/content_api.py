from copy import deepcopy

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import utcnow
from .content_schemas import (
    ContentCreateRequest,
    ContentDetail,
    ContentReviewRequest,
    ContentRevisionCreateRequest,
    ContentRevisionResponse,
    ContentSummary,
    PublishedContentResponse,
)
from .db import get_db
from .models import ScenarioContent, ScenarioRevision, User
from .rbac import CONTENT_ROLES, require_roles

router = APIRouter(prefix="/v1/content", tags=["content"])


def validate_content_document(document: dict) -> tuple[dict, str, str]:
    errors: list[str] = []
    if document.get("schemaVersion") != "1.0":
        errors.append("schemaVersion must be 1.0")

    metadata = document.get("metadata")
    scenario = document.get("scenario")
    if not isinstance(metadata, dict):
        errors.append("metadata must be an object")
        metadata = {}
    if not isinstance(scenario, dict):
        errors.append("scenario must be an object")
        scenario = {}

    metadata_id = str(metadata.get("id") or "").strip()
    scenario_id = str(scenario.get("id") or "").strip()
    title = str(scenario.get("title") or "").strip()
    if not metadata_id:
        errors.append("metadata.id is required")
    if not scenario_id:
        errors.append("scenario.id is required")
    if metadata_id and scenario_id and metadata_id != scenario_id:
        errors.append("metadata.id and scenario.id must match")
    if not title:
        errors.append("scenario.title is required")

    steps = scenario.get("steps")
    if not isinstance(steps, list) or not steps:
        errors.append("scenario.steps must contain at least one step")
        steps = []
    step_ids: set[str] = set()
    for index, step in enumerate(steps):
        if not isinstance(step, dict):
            errors.append(f"step {index + 1} must be an object")
            continue
        step_id = str(step.get("id") or "").strip()
        if not step_id:
            errors.append(f"step {index + 1} id is required")
        elif step_id in step_ids:
            errors.append(f"duplicate step id: {step_id}")
        step_ids.add(step_id)
        for key in ("business", "architecture", "developer", "question", "technicalName"):
            if not str(step.get(key) or "").strip():
                errors.append(f"step {step_id or index + 1} requires {key}")

    challenges = scenario.get("challenges")
    if not isinstance(challenges, list):
        errors.append("scenario.challenges must be an array")
        challenges = []
    challenge_ids: set[str] = set()
    for index, challenge in enumerate(challenges):
        if not isinstance(challenge, dict):
            errors.append(f"challenge {index + 1} must be an object")
            continue
        challenge_id = str(challenge.get("id") or "").strip()
        if not challenge_id:
            errors.append(f"challenge {index + 1} id is required")
        elif challenge_id in challenge_ids:
            errors.append(f"duplicate challenge id: {challenge_id}")
        challenge_ids.add(challenge_id)
        options = challenge.get("options")
        correct_option_id = str(challenge.get("correctOptionId") or "").strip()
        if not isinstance(options, list) or len(options) < 2:
            errors.append(f"challenge {challenge_id or index + 1} needs at least two options")
        else:
            option_ids = {str(option.get("id") or "").strip() for option in options if isinstance(option, dict)}
            if correct_option_id not in option_ids:
                errors.append(f"challenge {challenge_id or index + 1} correct option is missing")

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Invalid content document", "errors": errors},
        )

    canonical = deepcopy(document)
    canonical.setdefault("metadata", {})["status"] = "draft"
    return canonical, scenario_id, title


def summary(row: ScenarioContent) -> ContentSummary:
    return ContentSummary(
        id=row.id,
        scenario_id=row.scenario_id,
        title=row.title,
        status=row.status,
        latest_revision=row.latest_revision,
        published_revision=row.published_revision,
        created_by_user_id=row.created_by_user_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def revision_response(row: ScenarioRevision) -> ContentRevisionResponse:
    return ContentRevisionResponse(
        id=row.id,
        revision_number=row.revision_number,
        state=row.state,
        document=row.document,
        created_by_user_id=row.created_by_user_id,
        review_note=row.review_note,
        reviewed_by_user_id=row.reviewed_by_user_id,
        created_at=row.created_at,
        reviewed_at=row.reviewed_at,
    )


def latest_revision(db: Session, item: ScenarioContent) -> ScenarioRevision:
    row = db.scalar(
        select(ScenarioRevision).where(
            ScenarioRevision.content_id == item.id,
            ScenarioRevision.revision_number == item.latest_revision,
        )
    )
    if row is None:
        raise HTTPException(status_code=500, detail="Content revision is missing")
    return row


def get_item(db: Session, content_id: str) -> ScenarioContent:
    item = db.get(ScenarioContent, content_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found")
    return item


@router.get("/published", response_model=list[PublishedContentResponse])
def list_published_content(db: Session = Depends(get_db)) -> list[PublishedContentResponse]:
    items = db.scalars(
        select(ScenarioContent).where(ScenarioContent.status == "published").order_by(ScenarioContent.title)
    ).all()
    result: list[PublishedContentResponse] = []
    for item in items:
        if item.published_revision is None:
            continue
        revision = db.scalar(
            select(ScenarioRevision).where(
                ScenarioRevision.content_id == item.id,
                ScenarioRevision.revision_number == item.published_revision,
            )
        )
        if revision is not None:
            result.append(
                PublishedContentResponse(
                    scenario_id=item.scenario_id,
                    revision_number=revision.revision_number,
                    document=revision.document,
                )
            )
    return result


@router.get("", response_model=list[ContentSummary])
def list_content(
    _: User = Depends(require_roles(*CONTENT_ROLES)),
    db: Session = Depends(get_db),
) -> list[ContentSummary]:
    rows = db.scalars(select(ScenarioContent).order_by(ScenarioContent.updated_at.desc())).all()
    return [summary(row) for row in rows]


@router.post("", response_model=ContentDetail, status_code=status.HTTP_201_CREATED)
def create_content(
    payload: ContentCreateRequest,
    user: User = Depends(require_roles("author", "admin")),
    db: Session = Depends(get_db),
) -> ContentDetail:
    document, scenario_id, title = validate_content_document(payload.document)
    if db.scalar(select(ScenarioContent).where(ScenarioContent.scenario_id == scenario_id)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Scenario already exists in server content")

    item = ScenarioContent(
        scenario_id=scenario_id,
        title=title,
        status="draft",
        latest_revision=1,
        created_by_user_id=user.id,
    )
    db.add(item)
    db.flush()
    revision = ScenarioRevision(
        content_id=item.id,
        revision_number=1,
        state="draft",
        document=document,
        created_by_user_id=user.id,
    )
    db.add(revision)
    db.commit()
    db.refresh(item)
    db.refresh(revision)
    return ContentDetail(item=summary(item), revisions=[revision_response(revision)])


@router.get("/{content_id}", response_model=ContentDetail)
def get_content(
    content_id: str,
    _: User = Depends(require_roles(*CONTENT_ROLES)),
    db: Session = Depends(get_db),
) -> ContentDetail:
    item = get_item(db, content_id)
    revisions = db.scalars(
        select(ScenarioRevision)
        .where(ScenarioRevision.content_id == item.id)
        .order_by(ScenarioRevision.revision_number.desc())
    ).all()
    return ContentDetail(item=summary(item), revisions=[revision_response(row) for row in revisions])


@router.post("/{content_id}/revisions", response_model=ContentDetail, status_code=status.HTTP_201_CREATED)
def create_revision(
    content_id: str,
    payload: ContentRevisionCreateRequest,
    user: User = Depends(require_roles("author", "admin")),
    db: Session = Depends(get_db),
) -> ContentDetail:
    item = get_item(db, content_id)
    if item.status in {"in_review", "approved", "archived"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Finish the current review workflow before creating a revision")
    document, scenario_id, title = validate_content_document(payload.document)
    if scenario_id != item.scenario_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Scenario id cannot change across revisions")

    next_number = item.latest_revision + 1
    revision = ScenarioRevision(
        content_id=item.id,
        revision_number=next_number,
        state="draft",
        document=document,
        created_by_user_id=user.id,
    )
    item.latest_revision = next_number
    item.title = title
    item.status = "draft"
    db.add(item)
    db.add(revision)
    db.commit()
    return get_content(content_id, user, db)


@router.post("/{content_id}/submit", response_model=ContentDetail)
def submit_for_review(
    content_id: str,
    user: User = Depends(require_roles("author", "admin")),
    db: Session = Depends(get_db),
) -> ContentDetail:
    item = get_item(db, content_id)
    revision = latest_revision(db, item)
    if revision.state not in {"draft", "changes_requested"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Latest revision cannot be submitted from its current state")
    revision.state = "in_review"
    revision.review_note = None
    revision.reviewed_by_user_id = None
    revision.reviewed_at = None
    item.status = "in_review"
    db.add(item)
    db.add(revision)
    db.commit()
    return get_content(content_id, user, db)


@router.post("/{content_id}/review", response_model=ContentDetail)
def review_content(
    content_id: str,
    payload: ContentReviewRequest,
    user: User = Depends(require_roles("reviewer", "admin")),
    db: Session = Depends(get_db),
) -> ContentDetail:
    item = get_item(db, content_id)
    revision = latest_revision(db, item)
    if revision.state != "in_review":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only an in-review revision can be reviewed")

    revision.review_note = payload.note.strip() if payload.note else None
    revision.reviewed_by_user_id = user.id
    revision.reviewed_at = utcnow()
    if payload.action == "approve":
        revision.state = "approved"
        item.status = "approved"
    else:
        revision.state = "changes_requested"
        item.status = "changes_requested"
    db.add(item)
    db.add(revision)
    db.commit()
    return get_content(content_id, user, db)


@router.post("/{content_id}/publish", response_model=ContentDetail)
def publish_content(
    content_id: str,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> ContentDetail:
    item = get_item(db, content_id)
    revision = latest_revision(db, item)
    if revision.state != "approved":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only an approved revision can be published")

    document = deepcopy(revision.document)
    document.setdefault("metadata", {})["status"] = "published"
    revision.document = document
    revision.state = "published"
    item.status = "published"
    item.published_revision = revision.revision_number
    db.add(item)
    db.add(revision)
    db.commit()
    return get_content(content_id, user, db)


@router.post("/{content_id}/archive", response_model=ContentDetail)
def archive_content(
    content_id: str,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> ContentDetail:
    item = get_item(db, content_id)
    item.status = "archived"
    db.add(item)
    db.commit()
    return get_content(content_id, user, db)
