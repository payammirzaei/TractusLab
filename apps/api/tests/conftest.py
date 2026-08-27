import os

# Functional API tests use one synthetic client IP. Disable the process-local abuse
# limiter there so independent test cases cannot influence one another. The limiter
# itself has dedicated unit coverage in test_hardening.py.
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
