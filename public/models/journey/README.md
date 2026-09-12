# Journey Blender asset pack

`edc-journey.glb` contains 13 Blender-authored models. The page loads the pack only
when the Three.js journey renderer mounts. Individual exports, the editable
`edc-journey.blend`, a preview sheet and the export report live in `assets/journey`.

Rebuild with `scripts/build-journey-assets.py` in Blender. The shipped pack uses
15,424 triangles, 29 material primitives and no external textures (about 1 MB).

See [the scene authoring contract](../../../components/journey/README-EDC-SCENE.md)
for object names, dimensions, materials, export settings and performance targets.
