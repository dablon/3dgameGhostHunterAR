#!/usr/bin/env python3
"""
blender/export.py — Headless Blender -> glTF/GLB pipeline for Ghost Hunter AR.

Usage (invoked by blender/run.mjs):
    blender --background --factory-startup --python blender/export.py -- \
        <input.blend> <output.glb>

Exports a single GLB with modifiers applied. No DRACO/KTX2 — the runtime
loads these files with a plain GLTFLoader and the assets are tiny.
"""

import os
import sys

import bpy


def _parse_args() -> list[str]:
    argv = sys.argv
    if "--" in argv:
        return argv[argv.index("--") + 1 :]
    return []


def main() -> None:
    args = _parse_args()
    if len(args) < 2:
        raise RuntimeError(
            "Usage: blender --python blender/export.py -- <input.blend> <output.glb>"
        )

    input_path = os.path.abspath(args[0])
    output_path = os.path.abspath(args[1])

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=input_path)

    print(f"[export] {input_path}  ->  {output_path}")

    full_args = {
        "filepath": output_path,
        "export_format": "GLB",
        "export_apply": True,
        "export_animations": False,
        "export_cameras": False,
        "export_lights": False,
        "export_yup": True,
    }
    try:
        bpy.ops.export_scene.gltf(**full_args)
    except TypeError:
        minimal = {
            "filepath": output_path,
            "export_format": "GLB",
            "export_apply": True,
        }
        print("[export] retrying with minimal export args")
        bpy.ops.export_scene.gltf(**minimal)

    if not os.path.exists(output_path):
        raise RuntimeError(
            f"glTF export completed but output file was not created: {output_path}"
        )

    size_kb = os.path.getsize(output_path) // 1024
    print(f"[export] Done — {output_path}  ({size_kb} KiB)")


if __name__ == "__main__":
    main()
