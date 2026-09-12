"""Inspect the supplied Blender file without running its embedded scripts."""
import json
from pathlib import Path
import bpy

output = Path(__file__).resolve().parents[1] / "assets" / "journey" / "tractuslab"
output.mkdir(parents=True, exist_ok=True)
report = {
    "file": bpy.data.filepath,
    "collections": [],
    "materials": [],
    "texts": {},
}
for collection in bpy.data.collections:
    objects = list(collection.all_objects)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    report["collections"].append({
        "name": collection.name,
        "objects": len(objects),
        "meshes": len(meshes),
        "polygons": sum(len(obj.data.polygons) for obj in meshes),
        "roots": [{"name": obj.name, "type": obj.type, "location": list(obj.location), "scale": list(obj.scale)} for obj in objects if obj.parent is None],
        "modifiers": sorted(set(mod.type for obj in meshes for mod in obj.modifiers)),
    })
for mat in bpy.data.materials:
    report["materials"].append({"name": mat.name, "nodes": [node.type for node in mat.node_tree.nodes] if mat.use_nodes else []})
for text in bpy.data.texts:
    content = text.as_string()
    report["texts"][text.name] = content
(output / "source-inventory.json").write_text(json.dumps(report, indent=2), encoding="utf8")
print("SOURCE_INSPECTION_DONE", len(report["collections"]), "collections")
