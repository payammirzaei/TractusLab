# TractusLab

**Don’t read the dataspace. Run it.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. Learners start with a business problem, follow the exchange visually, switch between Manager / Architect / Developer depth, then diagnose failures in Boss Fights.

## v0.16 — pre-production hardening

### API protection
- Request IDs on every API response for support/debug correlation
- Security headers: `nosniff`, no-referrer, restrictive permissions policy and same-site resource policy
- Auth/state responses explicitly use `Cache-Control: no-store`
- Request-body size guard before mutating endpoints
- Process-local sliding-window abuse protection for guest sessions, login/register and recovery endpoints
- Rate limiting is intentionally a first-line guard; shared edge/Redis limiting becomes authoritative before multi-replica scaling
- CORS methods and request headers are explicitly allow-listed instead of wildcarded

### Audit trail
- Persistent `audit_events` table via Alembic migration `0005_preproduction_hardening`
- Privacy-conscious audit records never store passwords, bearer tokens or reset tokens
- Role changes include explicit previous/new role evidence
- Account-security, destructive learning resets and content workflow mutations are recorded by the API hardening layer
- Admins can inspect recent audit events from the Authoring Studio instead of opening the database

### Reliability and recovery UX
- Safe GET/HEAD retry helper with bounded exponential backoff and request timeout
- Mutations are deliberately never auto-replayed, preventing duplicate publish/role-change actions
- Published runtime content and admin/content reads use resilient GET behavior
- Global offline/back-online status banner
- Route error recovery screen with retry action
- Root-shell recovery screen
- Product-aware 404 and loading skeleton states
- Packaged learning content remains the non-blocking fallback when server content is unavailable

### Accessibility hardening
- Global skip-to-content link
- Strong keyboard focus treatment
- Shared minimum control height and disabled-state behavior
- Existing reduced-motion support preserved
- Admin panel tabs and network state expose accessible status/ARIA semantics

### Learner profile
- Personal learning dashboard with overall mission-path progress and recommended next mission
- Clear scenario, Boss Fight, competency and achievement summaries
- Better certificate-lock explanation using current learning evidence
- Certificate renders the real application version
- Display-name sync state is visible: local, syncing or synced

### Account and security UX
- Clear guest-to-account explanation before registration
- Accessible labelled fields and browser autofill hints
- Password show/hide and non-blocking strength guidance
- Signed-in overview makes sync, verification and session controls obvious
- Session revocation and “sign out other sessions” require a second click

### Authoring Studio
- Compose mode is the default authoring experience
- Common scenario metadata, business story and learning-step content use structured fields
- Manager / Architect / Developer explanations can be edited without raw JSON
- Advanced JSON remains available for low-level contract fields and power users
- Review-readiness meter surfaces validation, metadata, learning-depth and diagnostic completeness
- Unsaved-draft indicator and browser-leave protection
- Live learner preview remains visible beside the editor on desktop
- Team/Admin drawer supports search, role management, feedback and audit history

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
- Admin Team Access UI for role assignment and audit inspection
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

GitHub Actions verifies migrations, API/security/RBAC/audit/content workflow and account journey tests, scenario content validation, simulator/runtime/resilience/UX tests, TypeScript and the Next.js production build.

## Deployment policy

The codebase is hardened toward the agreed ~90% deployment gate. Railway remains deferred until CI confirms this pre-production batch is green; the first Railway rollout should use one API replica, PostgreSQL, the Next.js web service and production email configuration. Shared edge rate limiting is required before horizontally scaling the API.

## Product principles

1. **Business first** — explain the problem before the acronym.
2. **Simulation first** — make the mental model interactive before connecting real infrastructure.
3. **Progressive depth** — Manager → Architect → Developer without changing the business story.
4. **Practice and proof** — diagnostics and mastery matter more than passive reading.
5. **Content as a product** — scenarios are versioned, reviewable and publishable.
6. **UI/UX is a core requirement** — the next action and current state should be visually obvious without documentation.
7. **Real lab later** — EDC, DTR and deeper Tractus-X infrastructure come after the learning product is mature.
