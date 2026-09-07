# blender/build_assets.py
"""
Headless Blender asset generator for Ghost Hunter AR.

    blender --background --factory-startup --python blender/build_assets.py

Generates every .blend in assets/source/:
    gravestone, cross, pillar, rock, tree, fence, gate, mausoleum, ghost

Conventions:
    - Z-up, base of every prop at z=0 (glTF exporter converts to Y-up).
    - Ghost is exported as separate nodes (GhostBody / GhostEyeL / GhostEyeR)
      so the runtime can recolor the body per ghost type.
"""

import math
import os
import random

import bmesh
import bpy

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "assets", "source"))


def new_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def save(name: str) -> None:
    os.makedirs(SOURCE_DIR, exist_ok=True)
    path = os.path.join(SOURCE_DIR, f"{name}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=path)
    print(f"[build] saved {path}")


def make_mat(name: str, color: tuple[float, float, float], rough: float = 0.85):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    return mat


def link(obj: bpy.types.Object) -> bpy.types.Object:
    bpy.context.scene.collection.objects.link(obj)
    return obj


def box(
    name: str,
    sx: float,
    sy: float,
    sz: float,
    x: float = 0.0,
    y: float = 0.0,
    z: float = 0.0,
    mat=None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx, sy, sz)
    if mat:
        obj.data.materials.append(mat)
    return obj


def cyl(
    name: str,
    r1: float,
    r2: float,
    depth: float,
    x: float = 0.0,
    y: float = 0.0,
    z: float = 0.0,
    verts: int = 24,
    mat=None,
) -> bpy.types.Object:
    # Blender 5.x cylinders have no taper — a two-radius cone is the same surface.
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts, radius1=r1, radius2=r2, depth=depth, location=(x, y, z)
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def sphere(
    name: str,
    r: float,
    x: float = 0.0,
    y: float = 0.0,
    z: float = 0.0,
    segments: int = 16,
    rings: int = 12,
    mat=None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=r, segments=segments, ring_count=rings, location=(x, y, z)
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def cone(
    name: str,
    r: float,
    depth: float,
    x: float = 0.0,
    y: float = 0.0,
    z: float = 0.0,
    verts: int = 4,
    mat=None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts, radius1=r, radius2=0.0, depth=depth, location=(x, y, z)
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def ico(name: str, r: float, subdiv: int = 2, x=0.0, y=0.0, z=0.0, mat=None):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdiv, radius=r, location=(x, y, z)
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def set_smooth(obj: bpy.types.Object, smooth: bool = True) -> None:
    for poly in obj.data.polygons:
        poly.use_smooth = smooth


def join_all(objs: list[bpy.types.Object], name: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    return joined


def bevel(obj: bpy.types.Object, width: float = 0.008, segments: int = 2) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    bpy.ops.object.modifier_apply(modifier=mod.name)


def jitter_verts(obj: bpy.types.Object, amount: float, seed: int = 0) -> None:
    random.seed(seed)
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for v in bm.verts:
        v.co.x += random.uniform(-amount, amount)
        v.co.y += random.uniform(-amount, amount)
        v.co.z += random.uniform(-amount, amount)
    bm.to_mesh(me)
    bm.free()


def jag_top(obj: bpy.types.Object, z_min: float, amount: float = 0.08, seed: int = 1) -> None:
    random.seed(seed)
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for v in bm.verts:
        if v.co.z >= z_min:
            v.co.z += random.uniform(-amount, amount)
            shrink = random.uniform(0.7, 1.05)
            v.co.x *= shrink
            v.co.y *= shrink
    bm.to_mesh(me)
    bm.free()


def lathe(name: str, profile: list[tuple[float, float]], steps: int = 28) -> bpy.types.Object:
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0.0, z)) for (r, z) in profile]
    for i in range(len(verts) - 1):
        bm.edges.new((verts[i], verts[i + 1]))
    bmesh.ops.spin(
        bm,
        geom=bm.verts[:] + bm.edges[:],
        axis=(0.0, 0.0, 1.0),
        cent=(0.0, 0.0, 0.0),
        angle=math.radians(360.0),
        steps=steps,
        use_duplicate=False,
    )
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    obj = bpy.data.objects.new(name, me)
    return link(obj)


# ── Assets ────────────────────────────────────────────────────────────────────


def build_gravestone() -> None:
    new_scene()
    stone = make_mat("StoneGrey", (0.55, 0.58, 0.64), 0.9)
    plinth = box("Plinth", 0.42, 0.16, 0.1, z=0.05, mat=stone)
    slab = box("Slab", 0.5, 0.11, 0.8, z=0.5, mat=stone)
    arch = cyl("Arch", 0.25, 0.25, 0.11, z=0.9, verts=24, mat=stone)
    arch.rotation_euler = (math.radians(90), 0, 0)
    obj = join_all([plinth, slab, arch], "Gravestone")
    bevel(obj, 0.01)
    save("gravestone")


def build_cross() -> None:
    new_scene()
    stone = make_mat("StoneDark", (0.42, 0.45, 0.52), 0.9)
    base = box("Base", 0.32, 0.16, 0.14, z=0.07, mat=stone)
    stem = box("Stem", 0.08, 0.07, 0.92, z=0.6, mat=stone)
    arm = box("Arm", 0.42, 0.07, 0.08, z=0.78, mat=stone)
    obj = join_all([base, stem, arm], "Cross")
    bevel(obj, 0.008)
    save("cross")


def build_pillar() -> None:
    new_scene()
    stone = make_mat("StoneGrey", (0.58, 0.6, 0.66), 0.88)
    base = box("Base", 0.52, 0.52, 0.14, z=0.07, mat=stone)
    column = cyl("Column", 0.2, 0.18, 1.35, z=0.82, verts=20, mat=stone)
    jag_top(column, 1.25, 0.09, seed=7)
    cap = box("Cap", 0.46, 0.46, 0.12, z=1.5, mat=stone)
    cap.location.z = 0.26
    obj = join_all([base, column, cap], "Pillar")
    bevel(obj, 0.01)
    save("pillar")


def build_rock() -> None:
    new_scene()
    stone = make_mat("StoneGrey", (0.48, 0.5, 0.55), 0.95)
    rock = ico("Rock", 0.6, subdiv=2, z=0.32, mat=stone)
    jitter_verts(rock, 0.14, seed=3)
    rock.scale = (1.15, 0.9, 0.62)
    set_smooth(rock)
    bpy.ops.object.select_all(action="DESELECT")
    rock.select_set(True)
    bpy.context.view_layer.objects.active = rock
    bpy.ops.object.transform_apply(scale=True)
    save("rock")


def build_tree() -> None:
    new_scene()
    bark = make_mat("Bark", (0.22, 0.17, 0.13), 1.0)
    trunk = cyl("Trunk", 0.24, 0.09, 2.5, z=1.25, verts=10, mat=bark)
    parts = [trunk]
    random.seed(11)
    for i in range(5):
        tilt = random.uniform(0.55, 1.1)
        heading = random.uniform(0, math.tau)
        branch = cyl(
            f"Branch{i}",
            0.09,
            0.03,
            random.uniform(0.9, 1.4),
            z=random.uniform(1.5, 2.3),
            verts=7,
            mat=bark,
        )
        branch.rotation_euler = (tilt, 0, heading)
        parts.append(branch)
    obj = join_all(parts, "DeadTree")
    jitter_verts(obj, 0.025, seed=5)
    set_smooth(obj)
    save("tree")


def build_fence() -> None:
    new_scene()
    wood = make_mat("WoodDark", (0.2, 0.16, 0.12), 1.0)
    post_l = box("PostL", 0.09, 0.09, 0.9, x=-0.7, z=0.45, mat=wood)
    post_r = box("PostR", 0.09, 0.09, 0.9, x=0.7, z=0.45, mat=wood)
    rail_a = box("RailA", 1.55, 0.055, 0.08, z=0.32, mat=wood)
    rail_b = box("RailB", 1.55, 0.055, 0.08, z=0.68, mat=wood)
    obj = join_all([post_l, post_r, rail_a, rail_b], "Fence")
    bevel(obj, 0.006)
    save("fence")


def build_gate() -> None:
    new_scene()
    stone = make_mat("StoneGrey", (0.52, 0.55, 0.62), 0.9)
    iron = make_mat("IronDark", (0.1, 0.11, 0.13), 0.6)
    post_l = cyl("PostL", 0.17, 0.2, 2.2, x=-1.15, z=1.1, verts=14, mat=stone)
    post_r = cyl("PostR", 0.17, 0.2, 2.2, x=1.15, z=1.1, verts=14, mat=stone)
    lintel = box("Lintel", 2.75, 0.22, 0.26, z=2.32, mat=stone)
    finial_l = cone("FinialL", 0.12, 0.24, x=-1.15, z=2.55, verts=8, mat=iron)
    finial_r = cone("FinialR", 0.12, 0.24, x=1.15, z=2.55, verts=8, mat=iron)
    obj = join_all([post_l, post_r, lintel, finial_l, finial_r], "Gate")
    bevel(obj, 0.01)
    save("gate")


def build_mausoleum() -> None:
    new_scene()
    stone = make_mat("StoneGrey", (0.5, 0.52, 0.58), 0.88)
    dark = make_mat("StoneDark", (0.16, 0.17, 0.2), 0.85)
    base = box("Base", 2.7, 2.1, 0.26, z=0.13, mat=stone)
    body = box("Body", 2.3, 1.7, 1.4, z=0.96, mat=stone)
    roof = cone("Roof", 1.85, 0.95, z=2.13, verts=4, mat=dark)
    roof.rotation_euler = (0, 0, math.radians(45))
    door = box("Door", 0.56, 0.08, 0.95, y=0.87, z=0.62, mat=dark)
    col_l = cyl("ColL", 0.075, 0.075, 1.05, x=-0.5, y=0.88, z=0.65, verts=10, mat=stone)
    col_r = cyl("ColR", 0.075, 0.075, 1.05, x=0.5, y=0.88, z=0.65, verts=10, mat=stone)
    obj = join_all([base, body, roof, door, col_l, col_r], "Mausoleum")
    bevel(obj, 0.012)
    save("mausoleum")


def build_ghost() -> None:
    new_scene()
    body_mat = make_mat("GhostBody", (0.78, 0.92, 0.96), 0.3)
    eye_mat = make_mat("GhostEyes", (0.01, 0.02, 0.04), 0.4)

    profile = [
        (0.02, 1.5),
        (0.5, 1.32),
        (0.85, 0.6),
        (1.0, 0.1),
        (0.9, -0.4),
        (0.95, -0.85),
        (0.55, -1.1),
        (0.8, -1.35),
        (0.3, -1.5),
    ]
    body = lathe("GhostBody", profile, steps=28)
    body.data.materials.append(body_mat)

    eye_l = sphere("GhostEyeL", 0.14, x=-0.3, y=0.74, z=0.52, mat=eye_mat)
    eye_r = sphere("GhostEyeR", 0.14, x=0.3, y=0.74, z=0.52, mat=eye_mat)
    mouth = sphere("GhostMouth", 0.07, x=0.0, y=0.78, z=0.28, mat=eye_mat)
    mouth.scale = (1.0, 1.0, 1.4)
    for eye in (eye_l, eye_r, mouth):
        set_smooth(eye)

    save("ghost")


def main() -> None:
    build_gravestone()
    build_cross()
    build_pillar()
    build_rock()
    build_tree()
    build_fence()
    build_gate()
    build_mausoleum()
    build_ghost()
    print("[build] all assets generated")


if __name__ == "__main__":
    main()


