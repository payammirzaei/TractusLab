# Data Journey: the neural dataspace

An isolated `/journey` route teaches a fictional battery carbon-footprint exchange through a living Three.js network. It extends the existing navigation without replacing lessons, auth, APIs, or stored progress.

## Experience

- Eight chapters: Prepare, Publish, Discover, Trust, Policy, Agree, Transfer, Use.
- Explore mode pauses progression at five understanding checks. Wrong answers explain the misconception; retries never reset the journey.
- Watch mode advances automatically without inventing passed checks.
- Story, Architect and Developer explanations share the same scene. Developer fields are explicitly illustrative, not real protocol traces.
- Six keyboard-accessible component buttons expose an inspector.
- Three repairable failures: credential rejection, purpose mismatch, unreachable data endpoint.
- Pause/resume, speed, chapter replay, free chapter navigation, immersive layout, reduced motion and schematic rendering.
- Progress is intentionally session-local and separate from existing account mastery. No database changes or new tracking are introduced.
- New experience copy is English; navigation labels support both existing locales. The route explicitly declares its content language.

## Visual grammar

| Concept | Motion |
| --- | --- |
| Company systems | Seeded neural points and synaptic edges, breathing light |
| Source record | Green faceted core assembles and remains at the provider |
| Publication | Blue metadata signal grows toward the provider catalogue |
| Discovery | Directed query and response pulses |
| Identity | Paired pathways and rings synchronize |
| Policy | Three orbital rules align; failure disrupts alignment |
| Agreement | Bidirectional impulses form a growing golden geometric seal |
| Transfer | Green copy traverses a distinct data-plane path |
| Value | Consumer neural network becomes active |

The visual layout is a metaphor, not deployment topology. The provider catalogue is not a central data warehouse; the agreement seal is not a central server. Company-node rings represent connector gateways.

## Accuracy boundaries

Identity and access checks also happen during catalogue/protocol interactions. Splitting them into a chapter is pedagogical, not a normative order. Negotiation agrees an offered policy; it is not arbitrary dynamic bargaining. Control-plane negotiation and data-plane payload delivery remain distinct. HTTP pull and push differ, and this scene is not a transport-specific implementation. Data sovereignty does not mean a provider can remotely erase a delivered copy. Post-delivery obligations require appropriate controls and governance. DTR is use-case-specific, not mandatory for every data transfer. Example terms are not advertised as universally enforceable built-in EDC rules. The numeric footprint record is fictional and not a complete standardized PCF document.

Primary references reviewed for the conceptual model:

- [Tractus-X EDC contract negotiation](https://github.com/eclipse-tractusx/tractusx-edc/blob/main/docs/usage/management-api-walkthrough/05_contractnegotiations.md)
- [Tractus-X EDC transfer processes](https://github.com/eclipse-tractusx/tractusx-edc/blob/main/docs/usage/management-api-walkthrough/06_transferprocesses.md)

## Implementation and performance

`lib/data-journey.ts` owns the deterministic reducer and content. `DataJourney.tsx` owns accessible controls and an independent learning clock. `NeuralScene.tsx` owns the imperative Three.js renderer. The renderer is dynamically imported only on this route; CSS modules isolate the dark experience from legacy global theme utilities.

Geometry/materials are built once, reused between chapters and disposed on unmount. Neural points use batched geometry and instancing. Pixel ratio is capped at 1.6, drawing at 45 fps, and low-motion/paused drawing at 10 fps. Hidden pages do not render or advance. No third-party asset/CDN requests, audio autoplay, remote AI calls, or real data transfers occur. WebGL creation/context failures switch to an operable schematic with the same learning controls. OS reduced-motion preference is respected.

## Validation

Run `npm test`, `npm run typecheck`, `npm run content:validate`, and `npm run build`. Tests cover chapter structure, guided gating, wrong-answer retries, all fault/repair paths, completion, watch-mode non-mastery, navigation bounds and replay invariants. Browser/device visual QA is a separate check; unit/build checks do not prove GPU appearance or mobile frame rate.
