# TractusLab

**Learn Tractus-X by understanding the business story first, then revealing the architecture and technical details.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. It combines guided scenarios, progressive technical depth, diagnostics, learner progress, secure accounts, and a structured scenario-authoring workflow.

## v0.12 — server content workflow + RBAC

### Learning product
- Six scenario-driven simulations
- Business / Architecture / Developer depth
- Explain-like-I’m-new mode
- Dataspace map + event/protocol timeline
- Guided mission path and prerequisites
- Boss Fights, scoring, competencies and achievements
- Learner profile and mastery certificate
- Offline local cache with optional server synchronization

### Accounts and security
- Guest-to-account upgrade without losing learning progress
- Argon2 password hashing
- Opaque revocable bearer sessions
- Forgot/reset password
- Email verification
- Change password
- Active session management
- Hashed, expiring, single-use account-action tokens
- Alembic migrations

### Content system
- Versioned scenario content contract (`schemaVersion: 1.0`)
- Published-content registry used by the simulator
- Local Authoring Studio with live validation and learner preview
- JSON import/export and local draft persistence
- Server-side scenario content and revision history
- Strict review workflow: Draft → In review → Approved → Published
- Changes-requested loop back to authors
- Public read endpoint for published server content
- Content validation before server storage

### RBAC
Roles are intentionally separated:

- `learner` — learning product only
- `author` — create drafts, create revisions, submit for review
- `reviewer` — review and approve/request changes
- `admin` — publish/archive content and manage content roles

No user receives an authoring role automatically. `CONTENT_ADMIN_EMAILS` can bootstrap explicitly listed admin emails for local/future deployment setup. Admins can then assign roles from the Authoring Studio Team Access drawer.

## Content workflow

```text
Author
  ↓
Draft / Revision
  ↓
Submit for review
  ↓
Reviewer
  ├── Request changes → Author
  └── Approve
          ↓
        Admin
          ↓
       Publish
```

The local editor remains fast and usable without the API. Server workflow appears only when `NEXT_PUBLIC_API_URL` is configured and the signed-in account has a content role.

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

For local SQLite development, omit `DATABASE_URL`.

To bootstrap an initial content admin locally:

```env
CONTENT_ADMIN_EMAILS=you@example.com
```

That email becomes `admin` after registration/login. Keep the value explicit; there is no first-user-is-admin behavior.

## Email development

Before SMTP is configured:

```env
EXPOSE_DEV_TOKENS=true
EMAIL_DELIVERY_MODE=disabled
```

For real delivery later:

```env
EMAIL_DELIVERY_MODE=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=noreply@example.com
SMTP_USE_TLS=true
```

## Validation and tests

```bash
npm run content:validate
npm test
npm run typecheck
npm run build
```

Backend:

```bash
PYTHONPATH=apps/api pytest -q apps/api/tests
```

Migrations:

```bash
cd apps/api
DATABASE_URL=sqlite+pysqlite:///./migration_test.db alembic upgrade head
```

GitHub Actions verifies migrations, API/security/RBAC/content workflow tests, scenario content validation, simulator tests, TypeScript and the Next.js production build.

## Deployment policy

Railway deployment is intentionally deferred until the product is roughly 90% complete. Until then, development remains GitHub + CI focused.

## Product direction

1. **Business first** — explain the problem before the acronym.
2. **Simulation first** — make the mental model interactive before connecting real infrastructure.
3. **Progressive depth** — Manager → Architect → Developer without changing the business story.
4. **Practice and proof** — diagnostics and mastery matter more than passive reading.
5. **Content as a product** — scenarios are versioned, reviewable and publishable instead of hard-coded forever.
6. **UI/UX matters** — workflow state, next actions and learner context should be visually obvious without documentation.
7. **Real lab later** — EDC, DTR and deeper Tractus-X infrastructure come after the learning product is mature.
