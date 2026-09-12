# EDC scene visual hierarchy

The Data Journey scene is deliberately topology-first:

1. Company A business systems stay peripheral.
2. Provider Tractus-X EDC is the first protocol actor.
3. Consumer Tractus-X EDC is the second protocol actor.
4. Company B business systems stay peripheral.

Cross-company DSP, catalogue, contract and EDR traffic is rendered only between EDC control planes. Authorized fetches and payload transfer are rendered only between EDC data planes. Camera framing stays centered so both connectors remain visible in every protocol chapter.

## Optional Blender GLB pack

Export a single self-contained glTF 2.0 Binary file to
`public/models/journey/edc-journey.glb`. `journey-assets.ts` is the naming and sizing
contract. Each named object (a mesh or an Empty containing meshes) is optional;
partial packs work. Names are case-sensitive and must be unique. Keep these roots
as siblings, not nested inside one another. Other objects are not attached.

| Blender object / Empty name | Role | Maximum fitted size (Three.js X, Y, Z) |
| --- | --- | --- |
| `CompanyA_System` | Provider business core | 0.56, 0.56, 0.56 |
| `CompanyB_System` | Consumer business core | 0.56, 0.56, 0.56 |
| `ProviderEDC` | Provider connector housing | 1.18, 2.18, 0.58 |
| `ConsumerEDC` | Consumer connector housing | 1.18, 2.18, 0.58 |
| `Artifact_Source` | Original provider record | 0.38, 0.38, 0.38 |
| `Artifact_Offer` | Published catalogue metadata | 0.58, 0.37, 0.16 |
| `Artifact_DSP` | Protocol message | 0.48, 0.48, 0.10 |
| `Artifact_Trust` | Identity evidence | 0.40, 0.40, 0.40 |
| `Artifact_Usage` | Usage policy | 0.46, 0.46, 0.46 |
| `Artifact_Agreement` | Agreement seal | 0.66, 0.66, 0.66 |
| `Artifact_EDR` | Access information | 0.63, 0.40, 0.10 |
| `Artifact_Payload` | Record in transit | 0.28, 0.55, 0.28 |
| `Artifact_Copy` | Delivered consumer copy | 0.28, 0.55, 0.28 |

### Coordinate and visual contract

- Use Blender's standard glTF **+Y Up** export conversion. In the loaded scene,
  +X is right, +Y is up and +Z faces the camera (Blender -Y faces the camera).
- Apply rotation and scale before export. Center each root around its geometry.
  Root translation is discarded; parent transforms outside the root are ignored.
  Child transforms and the root's exported rotation/scale are preserved.
- The loader centers geometry and uniformly fits it inside the listed box without
  stretching. Model to those proportions, especially for connector housings.
  The fitted center becomes the animation pivot.
- EDC models replace only the wireframe enclosure and side spine. Keep openings
  for the runtime control/data panels: centers `(0, +0.5, 0)` and `(0, -0.5, 0)`,
  each `0.82 x 0.50 x 0.64` in fitted Three.js units. Model an open frame or recessed
  housing, with no front plate covering those panels. The animated panels and
  halos remain procedural so active planes still communicate the current step.
- Business models replace only the central core; the contextual wire shell stays.
  Artifact models replace all geometry within their existing animation group.
- Use Principled BSDF materials exported as metallic/roughness PBR. Prefer solid
  colors with modest emission: provider mint, consumer lavender, control cyan,
  payload green, agreement gold, usage amber. Avoid baked text, lights and cameras.
  All readable labels remain HTML overlays.
- Export static meshes. Rigs and morph targets are rejected per object. Animation
  clips are not played: the journey's shared clock owns all movement, pause,
  reduced motion, failure snapshots and chapter visibility.

### Export and performance

1. Select named roots and all their children. Export glTF 2.0, format **glTF Binary
   (.glb)**, Selected Objects, +Y Up, materials and normals. Apply required modifiers.
2. Embed PNG/JPEG textures and mesh buffers. Do not reference external files.
   Disable animations, cameras, lights and Draco compression. This first pass has
   no Draco, Meshopt or KTX2 decoder setup; packs requiring them fall back.
3. Aim for at most 2 MB total, 25,000 triangles and 30 mesh/material primitives
   across the pack. Reuse materials, merge static parts by material and prefer
   vertex colors or one texture atlas up to 1024 x 1024. These are authoring targets,
   not enforced limits. GLB by itself does not reduce draw calls or GPU cost.
4. Open `/journey`, inspect all eight chapters, then check a phone viewport,
   pause/resume, reduced motion and the schematic switch. Compare frame time and
   visual clarity against the procedural version before expanding asset detail.

The procedural scene appears immediately while loading. Missing files, failed
downloads and parsing failures retain the complete procedural view. Missing,
empty, unsupported or ambiguously named objects retain their individual fallback.
Accepted meshes share the pack's materials, textures and geometry across clones;
resources are disposed once on scene cleanup. Pending fetches are aborted, and
late parse results are disposed without attaching to an unmounted scene. WebGL
context loss also cleans up the asset layer before showing the schematic.

The included first asset pack contains all 13 named roots: server clusters, open
connector housings, a source database, catalogue cards, protocol arrows, identity
shield, policy sliders, agreement seal, EDR key, payload canister and delivered
record. It has 15,424 triangles and 29 material primitives in about 1 MB, with
shared materials and no texture downloads.

Editable source: `assets/journey/edc-journey.blend`. Individual GLB exports, an
`asset-sheet.png` preview and `asset-report.json` are alongside it. Rebuild using
`scripts/build-journey-assets.py` inside Blender (or `blender --background
--factory-startup --python scripts/build-journey-assets.py`). The script creates a
separate scene, exports origin-centered models, then arranges a labeled preview
in the editable source. Export only the named models when editing manually;
the preview camera, lights and labels are excluded from the website pack.

References: [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
and [Blender glTF exporter](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html).
