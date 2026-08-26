from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from .auth import get_current_user
from .config import settings
from .models import User

VALID_ROLES = {"learner", "author", "reviewer", "admin"}
CONTENT_ROLES = {"author", "reviewer", "admin"}


def configured_admin_emails() -> set[str]:
    return {item.strip().lower() for item in settings.content_admin_emails.split(",") if item.strip()}


def apply_bootstrap_role(user: User) -> bool:
    if user.email and user.email.lower() in configured_admin_emails() and user.role != "admin":
        user.role = "admin"
        return True
    return False


def require_roles(*allowed_roles: str) -> Callable[..., User]:
    allowed = set(allowed_roles)

    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission for this action")
        return user

    return dependency
