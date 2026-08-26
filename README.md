# TractusLab

**Learn Tractus-X by understanding the business story first, then revealing the architecture and technical details.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. The current version intentionally avoids a real EDC/DTR backend so the learning experience stays fast, visual and approachable.

## Simulator v1

- Business-first learning flow
- Manager / Architect / Developer depth switcher
- Persistent Dataspace Map with highlighted components
- Six scenario-driven simulations:
  - Battery Product Carbon Footprint (PCF / CO₂)
  - Digital Twin discovery
  - Parts Traceability
  - Demand & Capacity
  - Quality Management
  - Circular Economy / Product Passport
- Why-is-this-needed / what-if-we-skip-it explanations
- Contextual glossary
- Break & Fix challenges with hints and root-cause feedback
- Local learning progress persisted in the browser
- Scenario hub with completion and solved-challenge status
- Pure simulation/progress logic with Node tests
- GitHub Actions CI for tests, type-checking and Next.js builds

## Run locally

```bash
npm install
npm run dev
```

## Test

```bash
npm test
npm run typecheck
npm run build
```

## Product direction

The roadmap is intentionally layered:

1. **Simulation first** — teach the mental model with instant feedback.
2. **Learning depth** — explain the same event for managers, architects and developers.
3. **Break & Fix** — teach failure diagnosis instead of passive reading.
4. **Real lab later** — connect the same visual model to real Tractus-X components only after the simulator is proven.
