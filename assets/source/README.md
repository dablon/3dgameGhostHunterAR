# Blender source files

Drop your `.blend` files here. The export pipeline (`npm run assets:export`)
discovers them automatically and produces `.glb` files in `public/assets/models/`.

Example: `showcase.blend` → `public/assets/models/showcase.glb`, loaded at
runtime by `src/app.ts` via the showcase URL.

Notes:
- The folder is **tracked by git** but `.blend` files are large. Adjust
  `.gitignore` at the repo root if you want to LFS them.
- Filenames with spaces are fine in Blender, but they become URL-encoded
  paths at runtime — prefer dashes or camelCase.
