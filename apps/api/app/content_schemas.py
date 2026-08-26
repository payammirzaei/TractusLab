from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ContentStatus = Literal["draft", "in_review", "approved", "changes_requested", "published", "archived"]
RevisionState = Literal["draft", "in_review", "approved", "changes_requested", "published"]
ReviewAction = Literal["approve", "request_changes"]


class ContentCreateRequest(BaseModel):
    document: dict[str, Any]


class ContentRevisionCreateRequest(BaseModel):
    document: dict[str, Any]


class ContentReviewRequest(BaseModel):
    action: ReviewAction
    note: str | None = Field(default=None, max_length=2000)


class ContentSummary(BaseModel):
    id: str
    scenario_id: str
    title: str
    status: ContentStatus
    latest_revision: int
    published_revision: int | None
    created_by_user_id: str
    created_at: datetime
    updated_at: datetime


class ContentRevisionResponse(BaseModel):
    id: str
    revision_number: int
    state: RevisionState
    document: dict[str, Any]
    created_by_user_id: str
    review_note: str | None
    reviewed_by_user_id: str | None
    created_at: datetime
    reviewed_at: datetime | None


class ContentDetail(BaseModel):
    item: ContentSummary
    revisions: list[ContentRevisionResponse]


class PublishedContentResponse(BaseModel):
    scenario_id: str
    revision_number: int
    document: dict[str, Any]
