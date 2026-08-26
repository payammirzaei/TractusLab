from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TractusLab API"
    database_url: str = "sqlite+pysqlite:///./tractuslab.db"
    frontend_origin: str = "http://localhost:3000"
    session_ttl_days: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


def sqlalchemy_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


settings = Settings()
