# TractusLab

**Learn Tractus-X by understanding the business story first, then revealing the architecture and technical details.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. The product starts with fast simulations and progressively adds durable learning evidence, accounts, and later real Tractus-X infrastructure without changing the learner-facing mental model.

## v0.10 — account security

Frontend:
- Guided mission path with prerequisites and unlocks
- Manager / Architect / Developer depth switcher
- Explain-like-I’m-new mode
- Dataspace Map and event/protocol timeline
- Six scenario-driven simulations
- Boss Fights, competencies, achievements and mastery certificate
- Offline-capable local cache with optional server synchronization
- Account create / sign in / sign out
- Forgot/reset password flow
- Change password flow
- Email verification flow
- Active session management and revoke controls

Backend (`apps/api`):
- FastAPI + SQLAlchemy 2
- PostgreSQL-ready `DATABASE_URL`
- Guest-to-account upgrade without losing progress
- Argon2 password hashing via `pwdlib`
- Opaque revocable bearer sessions
- Session rotation after registration, password change, and password reset
- Alembic migrations (`0001_initial` → `0002_accounts` → `0003_account_security`)
- Single-use hashed account-action tokens
- Expiring password-reset tokens
- Expiring email-verification tokens
- Non-enumerating password-reset request response
- Active-session list / revoke / revoke-others endpoints
- Optional SMTP delivery for reset and verification links
- Dev/test token exposure only when `EXPOSE_DEV_TOKENS=true`
- Server-side learner profile, progress, solved challenges, and best Boss Fight scores

## Security model

- Passwords are never stored directly; only Argon2 password hashes are persisted.
- Session bearer tokens are stored server-side only as SHA-256 hashes and can be revoked individually.
- Password reset and email verification tokens are also persisted only as hashes, are time-limited, and are single-use.
- Password reset returns the same public message whether an account exists or not.
- Changing or resetting a password revokes all older sessions.
- Registering upgrades the current guest user but rotates the pre-registration session to prevent session fixation.
- `EXPOSE_DEV_TOKENS` must remain `false` in production.

## Run frontend locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Run API locally

```bash
cd apps/api
cp .env.example .env
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

For a quick local API without PostgreSQL, omit `DATABASE_URL`; SQLite is used by default.

To exercise reset/verification locally before SMTP is configured, set:

```env
EXPOSE_DEV_TOKENS=true
EMAIL_DELIVERY_MODE=disabled
```

For real email delivery later:

```env
EMAIL_DELIVERY_MODE=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=noreply@example.com
SMTP_USE_TLS=true
```

## Test

Frontend:

```bash
npm test
npm run typecheck
npm run build
```

Backend:

```bash
PYTHONPATH=apps/api pytest -q apps/api/tests
```

Database migrations:

```bash
cd apps/api
DATABASE_URL=sqlite+pysqlite:///./migration_test.db alembic upgrade head
```

GitHub Actions verifies migrations, backend tests, frontend tests, TypeScript, and the Next.js production build.

## Deployment policy for this project

Railway deployment is intentionally deferred until the product is roughly 90% complete. Until then, development stays in GitHub + CI so infrastructure does not distract from product completion.

## Product direction

1. **Simulation first** — teach the mental model with instant feedback.
2. **Business first** — explain the problem before the acronym.
3. **Progressive depth** — reveal architecture and developer detail only when useful.
4. **Practice and proof** — missions, Boss Fights, competencies and achievements verify learning.
5. **Durable accounts** — learning evidence can follow the learner across sessions and devices once the API is enabled.
6. **Real lab later** — EDC, DTR and Tractus-X SDK integration come only after the learning product is proven.
