import os

from sqlalchemy import select

from app.auth import verify_password
from app.db import SessionLocal
from app.models import User


def main() -> None:
    email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")
    if not email or not password:
        raise RuntimeError("Admin verification credentials are missing")

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            raise RuntimeError("Admin user does not exist")
        if user.role != "admin":
            raise RuntimeError("Admin user does not have admin role")
        if user.email_verified_at is None:
            raise RuntimeError("Admin email is not verified")
        if not verify_password(password, user.password_hash):
            raise RuntimeError("Admin password verification failed")

    print("Admin bootstrap verification passed")


if __name__ == "__main__":
    main()
