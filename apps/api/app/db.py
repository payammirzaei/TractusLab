from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings, sqlalchemy_url


class Base(DeclarativeBase):
    pass


url = sqlalchemy_url(settings.database_url)
connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
engine = create_engine(url, future=True, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
