# Journey models

- `edc-journey.blend`: editable Blender source and labeled studio scene.
- `*.glb`: individual models, centered at the origin.
- `asset-sheet.png`: rendered overview.
- `asset-report.json`: Blender version, triangle counts, primitives and pack size.

The website uses the combined `public/models/journey/edc-journey.glb` pack.
Regenerate it with `scripts/build-journey-assets.py` in Blender. Source meshes use
shared PBR materials, beveled edges and no downloaded assets or external textures.
The studio labels and lighting are not included in the GLB files.
