import os

# Configure process-wide settings before any test module imports app.main. This keeps
# test order from changing Settings() values.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test_tractuslab_api.db")
os.environ.setdefault("FRONTEND_ORIGIN", "http://localhost:3000")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("EXPOSE_DEV_TOKENS", "true")
os.environ.setdefault("EMAIL_DELIVERY_MODE", "disabled")
