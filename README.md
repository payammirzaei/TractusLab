# TractusLab

**Learn Tractus-X by understanding the business story first, then revealing the architecture and technical details.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. The product starts with fast simulations and progressively adds persistence and real infrastructure without changing the learner-facing mental model.

## v0.9 — accounts and migrations

Frontend:
- Guided mission path with prerequisites and unlocks
- Manager / Architect / Developer depth switcher
- Explain-like-I’m-new mode
- Dataspace Map and event/protocol timeline
- Six scenario-driven simulations
- Boss Fights, competencies, achievements and mastery certificate
- Account page for guest-to-account registration and sign-in
- Offline-capable local cache
- Optional server synchronization when `NEXT_PUBLIC_API_URL` is configured

Backend (`apps/api`):
- FastAPI + SQLAlchemy 2
- PostgreSQL-ready `DATABASE_URL`
- Alembic migrations
- Guest sessions with seamless upgrade to a real account
- Email/password authentication
- Argon2 password hashing via `pwdlib`
- Opaque, revocable server-side session tokens
- Session rotation when a guest becomes an account
- Server-side learner profile, scenario progress, solved challenges and Boss Fight scores
- `/v1/state` hydration endpoint
- CORS configuration
- SQLite fallback for local development/tests

The frontend uses server state as durable learning evidence when the API is configured. `localStorage` remains an offline cache/fallback. Explicit sign-in clears guest-local learning cache before loading the account state, preventing accidental cross-account merging on shared devices.

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

If you already created a v0.8 local database before Alembic was introduced, mark that schema as the baseline and then apply the account migration:

```bash
alembic stamp 0001_initial
alembic upgrade head
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

Migration smoke test:

```bash
cd apps/api
DATABASE_URL=sqlite+pysqlite:///./migration_test.db alembic upgrade head
```

GitHub Actions runs migration verification, backend tests, frontend tests, TypeScript checks and the production Next.js build.

## Product direction

1. **Simulation first** — teach the mental model with instant feedback.
2. **Business first** — explain the problem before the acronym.
3. **Progressive depth** — reveal architecture and developer detail only when useful.
4. **Practice and proof** — missions, Boss Fights, competencies and achievements verify learning.
5. **Persistent identity and learning state** — guest learning can become a durable account without losing progress.
6. **Real lab later** — EDC, DTR and Tractus-X SDK integration come only after the learning product is proven.

Deployment remains intentionally deferred until the product is approximately 90% complete.
