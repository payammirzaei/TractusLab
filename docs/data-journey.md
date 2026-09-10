# Data Journey: the neural dataspace

An isolated `/journey` route teaches a fictional battery carbon-footprint exchange through a living Three.js network. It extends the existing navigation without replacing lessons, auth, APIs, or stored progress.

## Experience

- Eight chapters: Prepare, Publish, Discover, Trust, Policy, Agree, Transfer, Use.
- Explore mode waits for the chapter animation and five understanding checks. Wrong answers explain the misconception; retries never reset the journey. The chapter navigator remains available for free exploration.
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
| Publication | A violet local configuration signal exposes the provider offer |
| Discovery | A request ring arrives, a local check runs, then a metadata card returns |
| Identity | Evidence arrives before the verification rings synchronize |
| Policy | Three orbital rules align; failure disrupts alignment |
| Agreement | Ordered golden request, agreement, verification and finalization signals precede the seal |
| Transfer | Access setup precedes a green retrieval request and a separate green record copy |
| Value | Consumer neural network activates after interpreting and using the received copy; no new transfer |

The visual layout is a metaphor, not deployment topology. The provider catalogue is not a central data warehouse; the agreement seal is not a central server. Company-node rings represent connector gateways.

## Accuracy boundaries

Identity and access checks also happen during catalogue/protocol interactions. Splitting them into a chapter is pedagogical, not a normative order. Negotiation agrees an offered policy; it is not arbitrary dynamic bargaining. Control-plane negotiation and data-plane payload delivery remain distinct. HTTP pull and push differ, and this scene is not a transport-specific implementation. Data sovereignty does not mean a provider can remotely erase a delivered copy. Post-delivery obligations require appropriate controls and governance. DTR is use-case-specific, not mandatory for every data transfer. Example terms are not advertised as universally enforceable built-in EDC rules. The numeric footprint record is fictional and not a complete standardized PCF document.

Primary references reviewed for the conceptual model:

- [Tractus-X EDC catalogue request](https://github.com/eclipse-tractusx/tractusx-edc/blob/main/docs/usage/management-api-walkthrough/04_catalog.md)
- [Tractus-X EDC contract negotiation](https://github.com/eclipse-tractusx/tractusx-edc/blob/main/docs/usage/management-api-walkthrough/05_contractnegotiations.md)
- [Tractus-X EDC transfer processes](https://github.com/eclipse-tractusx/tractusx-edc/blob/main/docs/usage/management-api-walkthrough/06_transferprocesses.md)

## Implementation and performance

### Visual clarity revision

Canvas aspect ratio now determines company separation and camera fit. Catalogue/identity occupy separate upper positions; policy/agreement occupy separate lower positions. A fixed-height stage prevents a long guide from distorting framing. Networks use 42 evenly distributed satellites with unique nearest-neighbor edges instead of 105 randomly packed satellites and duplicate edges. Inactive details recede; labels reveal their role only when active, hovered or focused (compact labels on phones). Distinct chapter captions, one-shot confirmation ripples, an agreement orbit, and a payload wake make outcomes easier to recognize without adding continuous background effects. OS and manual reduced-motion controls suppress the new effects. Projection regression tests cover wide, desktop and phone canvas sizes; these are geometry checks, not browser visual QA.

### Causal sequence revision

`lib/journey-sequence.ts` defines ordered, non-overlapping action windows and derives current/completed/upcoming/blocked states. Requests cannot loop or appear alongside their responses. A single normalized clock in `DataJourney.tsx` drives the WebGL scene, schematic, action readout, progress bar and outcome. Chapter/replay keys discard stale progress before the next effect runs. Pause, speed, hidden-tab suspension and renderer switches preserve the same position.

| Chapter | Teaching order |
| --- | --- |
| Prepare | Create → describe → keep the source |
| Publish | Configure terms → expose local offer → wait for a request |
| Discover | B requests A’s catalogue → A checks identity/access → A returns visible offers → B inspects |
| Trust | Present evidence → verify → establish identity |
| Policy | Review offered terms → compare intended use → choose compatible use |
| Agree | B requests → A validates → A sends agreement → B verifies → A finalizes → seal |
| Transfer | B requests access → A authorizes → access information returns → B fetches → source is read → copy is delivered |
| Use | Received copy → interpret → use → retain obligations |

Trust and Policy are explicitly labeled close-ups of checks in protected catalogue/negotiation interactions, not mandatory separate protocol rounds after discovery. Agreement exchanges remain a compressed successful DSP negotiation. The transfer chapter now explicitly chooses a simplified HTTP pull example; delivered copy is a business outcome, not a claim that the EDC pull process is COMPLETED.

Failure exploration opens a labeled snapshot at the failed check. Earlier actions are complete; later actions never happen. Offline source failure retains the agreement and access setup but prevents payload delivery. Repair/replay starts that chapter again. Direct chapter navigation assumes earlier chapters succeeded, but never pre-completes the selected chapter.

The stage has a prominent current-action display with direction and message type. A numbered connected trail makes waiting, active, completed and blocked actions visible. Catalogue, policy and agreement have distinct core shapes; requests and metadata replies have different packet shapes. Local processing arcs, post-verification alignment, one-shot completion ripples and delayed seal formation attach motion to meaning. Reduced motion keeps the causal steps while suppressing travel and continuous transformations. Schematic rendering shows static directed snapshots from the same sequence model; it no longer draws an always-open data bridge.

`lib/data-journey.ts` owns the deterministic reducer and content. `DataJourney.tsx` owns accessible controls and the shared learning clock. `NeuralScene.tsx` owns the imperative Three.js renderer. The renderer is dynamically imported only on this route; CSS modules isolate the dark experience from legacy global theme utilities.

Geometry/materials are built once, reused between chapters and disposed on unmount. Neural points use batched geometry and instancing. Pixel ratio is capped at 1.6, drawing at 45 fps, and low-motion/paused drawing at 10 fps. Hidden pages do not render or advance. No third-party asset/CDN requests, audio autoplay, remote AI calls, or real data transfers occur. WebGL creation/context failures switch to an operable schematic with the same learning controls. OS reduced-motion preference is respected.

## Validation

Run `npm test`, `npm run typecheck`, `npm run content:validate`, and `npm run build`. In environments that disallow the tsx CLI IPC socket, use `node --import tsx --test tests/*.test.ts` and `node --import tsx scripts/validate-content.ts`. Tests cover chapter structure, guided gating, wrong-answer retries, all fault/repair paths, completion, watch-mode non-mastery, navigation bounds and replay invariants. Sequence regression tests sample every chapter at 1,001 positions, check explicit catalogue/contract/pull prerequisites, prevent false success after faults and cover playback suspension and speed changes. Browser/device visual QA is a separate check; unit/build checks do not prove GPU appearance or mobile frame rate.
