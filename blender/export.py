#!/usr/bin/env python3
"""
blender/export.py  —  Headless Blender → glTF/GLB pipeline for Ghost Hunter AR.

Usage (invoked by blender/run.mjs):
    blender --background --factory-startup --python blender/export.py -- \
        <input.blend> <output.glb>

Environment variables:
    BASISU_PATH  path to a basisu binary (enables KTX2 texture compression)

The exporter is deterministic — the same .blend always produces the same .glb
when the Blender version is pinned via BLENDER_BIN.

Exported options
----------------
export_format              GLB
export_apply_modifiers      True
export_mesh_compression     DRACO
export_image_format         KTX2  (if basisu found) else AUTO
export_animations           True
export_materials            EXPORT
export_optimize_animation   True
export_tangents             True
export_normals              True
export_materials_format     EXPORT  (GLSL only, requires Blender 4.2+)
export_texcoords            True
export_colors              True  (vertex colors, if present)
export_cameras             False
export_lights              False
"""

import sys
import os


def main() -> None:
    """Run the export. Called automatically when Blender executes this script."""

    argv = BlenderSys.argv  # Blender patches sys.argv for --python scripts
    # argv[0] == __file__  (the script path)
    # argv[1] == '--'       (our sentinel)
    # argv[2] == input.blend
    # argv[3] == output.glb

    if len(argv) < 4:
        raise RuntimeError(
            "Usage: blender --python blender/export.py -- <input.blend> <output.glb>"
        )

    input_path = os.path.abspath(argv[2])
    output_path = os.path.abspath(argv[3])

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # ── Ensure output directory exists ────────────────────────────────────────
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    # ── Load the .blend file ─────────────────────────────────────────────────
    # 'SCENE' is the scene to be linked-in; '' means use all scenes.
    bpy.ops.wm.open_mainfile(filepath=input_path)

    # ── Determine texture format ──────────────────────────────────────────────
    basisu_path = os.environ.get("BASISU_PATH", "")
    use_ktx2 = False
    if basisu_path and os.path.isfile(basisu_path):
        use_ktx2 = True
        print(f"[export] KTX2 texture compression enabled via {basisu_path}")
    else:
        print("[export] KTX2 texture compression disabled (basisu not found)")

    # ── glTF export arguments ─────────────────────────────────────────────────
    export_args = {
        # Output
        "filepath": output_path,
        "export_format": "GLB",
        # Geometry
        "export_apply_modifiers": True,
        "export_mesh_compression": True,
        # Materials
        "export_materials": "EXPORT",
        "export_colors": True,
        "export_texcoords": True,
        "export_tangents": True,
        # Animation
        "export_animations": True,
        "export_optimize_animation": True,
        # Helpers (not needed for runtime)
        "export_cameras": False,
        "export_lights": False,
        "export_pivot": True,
        # Misc
        "export_yup": True,
        "export_zygomorphic": False,
        "export_morph_normal": True,
        "export_morph_tangent": True,
        "export_attributes": True,
        "export_nla_strips": True,
        "export_nla_strip_anim_fcurves": True,
        "export_nla_strip_anim_groups": True,
    }

    if use_ktx2:
        export_args["export_image_format"] = "KTX2"
        export_args["export_texture_dir"] = os.path.dirname(output_path)
    else:
        export_args["export_image_format"] = "AUTO"

    # ── Run the export ────────────────────────────────────────────────────────
    print(f"[export] {input_path}  →  {output_path}")
    try:
        bpy.ops.export_scene.gltf(**export_args)
    except Exception as exc:
        raise RuntimeError(f"glTF export failed: {exc}") from exc

    if not os.path.exists(output_path):
        raise RuntimeError(f"glTF export completed but output file was not created: {output_path}")

    size_kb = os.path.getsize(output_path) // 1024
    print(f"[export] Done — {output_path}  ({size_kb} KiB)")


# ── Entry point ────────────────────────────────────────────────────────────────
# Blender injects `bpy` and `BlenderSys` (sys) into the script scope.
# Guard with __name__ so the module can still be imported for testing.
if __name__ == "__main__":
    main()
