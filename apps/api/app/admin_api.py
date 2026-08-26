from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import User
from .rbac import VALID_ROLES, require_roles

router = APIRouter(prefix="/v1/admin", tags=["admin"])


class RoleUpdateRequest(BaseModel):
    role: Literal["learner", "author", "reviewer", "admin"]


class AdminUserResponse(BaseModel):
    id: str
    email: str | None
    display_name: str | None
    role: str
    email_verified: bool


def admin_user_response(user: User) -> AdminUserResponse:
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        email_verified=user.email_verified_at is not None,
    )


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    _: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> list[AdminUserResponse]:
    rows = db.scalars(select(User).where(User.email.is_not(None)).order_by(User.created_at.desc())).all()
    return [admin_user_response(row) for row in rows]


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> AdminUserResponse:
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown role")
    target = db.get(User, user_id)
    if target is None or target.is_guest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == current_user.id and payload.role != "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot remove your own admin role")
    target.role = payload.role
    db.add(target)
    db.commit()
    db.refresh(target)
    return admin_user_response(target)
