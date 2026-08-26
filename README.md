# TractusLab

**Learn Tractus-X by understanding the business story first, then revealing the architecture and technical details.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. The product starts with fast simulations and progressively adds durable learning evidence, accounts, structured content authoring, and later real Tractus-X infrastructure without changing the learner-facing mental model.

## v0.11 — content authoring foundation

Learning product:
- Guided mission path with prerequisites and unlocks
- Manager / Architect / Developer depth switcher
- Explain-like-I’m-new mode
- Dataspace Map and event/protocol timeline
- Six scenario-driven simulations
- Boss Fights, competencies, achievements and mastery certificate
- Offline-capable local cache with optional server synchronization

Content system:
- Versioned scenario content contract (`schemaVersion: 1.0`)
- Scenario metadata: id, semantic version, status, tags and summary
- Published-content registry consumed by the real simulator runtime
- Validation for scenario structure, learning depths, step IDs, challenge options and correct answers
- Cross-document duplicate-ID validation
- `npm run content:validate` CI gate
- Internal `/author` workspace
- Packaged-scenario cloning
- New-scenario template
- JSON import/export
- Local draft persistence
- Business / Architecture / Developer content preview
- Draft / published / archived lifecycle field

Account and security foundation:
- Account create / sign in / sign out
- Forgot/reset password flow
- Change password flow
- Email verification flow
- Active session management and revoke controls
- Argon2 password hashing via `pwdlib`
- Opaque revocable bearer sessions
- Alembic migrations (`0001_initial` → `0002_accounts` → `0003_account_security`)
- Single-use hashed account-action tokens

## Content document shape

```json
{
  "schemaVersion": "1.0",
  "kind": "scenario",
  "metadata": {
    "id": "battery-pcf",
    "version": "1.0.0",
    "status": "published",
    "tags": ["foundation", "pcf", "edc"],
    "summary": "One governed Product Carbon Footprint exchange."
  },
  "scenario": {
    "id": "battery-pcf",
    "title": "...",
    "steps": [],
    "challenges": []
  }
}
```

The current six scenarios still originate in TypeScript source modules, but the simulator no longer consumes those files directly. They are wrapped as versioned content documents by `data/content-registry.ts`, validated, filtered by publication status, and only then exposed to the runtime. This lets individual scenarios migrate to JSON/YAML later without rewriting the simulator.

## Authoring workflow

Open `/author` locally and:

1. Load a packaged scenario or start from the template.
2. Edit/import the JSON content document.
3. Fix schema/semantic validation errors.
4. Preview the same step in Business, Architecture and Developer depth.
5. Save a local draft or export canonical JSON.
6. Run `npm run content:validate` before accepting packaged content.

The v0.11 authoring workspace is intentionally local-only. Server-side content publishing, RBAC and revision history come later; draft content cannot silently enter the learner runtime.

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

## Test

Content:

```bash
npm run content:validate
```

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

GitHub Actions verifies migrations, backend tests, content validation, frontend tests, TypeScript, and the Next.js production build.

## Deployment policy for this project

Railway deployment is intentionally deferred until the product is roughly 90% complete. Until then, development stays in GitHub + CI so infrastructure does not distract from product completion.

## Product direction

1. **Simulation first** — teach the mental model with instant feedback.
2. **Business first** — explain the problem before the acronym.
3. **Progressive depth** — reveal architecture and developer detail only when useful.
4. **Practice and proof** — missions, Boss Fights, competencies and achievements verify learning.
5. **Structured content** — scenarios evolve through a versioned authoring contract instead of UI hardcoding.
6. **Durable accounts** — learning evidence can follow the learner across sessions and devices once the API is enabled.
7. **Real lab later** — EDC, DTR and Tractus-X SDK integration come only after the learning product is proven.
