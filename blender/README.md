# Blender → glTF pipeline

```
assets/source/*.blend  ─▶  blender/export.py  ─▶  public/assets/models/*.glb
```

A headless Blender run, driven by Node (`run.mjs`). The script is idempotent:
files whose output is newer than the source are skipped.

## Requirements

- **Blender 4.2+** in `PATH` (or set `BLENDER_BIN=/path/to/blender`).
- Optional: **Basis Universal** (`basisu` binary, set `BASISU_PATH=/path/to/basisu`) for KTX2 texture compression.

## Run

```bash
# All .blend files in assets/source/ → public/assets/models/
npm run assets:export

# One file, ad-hoc:
blender --background --python blender/export.py -- \
  assets/source/showcase.blend public/assets/models/showcase.glb
```

## What gets exported

| Option                        | Value                  | Why                              |
| ----------------------------- | ---------------------- | -------------------------------- |
| `export_format`               | `GLB`                  | Single binary, easy to ship.     |
| `export_apply_modifiers`      | `True`                 | Final geometry, no surprises.    |
| `export_mesh_compression`     | `DRACO`                | 5–10× smaller mesh payloads.     |
| `export_image_format`         | `KTX2` (if basisu) else `AUTO` | GPU-friendly textures. |
| `export_animations`           | `True`                 | Animations survive the trip.     |
| `export_materials`            | `EXPORT`               | PBR materials included.          |
| `export_optimize_animation`   | `True`                 | Smaller animation tracks.        |

## Authoring tips

- Keep mesh names stable — Three.js looks them up by name in some loader paths.
- Use Blender's origin at the model's pivot. The exporter preserves it.
- Texture paths are resolved relative to the output by Vite (`/assets/models/<name>.glb` is served from `public/`).
- If your model needs a high-poly LOD, export two files (`<name>_hi.glb`, `<name>_lo.glb`) and switch in code.

## Why this exists

- **Version-controllable.** glb outputs are checked in for production builds, but during dev you can `npm run assets:export` and see updates in seconds.
- **Reproducible.** The same `.blend` always exports the same `.glb` (deterministic if your Blender version is pinned in `BLENDER_BIN`).
- **CI-friendly.** The headless invocation exits non-zero on failure, so it can gate a build.
