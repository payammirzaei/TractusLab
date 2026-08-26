# TractusLab

**Learn Tractus-X by understanding the business story first, then revealing the architecture and technical details.**

TractusLab is an interactive, simulation-first learning environment for Tractus-X and dataspace concepts. The first version intentionally avoids a real EDC/DTR backend so the learning experience stays fast, visual and approachable.

## Simulator v1

- Business-first manager journey
- Manager / Architect / Developer depth switcher
- Persistent Dataspace Map with highlighted components
- Scenario hub with direct scenario links
- Battery Product Carbon Footprint (PCF / CO₂) scenario
- Digital Twin discovery scenario
- Parts Traceability / quality-incident scenario
- Demand & Capacity Management scenario
- Why-is-this-needed / what-if-we-skip-it explanations
- Contextual glossary
- Break & Fix challenges with hints and root-cause feedback
- Scenario-driven content model
- Local-first progress model ready for UI persistence
- Pure simulator logic with automated tests

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run typecheck
npm run build
```

CI runs the same verification on pull requests and can also be triggered manually.

## Product direction

The roadmap is intentionally layered:

1. **Simulation first** — teach the mental model with instant feedback.
2. **Learning depth** — explain the same event for managers, architects and developers.
3. **Break & Fix** — teach failure diagnosis instead of passive reading.
4. **Real lab later** — connect the same visual model to real Tractus-X components only after the simulator is proven.
