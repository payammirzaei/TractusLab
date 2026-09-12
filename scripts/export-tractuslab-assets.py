"""Export the existing tractuslab.blend models, never execute its embedded code.

Run this script in Blender with the repository's tractuslab.blend open.
The original scene and file remain untouched; export copies get their own scene.
"""
import hashlib
import json
from pathlib import Path
import bpy
from mathutils import Vector

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "tractuslab.blend"
assert Path(bpy.data.filepath).resolve() == SOURCE.resolve(), "Open tractuslab.blend first"
OUT = PROJECT / "public" / "models" / "journey" / "tractuslab"
ART = PROJECT / "assets" / "journey" / "tractuslab"
OUT.mkdir(parents=True, exist_ok=True)
ART.mkdir(parents=True, exist_ok=True)

MAPPING = {
    "Company_A": "CompanyA_System", "Provider_EDC": "ProviderEDC",
    "Consumer_EDC": "ConsumerEDC", "Company_B": "CompanyB_System",
    "Source": "Artifact_Source", "Catalogue_Offer": "Artifact_Offer",
    "DSP_Message": "Artifact_DSP", "Identity": "Artifact_Trust",
    "Usage_Policy": "Artifact_Usage", "Agreement": "Artifact_Agreement",
    "Access_Key_EDR": "Artifact_EDR", "Payload": "Artifact_Payload",
    "Delivered_Copy": "Artifact_Copy",
}

bpy.context.view_layer.update()
records = []
for collection_name, target_name in MAPPING.items():
    collection = bpy.data.collections[collection_name]
    root = bpy.data.objects["TL_ROOT_" + collection_name]
    inverse = root.matrix_world.inverted()
    records.append((target_name, root.location.copy(), [
        (obj, inverse @ obj.matrix_world.copy()) for obj in collection.all_objects
        if obj.type in {"MESH", "CURVE"} and "GlassShell" not in obj.name and not obj.name.endswith("_Cabinet")
    ]))

scene = bpy.data.scenes.new("TractusLab - Web Export")
bpy.context.window.scene = scene
models = bpy.data.collections.new("TractusLab Web Models")
scene.collection.children.link(models)
materials = {}


def web_material(source):
    name = source.name
    aliases = {"TL_MAT_Black": "TL_MAT_Dark", "TL_MAT_Dark2": "TL_MAT_Dark",
               "TL_MAT_Steel": "TL_MAT_Silver"}
    name = aliases.get(name, name)
    if name not in materials:
        mat = bpy.data.materials.get(name, source).copy()
        mat.name = "WEB_" + name
        shader = mat.node_tree.nodes.get("Principled BSDF") if mat.use_nodes else None
        if shader:
            shader.inputs["Transmission Weight"].default_value = 0
            shader.inputs["Metallic"].default_value = min(.65, shader.inputs["Metallic"].default_value)
            shader.inputs["Emission Strength"].default_value = min(.6, shader.inputs["Emission Strength"].default_value)
            # Glass accents become solid colored indicators, avoiding transmission passes.
            shader.inputs["Alpha"].default_value = 1
        materials[name] = mat
    return materials[name]


def triangles(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


report = {"source": "tractuslab.blend", "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
          "blender": bpy.app.version_string, "assets": [],
          "processing": ["Export existing collection geometry only", "Omit presentation and text objects",
                         "Omit outer glass shells and occluding cabinet fronts", "One-segment bevels", "Merge static parts",
                         "Consolidate neutral materials", "Cap emission and disable transmission", "Simplify dense meshes"]}
roots = []
layout = []
for target_name, position, objects in records:
    source_count = len(objects)
    parent = bpy.data.objects.new(target_name, None)
    models.objects.link(parent)
    groups = {"Body": [], "ControlPlane": [], "DataPlane": []}
    for original, transform in objects:
        obj = original.copy()
        obj.data = original.data.copy()
        obj.parent = None
        models.objects.link(obj)
        obj.matrix_world = transform
        for modifier in obj.modifiers:
            if modifier.type == "BEVEL":
                modifier.segments = 1
        bpy.context.view_layer.update()
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=bpy.context.evaluated_depsgraph_get())
        baked = bpy.data.objects.new(target_name + "_part", mesh)
        models.objects.link(baked)
        baked.matrix_world = transform
        # Only the temporary duplicate is removed, never the supplied model.
        bpy.data.objects.remove(obj, do_unlink=True)
        for index, material in enumerate(mesh.materials):
            if material:
                mesh.materials[index] = web_material(material)
        group = "ControlPlane" if "ControlPlaneMarker" in original.name else "DataPlane" if "DataPlaneMarker" in original.name else "Body"
        groups[group].append(baked)
    parts = []
    for group, objects in groups.items():
        if not objects:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = target_name + "_" + group
        budget = 10000 if target_name.endswith("EDC") else 5000
        count = triangles(obj)
        if group == "Body" and count > budget:
            modifier = obj.modifiers.new("Web triangle budget", "DECIMATE")
            modifier.ratio = budget / count
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.parent = parent
        parts.append(obj)
    roots.append(parent)
    layout.append(position)
    report["assets"].append({"node": target_name, "sourceObjects": source_count,
                             "triangles": sum(triangles(obj) for obj in parts),
                             "primitives": sum(len(set(poly.material_index for poly in obj.data.polygons)) for obj in parts)})
    print("WEB_MODEL_READY", target_name, report["assets"][-1]["triangles"])


def export(path, selected):
    bpy.ops.object.select_all(action="DESELECT")
    for root in selected:
        root.select_set(True)
        for child in root.children:
            child.select_set(True)
    bpy.context.view_layer.objects.active = selected[0]
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
                             export_yup=True, export_animations=False, export_cameras=False,
                             export_lights=False, export_extras=False)


export(OUT / "edc-journey.glb", roots)
for root in roots:
    export(OUT / (root.name + ".glb"), [root])
report["packBytes"] = (OUT / "edc-journey.glb").stat().st_size
report["triangles"] = sum(item["triangles"] for item in report["assets"])
report["primitives"] = sum(item["primitives"] for item in report["assets"])
(ART / "export-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")

for root, position in zip(roots, layout):
    root.location = position
camera_data = bpy.data.cameras.new("Web Preview Camera")
camera = bpy.data.objects.new("Web Preview Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -35, 8)
camera.rotation_euler = (Vector((0, 0, .3)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 24
scene.camera = camera
scene.world = bpy.data.worlds.new("Web Preview World")
scene.world.use_nodes = True
scene.world.node_tree.nodes.get("Background").inputs["Color"].default_value = (.035, .035, .035, 1)
scene.world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .6
for name, location, energy in [("Key", (-8, -10, 12), 2400), ("Fill", (9, -7, 8), 1800)]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = 10
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (-light.location).to_track_quat("-Z", "Y").to_euler()
scene.render.engine = "CYCLES"
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(ART / "preview.png")
bpy.ops.wm.save_as_mainfile(filepath=str(ART / "web-export.blend"), copy=True)
bpy.ops.render.render(write_still=True)
print("TRACTUSLAB_EXPORT_COMPLETE", report["triangles"], report["packBytes"])
