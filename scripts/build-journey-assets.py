"""Build the Journey asset pack in Blender. Run in Blender's Python console or -P.

Creates its own scene; does not clear or overwrite an existing user scene.
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "models" / "journey"
SOURCE = ROOT / "assets" / "journey"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)

scene = bpy.data.scenes.new("Journey - Asset Studio")
bpy.context.window.scene = scene
collection = bpy.data.collections.new("Journey Models")
scene.collection.children.link(collection)
roots = []


def xyz(p):
    return (p[0], -p[2], p[1])


def material(name, color, metallic=0.25, roughness=0.32, emission=0):
    mat = bpy.data.materials.new("Journey_" + name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Emission Color"].default_value = (*color, 1)
    shader.inputs["Emission Strength"].default_value = emission
    return mat


dark = material("Graphite", (.055, .073, .086), .6)
silver = material("Porcelain", (.7, .79, .83), .35)
mint = material("Provider", (.12, .83, .6), .35, emission=.14)
violet = material("Consumer", (.53, .4, .95), .35, emission=.12)
cyan = material("Control", (.10, .58, .95), .35, emission=.16)
gold = material("Agreement", (.98, .65, .12), .6, emission=.08)
amber = material("Usage", (.98, .30, .075), .3, emission=.12)


def root(name):
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    roots.append(obj)
    return obj


def finish(obj, parent, mat, bevel=0):
    obj.name = parent.name + "_part"
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("Edge highlights", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)
    return obj


def box(parent, pos, size, mat, bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(pos))
    obj = bpy.context.object
    obj.dimensions = (size[0], size[2], size[1])
    return finish(obj, parent, mat, bevel)


def cylinder(parent, pos, radius, depth, mat, axis="y", vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=xyz(pos))
    obj = bpy.context.object
    if axis == "z":
        obj.rotation_euler.x = math.pi / 2
    return finish(obj, parent, mat, .003)


def line(parent, a, b, width, depth, mat):
    mid = tuple((a[i] + b[i]) / 2 for i in range(3))
    distance = (Vector(xyz(b)) - Vector(xyz(a))).length
    obj = box(parent, mid, (width, distance, depth), mat, min(width / 4, .006))
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (Vector(xyz(b)) - Vector(xyz(a))).to_track_quat("Z", "Y")
    return obj


def polygon(parent, points, depth, mat, z=0):
    n = len(points)
    verts = [xyz((x, y, z + dz)) for dz in [-depth / 2, depth / 2] for x, y in points]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    mesh = bpy.data.meshes.new(parent.name + "_shape")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(parent.name + "_shape", mesh)
    collection.objects.link(obj)
    return finish(obj, parent, mat, .004)


def ring(parent, pos, radius, thickness, mat):
    bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=6, location=xyz(pos), major_radius=radius, minor_radius=thickness, rotation=(math.pi / 2, 0, 0))
    return finish(bpy.context.object, parent, mat)


def housing(name, accent):
    obj = root(name)
    # The open bays match the scene's existing animated control/data panels.
    for x in [-.52, .52]:
        box(obj, (x, 0, 0), (.14, 2.18, .58), dark, .024)
        box(obj, (x, 0, .3), (.025, 1.94, .018), accent, .004)
    for y in [-1.02, 0, 1.02]:
        box(obj, (0, y, 0), (.96, .14, .58), silver, .018)
    for y in [-.87, .87]:
        for x in [-.22, 0, .22]:
            box(obj, (x, y, .28), (.11, .025, .018), accent, .004)
    return obj


def business(name, accent):
    obj = root(name)
    box(obj, (0, -.235, 0), (.55, .06, .48), dark, .012)
    for x, h, z in [(-.16, .36, 0), (0, .48, -.02), (.16, .3, .04)]:
        box(obj, (x, -.2 + h / 2, z), (.135, h, .3), dark, .018)
        for y in [-.11, -.025, .06]:
            if y < h - .22:
                box(obj, (x, y, z + .155), (.09, .025, .012), accent, .004)
        box(obj, (x, -.2 + h - .035, z + .156), (.026, .026, .015), accent, .004)
    return obj


business("CompanyA_System", mint)
housing("ProviderEDC", mint)
housing("ConsumerEDC", violet)
business("CompanyB_System", violet)

obj = root("Artifact_Source")
for y in [-.12, 0, .12]:
    cylinder(obj, (0, y, 0), .17, .095, dark)
    cylinder(obj, (0, y + .04, 0), .171, .018, mint)
box(obj, (0, 0, .168), (.11, .27, .018), mint, .008)

obj = root("Artifact_Offer")
for x, y, z in [(-.025, -.025, -.045), (0, 0, 0), (.025, .025, .045)]:
    box(obj, (x, y, z), (.48, .29, .035), silver, .013)
box(obj, (-.155, .025, .068), (.075, .24, .012), cyan, .004)
for y, w in [(.1, .22), (.035, .27), (-.03, .18)]:
    box(obj, (.04, y, .07), (w, .023, .012), dark, .004)

obj = root("Artifact_DSP")
for y, direction in [(.095, 1), (-.095, -1)]:
    line(obj, (-.18, y, 0), (.18, y, 0), .045, .07, silver)
    tip = .2 * direction
    line(obj, (tip - direction * .085, y + .07, .015), (tip, y, .015), .045, .08, cyan)
    line(obj, (tip, y, .015), (tip - direction * .085, y - .07, .015), .045, .08, cyan)

obj = root("Artifact_Trust")
shield = [(-.18, .15), (0, .2), (.18, .15), (.155, -.05), (0, -.2), (-.155, -.05)]
polygon(obj, shield, .065, cyan)
polygon(obj, [(x * .77, y * .77) for x, y in shield], .025, dark, .047)
line(obj, (-.085, -.005, .075), (-.02, -.068, .075), .033, .025, cyan)
line(obj, (-.02, -.068, .075), (.095, .075, .075), .033, .025, cyan)

obj = root("Artifact_Usage")
box(obj, (0, 0, 0), (.36, .42, .07), dark, .025)
for x, knob in [(-.105, -.055), (0, .08), (.105, -.09)]:
    box(obj, (x, 0, .041), (.018, .3, .015), amber, .003)
    box(obj, (x, knob, .06), (.068, .055, .027), amber, .01)

obj = root("Artifact_Agreement")
ring(obj, (0, 0, 0), .245, .034, gold)
for i in range(12):
    a = i * math.tau / 12
    line(obj, (.28 * math.cos(a), .28 * math.sin(a), 0), (.32 * math.cos(a), .32 * math.sin(a), 0), .027, .035, gold)
box(obj, (0, .01, .025), (.29, .34, .045), silver, .012)
line(obj, (-.095, 0, .063), (-.02, -.065, .063), .032, .028, gold)
line(obj, (-.02, -.065, .063), (.1, .09, .063), .032, .028, gold)

obj = root("Artifact_EDR")
ring(obj, (-.16, 0, 0), .135, .032, cyan)
box(obj, (.12, 0, 0), (.34, .055, .064), silver, .006)
for x in [.18, .27]:
    box(obj, (x, -.055, 0), (.05, .1, .065), cyan, .006)

obj = root("Artifact_Payload")
cylinder(obj, (0, 0, 0), .125, .43, dark)
for y in [-.22, .22]:
    cylinder(obj, (0, y, 0), .14, .04, mint)
box(obj, (0, 0, .124), (.08, .28, .019), mint, .007)
for y in [-.08, 0, .08]:
    box(obj, (0, y, .139), (.05, .02, .011), dark, .002)

obj = root("Artifact_Copy")
box(obj, (-.035, .035, -.035), (.22, .40, .045), dark, .012)
box(obj, (.025, -.025, .025), (.22, .40, .045), mint, .012)
for y in [.08, .02]:
    box(obj, (.025, y, .054), (.14, .017, .012), dark, .003)
line(obj, (-.035, -.07, .054), (.015, -.12, .054), .018, .014, dark)
line(obj, (.015, -.12, .054), (.085, -.04, .054), .018, .014, dark)

# Join each asset into one multi-material mesh. Exporter batches faces by material.
for parent in roots:
    bpy.ops.object.select_all(action="DESELECT")
    children = list(parent.children)
    for child in children:
        child.select_set(True)
    bpy.context.view_layer.objects.active = children[0]
    bpy.ops.object.join()
    mesh = bpy.context.object
    mesh.name = parent.name + "_Mesh"
    mesh.data.name = parent.name + "_Geometry"
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    mesh.data.calc_loop_triangles()

stats = {"generator": "Blender " + bpy.app.version_string, "assets": []}
for parent in roots:
    mesh = parent.children[0]
    stats["assets"].append({"name": parent.name, "triangles": len(mesh.data.loop_triangles), "materials": len(set(poly.material_index for poly in mesh.data.polygons))})


def export(path, selected):
    bpy.ops.object.select_all(action="DESELECT")
    for parent in selected:
        parent.select_set(True)
        for child in parent.children:
            child.select_set(True)
    bpy.context.view_layer.objects.active = selected[0]
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True, export_yup=True, export_animations=False, export_cameras=False, export_lights=False, export_materials="EXPORT", export_extras=False)


export(OUT / "edc-journey.glb", roots)
for parent in roots:
    export(SOURCE / (parent.name + ".glb"), [parent])
stats["totalTriangles"] = sum(asset["triangles"] for asset in stats["assets"])
stats["totalPrimitives"] = sum(asset["materials"] for asset in stats["assets"])
stats["packBytes"] = (OUT / "edc-journey.glb").stat().st_size
(SOURCE / "asset-report.json").write_text(json.dumps(stats, indent=2) + "\n", encoding="utf8")

# Arrange the editable source as a labeled studio sheet after exporting origin-centered assets.
layout = [(-3.7, 1.45), (-1.4, 1.45), (1.4, 1.45), (3.7, 1.45)]
layout += [(x, -.65) for x in [-3.4, -1.7, 0, 1.7, 3.4]]
layout += [(x, -2.25) for x in [-2.55, -.85, .85, 2.55]]
labels = ["COMPANY A", "PROVIDER EDC", "CONSUMER EDC", "COMPANY B", "SOURCE", "CATALOGUE OFFER", "DSP MESSAGE", "IDENTITY", "USAGE POLICY", "AGREEMENT", "ACCESS KEY / EDR", "PAYLOAD", "DELIVERED COPY"]


def label(body, x, y, size=.11):
    curve = bpy.data.curves.new(body, "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.size = size
    curve.extrude = 0
    obj = bpy.data.objects.new(body, curve)
    scene.collection.objects.link(obj)
    obj.location = xyz((x, y, .02))
    obj.rotation_euler.x = math.pi / 2
    curve.materials.append(silver)


for parent, (x, y), text in zip(roots, layout, labels):
    parent.location = xyz((x, y, 0))
    if parent.name.startswith("Artifact_") or "System" in parent.name:
        parent.scale = (2.1, 2.1, 2.1)
    label(text, x, y - (1.3 if "EDC" in parent.name else .86))
label("TRACTUSLAB  /  DATA JOURNEY", 0, 3.1, .22)
label("13 MODELS     |     SHARED PBR MATERIALS     |     BLENDER / GLB", 0, -3.6, .11)

world = bpy.data.worlds.new("Journey Studio World")
scene.world = world
world.use_nodes = True
world.node_tree.nodes.get("Background").inputs["Color"].default_value = (.028, .033, .04, 1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .5

camera_data = bpy.data.cameras.new("Asset Sheet Camera")
camera = bpy.data.objects.new("Asset Sheet Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = xyz((0, 1.3, 16))
camera.rotation_euler = (Vector(xyz((0, 0, 0))) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 10
scene.camera = camera
for name, pos, power, size in [("Key", (-3, 5, 6), 1600, 7), ("Fill", (4, 1, 5), 1100, 6)]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = xyz(pos)
    light.rotation_euler = (-light.location).to_track_quat("-Z", "Y").to_euler()

scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 1600
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(SOURCE / "asset-sheet.png")
scene.view_settings.view_transform = "AgX"
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_perspective = "CAMERA"
            area.spaces.active.shading.type = "MATERIAL"

bpy.ops.object.select_all(action="DESELECT")
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / "edc-journey.blend"), copy=True)
bpy.ops.render.render(write_still=True)
print("JOURNEY_ASSETS_COMPLETE", json.dumps(stats))
