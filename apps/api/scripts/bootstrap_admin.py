import os
from datetime import datetime, timezone

from sqlalchemy import select

from app.auth import hash_password
from app.db import SessionLocal
from app.models import User


def main() -> None:
    email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")
    display_name = os.getenv("BOOTSTRAP_ADMIN_DISPLAY_NAME", "TractusLab Admin").strip() or "TractusLab Admin"

    if not email or not password:
        raise RuntimeError("BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required")

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                password_hash=hash_password(password),
                display_name=display_name,
                role="admin",
                email_verified_at=datetime.now(timezone.utc),
            )
            db.add(user)
            action = "created"
        else:
            user.password_hash = hash_password(password)
            user.display_name = display_name
            user.role = "admin"
            if user.email_verified_at is None:
                user.email_verified_at = datetime.now(timezone.utc)
            db.add(user)
            action = "updated"

        db.commit()
        db.refresh(user)
        print(
            f"Admin {action}: email={user.email} role={user.role} "
            f"is_guest={user.is_guest} verified={user.email_verified_at is not None}"
        )


if __name__ == "__main__":
    main()
