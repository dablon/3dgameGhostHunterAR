# 3D Game — Blender + Three.js + Rapier

A high-quality starter for 3D games in the browser.

```
assets/source/*.blend  ──▶  blender/export.py  ──▶  public/assets/models/*.glb
                                                         │
                                                         ▼
                              src/main.ts  ──▶  ECS World  ──▶  Systems  ──▶  WebGL
```

## Architecture

The code is split by **concern**, not by **file size**:

| Folder     | Owns                                                                 |
| ---------- | -------------------------------------------------------------------- |
| `src/core`      | Framework-agnostic: fixed-timestep loop, ECS-lite, input, time. |
| `src/scene`     | Three.js scene assembly (lighting, skybox, world objects).      |
| `src/systems`   | Per-frame systems: render, physics, camera.                     |
| `src/loaders`   | Async asset loading with DRACO + KTX2 + cache.                  |
| `src/world`     | Game state: components, prefabs, entity factories.              |
| `src/main.ts`   | Composition root — wires modules, owns the loop.                |
| `blender/`      | Headless Blender export pipeline (`.blend` → `.glb`).           |
| `tests/`        | Unit tests for the ECS and core helpers.                        |

The loop is **fixed timestep** (60 Hz for physics). Rendering happens every
`requestAnimationFrame` and interpolates between physics steps for smoothness.

## Asset pipeline

You author scenes in **Blender**, then a Python script exports everything to
glTF 2.0 binaries (`.glb`) that Three.js loads at runtime.

```bash
# One-shot: re-export all .blend sources from assets/source/ to public/assets/models/
npm run assets:export

# Then start the dev server (assets served from public/)
npm run dev
```

The export script (`blender/export.py`) is driven by a tiny Node wrapper
(`blender/run.mjs`) that:

1. Discovers every `assets/source/*.blend`.
2. Spawns `blender --background --python blender/export.py -- <input> <output>`.
3. Verifies each `.glb` exists and is non-empty.

You can also drop a pre-baked `.glb` directly into `public/assets/models/`
and the runtime will pick it up — the pipeline is a cache, not a wall.

### Blender requirements

- Blender 4.2 or newer (uses the modern `bpy.ops.export_scene.gltf` API).
- Add Blender to `PATH`, or set `BLENDER_BIN=/path/to/blender`.

### Optional mesh compression

To shrink `.glb` payloads:

- **Draco** for geometry — enabled by default in `export.py`.
- **KTX2 / Basis** for textures — set `BASISU_PATH` env var to a Basis Universal
  binary. The runtime will pick it up via `KTX2Loader`.

## Run

```bash
npm install
npm run dev              # http://localhost:5173
```

## Build

```bash
npm run build            # tsc --noEmit && vite build → dist/
npm run preview          # serve dist/ locally
```

## Test

```bash
npm test                 # one-shot
npm run test:coverage    # with v8 coverage (enforces 80% lines)
```

## Verify

```bash
npm run verify           # typecheck + build + asset-export smoke + structure
```

`verify.mjs` is the mechanical gate. If CI ever drifts, this is the script
that catches it.

## Controls (default playground)

| Key                    | Action                          |
| ---------------------- | ------------------------------- |
| **LMB drag**           | Orbit camera                    |
| **RMB drag**           | Pan camera                      |
| **WASD**               | Fly camera                      |
| **Q / E**              | Down / up                       |
| **Shift**              | Boost (3× speed)                |
| **Space**              | Spawn a dynamic physics cube    |

## Adding content

1. Model it in Blender. Save to `assets/source/<name>.blend`.
2. Run `npm run assets:export`.
3. Reference it in `src/scene/scene-builder.ts`:

   ```ts
   const model = await loadGLTF('/assets/models/<name>.glb');
   world.addEntity({
     transform: { position: new Vector3(0, 1, 0) },
     visual: model.scene,
     physics: { type: 'dynamic', shape: 'cuboid', halfExtents: [1, 1, 1] },
   });
   ```

## Why this stack

- **Three.js** — the default. r170+ has TSL (Three.js Shading Language) ready
  when you need it.
- **Vite** — fastest dev loop, sane ESM, zero config for TypeScript.
- **Rapier (`-compat`)** — WASM physics, deterministic, fixed-step friendly.
  The `-compat` build inlines the WASM so no extra Vite plugin is needed.
- **ECS-lite** — small enough to read in one sitting, real enough that you
  don't have to rewrite it at 50 entities. Swap for [bitecs](https://github.com/NateTheGreatt/bitecs)
  or [miniplex](https://github.com/utsuboco/miniplex) if you outgrow it.

## License

MIT.
