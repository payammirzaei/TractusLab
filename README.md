# TractusLab

**Learn Tractus-X by understanding the business story first, then revealing the architecture and technical details.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. The product starts with fast simulations and progressively adds persistence and real infrastructure without changing the learner-facing mental model.

## v0.8 — backend foundation

Frontend:
- Guided mission path with prerequisites and unlocks
- Manager / Architect / Developer depth switcher
- Explain-like-I’m-new mode
- Dataspace Map and event/protocol timeline
- Six scenario-driven simulations
- Boss Fights, competencies, achievements and mastery certificate
- Offline-capable local cache
- Optional server synchronization when `NEXT_PUBLIC_API_URL` is configured

Backend (`apps/api`):
- FastAPI
- SQLAlchemy 2
- PostgreSQL-ready `DATABASE_URL`
- Guest user/session tokens
- Server-side learner profile
- Monotonic scenario progress persistence
- Server-side solved-challenge persistence
- Best Boss Fight score persistence
- `/v1/state` hydration endpoint
- CORS configuration
- SQLite fallback for local development/tests
- Railway-ready Dockerfile

The frontend uses server state as durable learning evidence when the API is configured. `localStorage` remains an offline cache/fallback rather than the only source of truth.

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
uvicorn app.main:app --reload --port 8000
```

For a quick local API without PostgreSQL, omit `DATABASE_URL`; SQLite is used by default.

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

GitHub Actions runs both backend and frontend checks.

## Product direction

1. **Simulation first** — teach the mental model with instant feedback.
2. **Business first** — explain the problem before the acronym.
3. **Progressive depth** — reveal architecture and developer detail only when useful.
4. **Practice and proof** — missions, Boss Fights, competencies and achievements verify learning.
5. **Persistent learning state** — user/session and progress now survive beyond one browser when the API is enabled.
6. **Real lab later** — EDC, DTR and Tractus-X SDK integration come only after the learning product is proven.
