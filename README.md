# TractusLab

**Don’t read the dataspace. Run it.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. Learners start with a business problem, follow the exchange visually, switch between Manager / Architect / Developer depth, then diagnose failures in Boss Fights.

## v0.14 — learner UX overhaul

### Learner experience
- Shared learner navigation across Home, Mission Path, Scenario Hub, Simulator and Profile
- Responsive dark industrial visual system with consistent surfaces, focus states and reduced-motion support
- Scenario Hub redesigned as a discovery dashboard with search, progress filters, recommended next scenario, loading skeletons and empty states
- Two-step local progress reset to prevent accidental deletion
- Mission Path redesigned as a visual milestone timeline with clear locked / ready / in-progress / complete states
- Competency and mastery summaries kept visible alongside the path
- Simulator shell redesigned for lower cognitive load
- Mobile Simulator shows the current question and action first; map/timeline move into an expandable Visual Workspace
- Desktop Simulator keeps the visual workspace beside a sticky learning panel
- Mobile scenario selector replaces cramped scenario pills
- Horizontal step jump rail for fast navigation
- Clearer beginner-mode and learning-depth controls
- Boss Fight interface now prioritizes symptom, diagnosis options and live score

### Learning product
- Six business scenarios: Battery PCF, Digital Twin, Traceability, Demand & Capacity, Quality and Circular Economy
- Manager / Architect / Developer depth
- Explain-like-I’m-new mode
- Dataspace exchange cockpit + event/protocol timeline
- Guided mission path and prerequisites
- Boss Fights, scoring, competencies and achievements
- Learner profile and mastery certificate
- Offline local cache with optional server synchronization

### Runtime content
- Scenario source content lives under `content/`
- Six independent versioned content documents live under `content/documents/`
- Packaged content renders immediately
- When `NEXT_PUBLIC_API_URL` is configured, valid published server revisions can overlay packaged scenarios without blocking the learner
- Invalid, mismatched or non-published server documents are rejected and packaged content remains the fallback

### Accounts and security
- Guest-to-account upgrade without losing progress
- Argon2 password hashing
- Opaque revocable bearer sessions
- Forgot/reset password and change password
- Email verification
- Active session management
- Hashed, expiring, single-use account-action tokens
- Alembic migrations

### Content workflow + RBAC
- Local Authoring Studio with schema validation, preview, JSON import/export and local drafts
- Server-side content revisions and history
- Draft → Review → Approved → Published workflow
- `learner`, `author`, `reviewer`, `admin` roles
- Admin Team Access UI for role assignment
- Public endpoint for published content

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

## Validation and tests

```bash
npm run content:validate
npm test
npm run typecheck
npm run build
PYTHONPATH=apps/api pytest -q apps/api/tests
```

GitHub Actions verifies migrations, API/security/RBAC/content workflow tests, scenario content validation, simulator/runtime tests, TypeScript and the Next.js production build.

## Deployment policy

Railway deployment is intentionally deferred until the product is roughly 90% complete. Until then, development remains GitHub + CI focused.

## Product principles

1. **Business first** — explain the problem before the acronym.
2. **Simulation first** — make the mental model interactive before connecting real infrastructure.
3. **Progressive depth** — Manager → Architect → Developer without changing the business story.
4. **Practice and proof** — diagnostics and mastery matter more than passive reading.
5. **Content as a product** — scenarios are versioned, reviewable and publishable.
6. **UI/UX is a core requirement** — the next action and current state should be visually obvious without documentation.
7. **Real lab later** — EDC, DTR and deeper Tractus-X infrastructure come after the learning product is mature.
