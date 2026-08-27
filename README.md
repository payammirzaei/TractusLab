# TractusLab

**Don’t read the dataspace. Run it.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. Learners start with a business problem, follow the exchange visually, switch between Manager / Architect / Developer depth, then diagnose failures in Boss Fights.

## v0.15 — profile, account and authoring UX overhaul

### Learner profile
- Profile redesigned as a personal learning dashboard instead of a passive badge page
- Overall mission-path progress and recommended next mission
- Clear scenario, Boss Fight, competency and achievement summaries
- Unlocked-only achievement view with optional locked-achievement reveal
- Better certificate-lock explanation using current learning evidence
- Certificate now renders the real application version instead of a stale hard-coded version
- Display-name sync state is visible: local, syncing or synced

### Account and security UX
- Shared product navigation and consistent account surfaces
- Clear guest-to-account explanation before registration
- Accessible labelled fields and browser autofill hints
- Password show/hide and non-blocking strength guidance
- Loading, success and error states use the shared visual system
- Signed-in account overview makes sync, verification and session controls obvious
- Session revocation and “sign out other sessions” require a second click
- Session loading and empty states are explicit

### Authoring Studio
- Compose mode is now the default authoring experience
- Common scenario metadata, business story and learning-step content can be edited through structured fields
- Manager / Architect / Developer explanations can be edited without touching raw JSON
- Advanced JSON remains available for low-level contract fields and power users
- Review-readiness meter surfaces validation, metadata, learning-depth and diagnostic completeness
- Unsaved-draft indicator and browser-leave protection
- Live learner preview remains visible beside the editor on desktop
- Team-access drawer now supports search, role descriptions and update feedback

### Journey hardening
- API integration test covers the full guest → progress → account → logout → login → restored learning evidence journey
- Browser acceptance tests cover desktop and mobile learner flows, persisted progress, Boss Fights, account registration/login, authoring drafts, 404 recovery and viewport containment
- Global loading, recoverable error and not-found states are present
- Keyboard skip navigation, focus treatment and reduced-motion support are included
- Production security headers and a web health endpoint are enabled
- Published scenario content has enforceable completeness checks
- Production Web and API containers are built and smoke-tested in CI
- API container runs as a non-root user and applies Alembic migrations before startup
- Existing content, runtime, RBAC, simulator and migration checks remain in CI

### Learner experience
- Shared learner navigation across Home, Mission Path, Scenario Hub, Simulator and Profile
- Responsive dark industrial visual system with consistent surfaces, focus states and reduced-motion support
- Scenario Hub discovery dashboard with search, progress filters, recommended next scenario, loading skeletons and empty states
- Two-step local progress reset to prevent accidental deletion
- Mission Path visual milestone timeline with clear locked / ready / in-progress / complete states
- Simulator shell optimized for lower cognitive load on desktop and mobile
- Mobile Simulator shows the current question and action first; map/timeline live in an expandable Visual Workspace
- Boss Fight interface prioritizes symptom, diagnosis options and live score

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
- Local Authoring Studio with schema validation, structured Compose mode, live preview, Advanced JSON, import/export and local drafts
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
npm run test:e2e
```

GitHub Actions verifies migrations, API/security/RBAC/content workflow and end-to-end account journey tests, scenario content validation, simulator/runtime/UX tests, TypeScript, the Next.js production build, browser acceptance journeys, and production container builds/smoke tests.

## Deployment policy

Railway deployment is intentionally deferred until the product reaches the release gate: all planned product and UX work complete, all automated checks green, production containers smoke-tested, no known release-blocking defects, and the branch is considered 100% ready. Until then, Railway remains untouched.

## Product principles

1. **Business first** — explain the problem before the acronym.
2. **Simulation first** — make the mental model interactive before connecting real infrastructure.
3. **Progressive depth** — Manager → Architect → Developer without changing the business story.
4. **Practice and proof** — diagnostics and mastery matter more than passive reading.
5. **Content as a product** — scenarios are versioned, reviewable and publishable.
6. **UI/UX is a core requirement** — the next action and current state should be visually obvious without documentation.
7. **Real lab later** — EDC, DTR and deeper Tractus-X infrastructure come after the learning product is mature.
