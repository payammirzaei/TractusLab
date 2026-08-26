# TractusLab

**Learn Tractus-X by understanding the business story first, then revealing the architecture and technical details.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. The current version intentionally avoids a real EDC/DTR backend so the learning experience stays fast, visual and approachable.

## Simulator v0.7

- Business-first learning journeys
- Guided mission path with prerequisites and unlocks
- Manager / Architect / Developer depth switcher
- Explain-like-I’m-new mode
- Persistent Dataspace Map
- Event / protocol-facing timeline
- Six scenario-driven simulations:
  - Battery Product Carbon Footprint (PCF / CO₂)
  - Digital Twin discovery
  - Parts Traceability
  - Demand & Capacity
  - Quality Management
  - Circular Economy / Product Passport
- Why-is-this-needed / what-if-we-skip-it explanations
- Contextual glossary
- Break & Fix / Boss Fight mode
- Scoring based on wrong attempts and hint usage
- Best Boss Fight score stored locally
- Competency tracking and mastery gate
- Achievement engine backed by real progress and diagnostic scores
- Local learner profile with summary statistics
- Printable mastery certificate unlocked only after full path completion and three Boss Fights at 70+
- Local learning progress and resume
- Scenario-driven content model
- Node tests + TypeScript + production build CI

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

1. **Simulation first** — teach the mental model with instant feedback.
2. **Business first** — explain the problem before the acronym.
3. **Progressive depth** — reveal architecture and developer detail only when useful.
4. **Practice and proof** — use missions, Boss Fights, competencies and achievements to verify learning.
5. **Real lab later** — connect the same visual model to real Tractus-X components only after the simulator is proven.
