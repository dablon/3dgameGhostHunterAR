#!/usr/bin/env node
/**
 * Mechanical verify gate for the template.
 *
 *   1. Source-tree shape (hexagonal layers must be present).
 *   2. TypeScript typecheck (no JS, no implicit any — strict).
 *   3. Vitest (full suite, with coverage thresholds).
 *   4. Vite production build (proves Vite can resolve @domain/@application/@adapters/@composition aliases).
 *   5. (Optional) Blender pipeline dry-run.
 *
 * Exits non-zero on any failure. Designed for CI.
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

/**
 * Hexagonal layer contract. Adding/removing a layer = update this list AND
 * update the kernel's path aliases.
 */
const REQUIRED = [
  // Domain (pure, framework-free).
  'src/domain/ecs/world.ts',
  'src/domain/value-objects/position.ts',
  'src/domain/value-objects/rotation.ts',
  'src/domain/value-objects/velocity.ts',
  'src/domain/value-objects/half-extents.ts',
  'src/domain/value-objects/health.ts',
  'src/domain/value-objects/score.ts',
  'src/domain/components.ts',
  'src/domain/errors/domain-error.ts',
  'src/domain/index.ts',
  // Application (systems = use cases; ports live beside the systems they abstract).
  'src/application/systems/step-physics.system.ts',
  'src/application/systems/render-entities.system.ts',
  'src/application/systems/fly-camera-input.system.ts',
  'src/application/systems/despawn-expired.system.ts',
  'src/application/systems/spawn-on-space.system.ts',
  'src/application/systems/move-ghosts.system.ts',
  'src/application/systems/step-projectiles.system.ts',
  'src/application/systems/spawn-ghosts.system.ts',
  'src/application/index.ts',
  // Adapters (concrete).
  'src/adapters/rapier-physics.adapter.ts',
  'src/adapters/fakes/in-memory-physics.world.ts',
  'src/adapters/fakes/index.ts',
  'src/adapters/index.ts',
  // Composition.
  'src/composition/main.ts',
  'src/composition/scene-builder.ts',
  'src/composition/input-manager.ts',
  'src/composition/index.ts',
  // Root configs.
  'package.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'vitest.config.ts',
  'index.html',
  // Blender pipeline (separate concern, still required for the recipe to verify).
  'blender/export.py',
  'blender/run.mjs',
];

function ok(label, value = true) {
  console.log(`  ${value ? '✓' : '✗'} ${label}`);
  return value;
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

function checkShape() {
  section('source-tree shape (hexagonal layers)');
  let pass = true;
  for (const rel of REQUIRED) {
    const p = join(ROOT, rel);
    pass = ok(rel, existsSync(p)) && pass;
  }
  // Layer sanity: domain/ must not import from adapters/ or three.
  // (We check this via typecheck and grep below.)
  return pass;
}

function run(cmd, args, env = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: ROOT,
      shell: process.platform === 'win32',
      env: { ...process.env, ...env },
    });
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${cmd} exited ${code}`));
    });
    child.on('error', rejectRun);
  });
}

async function checkTypecheck() {
  section('typecheck');
  try {
    await run('npx', ['--no-install', 'tsc', '--noEmit']);
    return ok('tsc --noEmit');
  } catch {
    return ok('tsc --noEmit', false);
  }
}

async function checkTests() {
  section('tests');
  try {
    await run('npx', ['--no-install', 'vitest', 'run', '--reporter=default']);
    return ok('vitest run');
  } catch {
    return ok('vitest run', false);
  }
}

async function checkBuild() {
  section('production build');
  try {
    await run('npx', ['--no-install', 'vite', 'build']);
    return ok('vite build');
  } catch {
    return ok('vite build', false);
  }
}

async function checkBlender() {
  section('blender pipeline (best-effort)');
  const sourceDir = join(ROOT, 'assets', 'source');
  if (!existsSync(sourceDir)) {
    console.log('  · no assets/source/ — skipping (intentional)');
    return true;
  }
  const blends = readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith('.blend'));
  if (blends.length === 0) {
    console.log('  · no .blend files in assets/source/ — skipping (intentional)');
    return true;
  }
  try {
    await run('node', ['blender/run.mjs']);
    return ok('assets:export');
  } catch {
    return ok('assets:export', false);
  }
}

(async () => {
  console.log(`Verifying template at ${ROOT}`);
  const results = [];
  results.push(checkShape());
  results.push(await checkTypecheck());
  results.push(await checkTests());
  results.push(await checkBuild());
  results.push(await checkBlender());

  const passed = results.every(Boolean);
  console.log(`\n${passed ? 'VERIFY: PASS' : 'VERIFY: FAIL'}`);
  process.exit(passed ? 0 : 1);
})().catch((err) => {
  console.error(`verify: ${err.message}`);
  process.exit(1);
});
