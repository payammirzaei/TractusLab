from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import AuditEvent


def record_audit(
    db: Session,
    action: str,
    *,
    actor_user_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditEvent:
    """Append a privacy-conscious audit event to the current transaction.

    Never pass raw passwords, bearer tokens, reset tokens, or full request bodies here.
    """
    event = AuditEvent(
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {},
    )
    db.add(event)
    return event


def recent_audit_events(db: Session, limit: int = 100) -> list[AuditEvent]:
    safe_limit = max(1, min(limit, 250))
    return list(
        db.scalars(
            select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(safe_limit)
        ).all()
    )
